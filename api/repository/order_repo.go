package repository

import (
	"context"
	"fmt"
	"time"

	"api/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

func OrderCreate(pool *pgxpool.Pool, vendorID string, items []models.CreateOrderItem, discount int, note string, paymentMethod *string, tags []string) (*models.Order, error) {
	ctx := context.Background()

	tx, err := pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	now := time.Now()
	datePrefix := now.Format("060102")

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

	subtotal := 0
	type itemInfo struct {
		ProductID string
		Price     int
	}
	var itemInfos []itemInfo

	for _, item := range items {
		var price int
		err := tx.QueryRow(ctx,
			`SELECT price FROM products WHERE id = $1 AND vendor_id = $2`, item.ProductID, vendorID,
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

	tagsStr := ""
	if len(tags) > 0 {
		tagsStr = tags[0]
		for _, t := range tags[1:] {
			tagsStr += "," + t
		}
	}

	order := &models.Order{}
	err = tx.QueryRow(ctx,
		`INSERT INTO orders (vendor_id, order_no, subtotal, discount, total, customer_note, tags, payment_method)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		 RETURNING id, vendor_id, order_no, subtotal, discount, total, status, payment_method, customer_note, tags, created_at, updated_at`,
		vendorID, orderNo, subtotal, discount, total, note, tagsStr, paymentMethod,
	).Scan(&order.ID, &order.VendorID, &order.OrderNo, &order.Subtotal, &order.Discount, &order.Total,
		&order.Status, &order.PaymentMethod, &order.CustomerNote, &order.Tags,
		&order.CreatedAt, &order.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("insert order: %w", err)
	}

	for i, item := range items {
		info := itemInfos[i]
		lineSubtotal := info.Price * item.Qty
		var orderItem models.OrderItem
		err := tx.QueryRow(ctx,
			`INSERT INTO order_items (vendor_id, order_id, product_id, product_name, price, qty, subtotal, notes)
			 VALUES ($1, $2, $3, (SELECT name FROM products WHERE id = $3 AND vendor_id = $1), $4, $5, $6, $7)
			 RETURNING id, vendor_id, order_id, product_id, product_name, price, qty, subtotal, notes`,
			vendorID, order.ID, item.ProductID, info.Price, item.Qty, lineSubtotal, item.Notes,
		).Scan(&orderItem.ID, &orderItem.VendorID, &orderItem.OrderID, &orderItem.ProductID,
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

func OrderList(pool *pgxpool.Pool, vendorID string, date *string, status *string) ([]models.Order, int, int, error) {
	ctx := context.Background()

	where := []string{fmt.Sprintf("o.vendor_id = $%d", 1)}
	args := []interface{}{vendorID}
	i := 2

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

	countQuery := fmt.Sprintf(`SELECT COUNT(*), COALESCE(SUM(o.total), 0)
		FROM orders o %s`, whereClause)
	var totalOrders int
	var totalRevenue int
	err := pool.QueryRow(ctx, countQuery, args...).Scan(&totalOrders, &totalRevenue)
	if err != nil {
		return nil, 0, 0, fmt.Errorf("count orders: %w", err)
	}

	query := fmt.Sprintf(`
		SELECT o.id, o.vendor_id, o.order_no, o.subtotal, o.discount, o.total,
		       o.status, o.payment_method, COALESCE(o.customer_note, ''),
		       COALESCE(o.tags, ''), COALESCE(oi.cnt, 0), o.created_at, o.updated_at
		FROM orders o
		LEFT JOIN (SELECT order_id, COUNT(*) AS cnt FROM order_items WHERE vendor_id = $1 GROUP BY order_id) oi
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
		err := rows.Scan(&o.ID, &o.VendorID, &o.OrderNo, &o.Subtotal, &o.Discount, &o.Total,
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

func OrderGetByID(pool *pgxpool.Pool, vendorID, id string) (*models.Order, error) {
	ctx := context.Background()

	o := &models.Order{}
	err := pool.QueryRow(ctx,
		`SELECT id, vendor_id, order_no, subtotal, discount, total,
		        status, payment_method, COALESCE(customer_note, ''),
		        COALESCE(tags, ''), created_at, updated_at
		 FROM orders WHERE id = $1 AND vendor_id = $2`,
		id, vendorID,
	).Scan(&o.ID, &o.VendorID, &o.OrderNo, &o.Subtotal, &o.Discount, &o.Total,
		&o.Status, &o.PaymentMethod, &o.CustomerNote, &o.Tags,
		&o.CreatedAt, &o.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("get order: %w", err)
	}

	rows, err := pool.Query(ctx,
		`SELECT id, vendor_id, order_id, product_id, product_name, price, qty, subtotal, COALESCE(notes, '')
		 FROM order_items WHERE order_id = $1 AND vendor_id = $2
		 ORDER BY id`,
		id, vendorID,
	)
	if err != nil {
		return nil, fmt.Errorf("get order items: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var item models.OrderItem
		err := rows.Scan(&item.ID, &item.VendorID, &item.OrderID, &item.ProductID, &item.ProductName,
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

var validStatusTransitions = map[string][]string{
	"new":       {"preparing", "cancelled"},
	"preparing": {"paid", "cancelled"},
	"paid":      {"completed", "cancelled"},
	"completed": {},
	"cancelled": {},
}

func OrderUpdateStatus(pool *pgxpool.Pool, vendorID, id string, newStatus string) error {
	ctx := context.Background()

	var currentStatus string
	err := pool.QueryRow(ctx, `SELECT status FROM orders WHERE id = $1 AND vendor_id = $2`, id, vendorID).Scan(&currentStatus)
	if err != nil {
		return fmt.Errorf("get order status: %w", err)
	}

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

	_, err = pool.Exec(ctx, `UPDATE orders SET status = $1 WHERE id = $2 AND vendor_id = $3`, newStatus, id, vendorID)
	if err != nil {
		return fmt.Errorf("update order status: %w", err)
	}
	return nil
}

func OrderUpdatePayment(pool *pgxpool.Pool, vendorID, id string, paymentMethod string) error {
	ctx := context.Background()

	if paymentMethod != "cash" && paymentMethod != "promptpay" {
		return fmt.Errorf("invalid payment method: %s (must be cash or promptpay)", paymentMethod)
	}

	_, err := pool.Exec(ctx,
		`UPDATE orders SET payment_method = $1 WHERE id = $2 AND vendor_id = $3`,
		paymentMethod, id, vendorID,
	)
	if err != nil {
		return fmt.Errorf("update payment method: %w", err)
	}
	return nil
}

func OrderUpdateTags(pool *pgxpool.Pool, vendorID, id string, tags string) error {
	_, err := pool.Exec(context.Background(),
		`UPDATE orders SET tags = $1 WHERE id = $2 AND vendor_id = $3`, tags, id, vendorID)
	if err != nil {
		return fmt.Errorf("update tags: %w", err)
	}
	return nil
}
