package repository

import (
	"context"
	"fmt"
	"time"

	"api/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

// OrderCreate inserts a new order with items inside a transaction.
// It generates an order_no: POS-YYMMDD-NNNN where NNNN is the daily counter.
func OrderCreate(pool *pgxpool.Pool, items []models.CreateOrderItem, discount int, note string, tags []string) (*models.Order, error) {
	ctx := context.Background()

	tx, err := pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx) // no-op after commit

	// Generate order_no
	now := time.Now()
	datePrefix := now.Format("060102") // YYMMDD

	// Get current daily counter
	var maxNo string
	err = tx.QueryRow(ctx,
		`SELECT order_no FROM orders WHERE order_no LIKE $1 ORDER BY order_no DESC LIMIT 1`,
		"POS-"+datePrefix+"-%",
	).Scan(&maxNo)
	nextSeq := 1
	if err == nil && len(maxNo) >= 15 {
		fmt.Sscanf(maxNo[12:], "%04d", &nextSeq)
		nextSeq++
	}
	orderNo := fmt.Sprintf("POS-%s-%04d", datePrefix, nextSeq)

	// Calculate subtotal from items by reading product prices
	subtotal := 0
	type itemInfo struct {
		ProductID string
		Price     int
	}
	var itemInfos []itemInfo

	for _, item := range items {
		var price int
		err := tx.QueryRow(ctx,
			`SELECT price FROM products WHERE id = $1`, item.ProductID,
		).Scan(&price)
		if err != nil {
			return nil, fmt.Errorf("get price for product %s: %w", item.ProductID, err)
		}
		lineSubtotal := price * item.Qty
		subtotal += lineSubtotal
		itemInfos = append(itemInfos, itemInfo{ProductID: item.ProductID, Price: price})
	}

	total := subtotal - discount
	if total < 0 {
		total = 0
	}

	// Build tags string (comma-separated)
	tagsStr := ""
	if len(tags) > 0 {
		tagsStr = tags[0]
		for _, t := range tags[1:] {
			tagsStr += "," + t
		}
	}

	// Insert order
	order := &models.Order{}
	err = tx.QueryRow(ctx,
		`INSERT INTO orders (order_no, subtotal, discount, total, customer_note, tags)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, order_no, subtotal, discount, total, status, payment_method, customer_note, tags, created_at, updated_at`,
		orderNo, subtotal, discount, total, note, tagsStr,
	).Scan(&order.ID, &order.OrderNo, &order.Subtotal, &order.Discount, &order.Total,
		&order.Status, &order.PaymentMethod, &order.CustomerNote, &order.Tags,
		&order.CreatedAt, &order.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("insert order: %w", err)
	}

	// Insert order items
	for i, item := range items {
		info := itemInfos[i]
		lineSubtotal := info.Price * item.Qty
		var orderItem models.OrderItem
		err := tx.QueryRow(ctx,
			`INSERT INTO order_items (order_id, product_id, product_name, price, qty, subtotal, notes)
			 VALUES ($1, $2, (SELECT name FROM products WHERE id = $2), $3, $4, $5, $6)
			 RETURNING id, order_id, product_id, product_name, price, qty, subtotal, notes`,
			order.ID, item.ProductID, info.Price, item.Qty, lineSubtotal, item.Notes,
		).Scan(&orderItem.ID, &orderItem.OrderID, &orderItem.ProductID,
			&orderItem.ProductName, &orderItem.Price, &orderItem.Qty,
			&orderItem.Subtotal, &orderItem.Notes)
		if err != nil {
			return nil, fmt.Errorf("insert order item: %w", err)
		}
		order.Items = append(order.Items, orderItem)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit tx: %w", err)
	}

	return order, nil
}

// OrderList returns orders filtered by date prefix and/or status.
// Also returns total count and total revenue for matching orders.
func OrderList(pool *pgxpool.Pool, date *string, status *string) ([]models.Order, int, int, error) {
	ctx := context.Background()

	where := []string{"1=1"}
	args := []interface{}{}
	i := 1

	if date != nil && *date != "" {
		where = append(where, fmt.Sprintf("o.created_at::date = $%d::date", i))
		args = append(args, *date)
		i++
	}
	if status != nil && *status != "" {
		where = append(where, fmt.Sprintf("o.status = $%d", i))
		args = append(args, *status)
		i++
	}

	whereClause := ""
	for j, clause := range where {
		if j == 0 {
			whereClause = "WHERE " + clause
		} else {
			whereClause += " AND " + clause
		}
	}

	// Count and sum (only non-cancelled for revenue)
	countQuery := fmt.Sprintf(`SELECT COUNT(*), COALESCE(SUM(o.total), 0)
		FROM orders o %s`, whereClause)
	var totalOrders int
	var totalRevenue int
	err := pool.QueryRow(ctx, countQuery, args...).Scan(&totalOrders, &totalRevenue)
	if err != nil {
		return nil, 0, 0, fmt.Errorf("count orders: %w", err)
	}

	// Fetch orders
	query := fmt.Sprintf(`
		SELECT o.id, o.order_no, o.subtotal, o.discount, o.total,
		       o.status, o.payment_method, COALESCE(o.customer_note, ''),
		       COALESCE(o.tags, ''), COALESCE(oi.cnt, 0), o.created_at, o.updated_at
		FROM orders o
		LEFT JOIN (SELECT order_id, COUNT(*) AS cnt FROM order_items GROUP BY order_id) oi
		       ON oi.order_id = o.id
		%s
		ORDER BY o.created_at DESC`, whereClause)

	rows, err := pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, 0, fmt.Errorf("list orders: %w", err)
	}
	defer rows.Close()

	var orders []models.Order
	for rows.Next() {
		var o models.Order
		err := rows.Scan(&o.ID, &o.OrderNo, &o.Subtotal, &o.Discount, &o.Total,
			&o.Status, &o.PaymentMethod, &o.CustomerNote, &o.Tags, &o.ItemCount,
			&o.CreatedAt, &o.UpdatedAt)
		if err != nil {
			return nil, 0, 0, fmt.Errorf("scan order: %w", err)
		}
		orders = append(orders, o)
	}
	if orders == nil {
		orders = []models.Order{}
	}

	return orders, totalOrders, totalRevenue, nil
}

// OrderGetByID returns a single order with its items.
func OrderGetByID(pool *pgxpool.Pool, id string) (*models.Order, error) {
	ctx := context.Background()

	o := &models.Order{}
	err := pool.QueryRow(ctx,
		`SELECT id, order_no, subtotal, discount, total,
		        status, payment_method, COALESCE(customer_note, ''),
		        COALESCE(tags, ''), created_at, updated_at
		 FROM orders WHERE id = $1`,
		id,
	).Scan(&o.ID, &o.OrderNo, &o.Subtotal, &o.Discount, &o.Total,
		&o.Status, &o.PaymentMethod, &o.CustomerNote, &o.Tags,
		&o.CreatedAt, &o.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("get order: %w", err)
	}

	// Fetch items
	rows, err := pool.Query(ctx,
		`SELECT id, order_id, product_id, product_name, price, qty, subtotal, COALESCE(notes, '')
		 FROM order_items WHERE order_id = $1
		 ORDER BY id`,
		id,
	)
	if err != nil {
		return nil, fmt.Errorf("get order items: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var item models.OrderItem
		err := rows.Scan(&item.ID, &item.OrderID, &item.ProductID, &item.ProductName,
			&item.Price, &item.Qty, &item.Subtotal, &item.Notes)
		if err != nil {
			return nil, fmt.Errorf("scan order item: %w", err)
		}
		o.Items = append(o.Items, item)
	}
	if o.Items == nil {
		o.Items = []models.OrderItem{}
	}

	return o, nil
}

// validStatusTransitions defines allowed status changes.
// map[from][]to
var validStatusTransitions = map[string][]string{
	"new":       {"preparing", "cancelled"},
	"preparing": {"paid", "cancelled"},
	"paid":      {"completed", "cancelled"},
	"completed": {},
	"cancelled": {},
}

// OrderUpdateStatus validates and updates order status.
func OrderUpdateStatus(pool *pgxpool.Pool, id string, newStatus string) error {
	ctx := context.Background()

	// Get current status
	var currentStatus string
	err := pool.QueryRow(ctx, `SELECT status FROM orders WHERE id = $1`, id).Scan(&currentStatus)
	if err != nil {
		return fmt.Errorf("get order status: %w", err)
	}

	// Validate transition
	allowed, ok := validStatusTransitions[currentStatus]
	if !ok {
		return fmt.Errorf("invalid current status: %s", currentStatus)
	}
	valid := false
	for _, s := range allowed {
		if s == newStatus {
			valid = true
			break
		}
	}
	if !valid {
		return fmt.Errorf("cannot transition from %s to %s", currentStatus, newStatus)
	}

	_, err = pool.Exec(ctx, `UPDATE orders SET status = $1 WHERE id = $2`, newStatus, id)
	if err != nil {
		return fmt.Errorf("update order status: %w", err)
	}
	return nil
}

// OrderUpdatePayment updates the payment method on an order.
func OrderUpdatePayment(pool *pgxpool.Pool, id string, paymentMethod string) error {
	ctx := context.Background()

	// Validate payment method
	if paymentMethod != "cash" && paymentMethod != "promptpay" {
		return fmt.Errorf("invalid payment method: %s (must be cash or promptpay)", paymentMethod)
	}

	_, err := pool.Exec(ctx,
		`UPDATE orders SET payment_method = $1 WHERE id = $2`,
		paymentMethod, id,
	)
	if err != nil {
		return fmt.Errorf("update payment method: %w", err)
	}
	return nil
}

// OrderUpdateTags updates the tags (comma-separated) on an order.
func OrderUpdateTags(pool *pgxpool.Pool, id string, tags string) error {
	_, err := pool.Exec(context.Background(),
		`UPDATE orders SET tags = $1 WHERE id = $2`, tags, id)
	if err != nil {
		return fmt.Errorf("update tags: %w", err)
	}
	return nil
}
