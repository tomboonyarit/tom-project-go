package repository

import (
	"context"
	"fmt"
	"time"

	"api/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// scanOrder scans a single order from a row.
func scanOrder(row pgx.Row) (*models.Order, error) {
	order := &models.Order{}
	err := row.Scan(
		&order.ID, &order.OrderNumber, &order.CustomerID, &order.MarketID, &order.BoothID,
		&order.TotalAmount, &order.DiscountAmount, &order.FinalAmount,
		&order.Status, &order.PaymentStatus, &order.PaymentMethod, &order.PaymentProofURL,
		&order.PickupDate, &order.PickupTime, &order.CustomerNote, &order.VendorNote,
		&order.CustomerDescription, &order.CancelledReason, &order.CreatedAt, &order.UpdatedAt,
	)
	return order, err
}

// orderScanFields returns the column list for order SELECT queries.
const orderColumns = `id, order_number, customer_id, market_id, booth_id, total_amount, discount_amount,
		      final_amount, status, payment_status, payment_method, payment_proof_url,
		      pickup_date, pickup_time, customer_note, vendor_note, customer_description, cancelled_reason, created_at, updated_at`

type OrderRepo struct {
	pool *pgxpool.Pool
}

func NewOrderRepo(pool *pgxpool.Pool) *OrderRepo {
	return &OrderRepo{pool: pool}
}

// --- Order CRUD ---

// Create inserts a new order along with its items in a transaction.
func (r *OrderRepo) Create(ctx context.Context, input models.CreateOrderInput, customerID string) (*models.Order, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// Calculate totals
	var totalAmount float64
	for _, item := range input.Items {
		totalAmount += item.UnitPrice * float64(item.Quantity)
	}

	discountAmount := 0.0
	if input.DiscountAmount != nil {
		discountAmount = *input.DiscountAmount
		if discountAmount > totalAmount {
			discountAmount = totalAmount
		}
	}
	finalAmount := totalAmount - discountAmount

	order := &models.Order{}
	err = tx.QueryRow(ctx, `
		INSERT INTO orders (customer_id, market_id, booth_id, total_amount, discount_amount, final_amount, payment_method, pickup_date, pickup_time, customer_note, customer_description)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		RETURNING id, order_number, customer_id, market_id, booth_id, total_amount, discount_amount,
		          final_amount, status, payment_status, payment_method, payment_proof_url,
		          pickup_date, pickup_time, customer_note, vendor_note, customer_description, cancelled_reason, created_at, updated_at
	`, customerID, input.MarketID, input.BoothID, totalAmount, discountAmount, finalAmount,
		input.PaymentMethod, input.PickupDate, input.PickupTime, input.CustomerNote, input.CustomerDescription).Scan(
		&order.ID, &order.OrderNumber, &order.CustomerID, &order.MarketID, &order.BoothID,
		&order.TotalAmount, &order.DiscountAmount, &order.FinalAmount,
		&order.Status, &order.PaymentStatus, &order.PaymentMethod, &order.PaymentProofURL,
		&order.PickupDate, &order.PickupTime, &order.CustomerNote, &order.VendorNote,
		&order.CustomerDescription, &order.CancelledReason, &order.CreatedAt, &order.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	// Insert order items
	for _, item := range input.Items {
		subtotal := item.UnitPrice * float64(item.Quantity)
		_, err = tx.Exec(ctx, `
			INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal, notes)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
		`, order.ID, item.ProductID, item.ProductName, item.Quantity, item.UnitPrice, subtotal, item.Notes)
		if err != nil {
			return nil, err
		}
	}

	// Record initial status history
	_, err = tx.Exec(ctx, `
		INSERT INTO order_status_history (order_id, to_status, notes)
		VALUES ($1, 'pending', 'Order created')
	`, order.ID)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return order, nil
}

func (r *OrderRepo) FindByID(ctx context.Context, id string) (*models.Order, error) {
	order := &models.Order{}
	err := r.pool.QueryRow(ctx, `
		SELECT id, order_number, customer_id, market_id, booth_id, total_amount, discount_amount,
		       final_amount, status, payment_status, payment_method, payment_proof_url,
		       pickup_date, pickup_time, customer_note, vendor_note, customer_description, cancelled_reason, created_at, updated_at
		FROM orders WHERE id = $1
	`, id).Scan(
		&order.ID, &order.OrderNumber, &order.CustomerID, &order.MarketID, &order.BoothID,
		&order.TotalAmount, &order.DiscountAmount, &order.FinalAmount,
		&order.Status, &order.PaymentStatus, &order.PaymentMethod, &order.PaymentProofURL,
		&order.PickupDate, &order.PickupTime, &order.CustomerNote, &order.VendorNote,
		&order.CustomerDescription, &order.CancelledReason, &order.CreatedAt, &order.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return order, nil
}

func (r *OrderRepo) FindByOrderNumber(ctx context.Context, orderNumber string) (*models.Order, error) {
	order := &models.Order{}
	err := r.pool.QueryRow(ctx, `
		SELECT id, order_number, customer_id, market_id, booth_id, total_amount, discount_amount,
		       final_amount, status, payment_status, payment_method, payment_proof_url,
		       pickup_date, pickup_time, customer_note, vendor_note, customer_description, cancelled_reason, created_at, updated_at
		FROM orders WHERE order_number = $1
	`, orderNumber).Scan(
		&order.ID, &order.OrderNumber, &order.CustomerID, &order.MarketID, &order.BoothID,
		&order.TotalAmount, &order.DiscountAmount, &order.FinalAmount,
		&order.Status, &order.PaymentStatus, &order.PaymentMethod, &order.PaymentProofURL,
		&order.PickupDate, &order.PickupTime, &order.CustomerNote, &order.VendorNote,
		&order.CustomerDescription, &order.CancelledReason, &order.CreatedAt, &order.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return order, nil
}

func (r *OrderRepo) ListByCustomer(ctx context.Context, customerID string, params models.PaginationParams) ([]models.Order, int, error) {
	args := []interface{}{customerID}
	whereClause := " WHERE customer_id = $1"

	var total int
	if err := r.pool.QueryRow(ctx, "SELECT COUNT(*) FROM orders"+whereClause, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	if total == 0 {
		return []models.Order{}, 0, nil
	}

	query := `SELECT id, order_number, customer_id, market_id, booth_id, total_amount, discount_amount,
	                  final_amount, status, payment_status, payment_method, payment_proof_url,
	                  pickup_date, pickup_time, customer_note, vendor_note, customer_description, cancelled_reason, created_at, updated_at
	           FROM orders` + whereClause + ` ORDER BY created_at DESC LIMIT $2 OFFSET $3`
	args = append(args, params.Limit(), params.Offset())

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var orders []models.Order
	for rows.Next() {
		var o models.Order
		if err := rows.Scan(&o.ID, &o.OrderNumber, &o.CustomerID, &o.MarketID, &o.BoothID,
			&o.TotalAmount, &o.DiscountAmount, &o.FinalAmount,
			&o.Status, &o.PaymentStatus, &o.PaymentMethod, &o.PaymentProofURL,
			&o.PickupDate, &o.PickupTime, &o.CustomerNote, &o.VendorNote,
			&o.CustomerDescription, &o.CancelledReason, &o.CreatedAt, &o.UpdatedAt); err != nil {
			return nil, 0, err
		}
		orders = append(orders, o)
	}
	return orders, total, nil
}

func (r *OrderRepo) ListByBooth(ctx context.Context, boothID string, params models.PaginationParams) ([]models.Order, int, error) {
	args := []interface{}{boothID}
	whereClause := " WHERE booth_id = $1"

	var total int
	if err := r.pool.QueryRow(ctx, "SELECT COUNT(*) FROM orders"+whereClause, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	if total == 0 {
		return []models.Order{}, 0, nil
	}

	query := `SELECT id, order_number, customer_id, market_id, booth_id, total_amount, discount_amount,
	                  final_amount, status, payment_status, payment_method, payment_proof_url,
	                  pickup_date, pickup_time, customer_note, vendor_note, customer_description, cancelled_reason, created_at, updated_at
	           FROM orders` + whereClause + ` ORDER BY created_at DESC LIMIT $2 OFFSET $3`
	args = append(args, params.Limit(), params.Offset())

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var orders []models.Order
	for rows.Next() {
		var o models.Order
		if err := rows.Scan(&o.ID, &o.OrderNumber, &o.CustomerID, &o.MarketID, &o.BoothID,
			&o.TotalAmount, &o.DiscountAmount, &o.FinalAmount,
			&o.Status, &o.PaymentStatus, &o.PaymentMethod, &o.PaymentProofURL,
			&o.PickupDate, &o.PickupTime, &o.CustomerNote, &o.VendorNote,
			&o.CustomerDescription, &o.CancelledReason, &o.CreatedAt, &o.UpdatedAt); err != nil {
			return nil, 0, err
		}
		orders = append(orders, o)
	}
	return orders, total, nil
}

// UpdateStatus changes the order status and records the history.
func (r *OrderRepo) UpdateStatus(ctx context.Context, id string, input models.UpdateOrderStatusInput, changedBy *string) (*models.Order, error) {
	order, err := r.FindByID(ctx, id)
	if err != nil || order == nil {
		return order, err
	}

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	oldStatus := order.Status
	order.Status = input.Status
	if input.VendorNote != nil {
		order.VendorNote = input.VendorNote
	}
	if input.CancelledReason != nil {
		order.CancelledReason = input.CancelledReason
	}
	order.UpdatedAt = time.Now()

	_, err = tx.Exec(ctx, `
		UPDATE orders SET status=$1, vendor_note=$2, cancelled_reason=$3, updated_at=$4
		WHERE id=$5
	`, order.Status, order.VendorNote, order.CancelledReason, order.UpdatedAt, id)
	if err != nil {
		return nil, err
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, notes)
		VALUES ($1, $2, $3, $4, $5)
	`, id, oldStatus, input.Status, changedBy, input.VendorNote)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return order, nil
}

// UpdatePayment updates the payment status and method.
func (r *OrderRepo) UpdatePayment(ctx context.Context, id string, input models.UpdateOrderPaymentInput) (*models.Order, error) {
	order, err := r.FindByID(ctx, id)
	if err != nil || order == nil {
		return order, err
	}

	order.PaymentStatus = input.PaymentStatus
	if input.PaymentMethod != nil {
		order.PaymentMethod = input.PaymentMethod
	}
	if input.PaymentProofURL != nil {
		order.PaymentProofURL = input.PaymentProofURL
	}
	order.UpdatedAt = time.Now()

	_, err = r.pool.Exec(ctx, `
		UPDATE orders SET payment_status=$1, payment_method=$2, payment_proof_url=$3, updated_at=$4
		WHERE id=$5
	`, order.PaymentStatus, order.PaymentMethod, order.PaymentProofURL, order.UpdatedAt, id)
	if err != nil {
		return nil, err
	}

	return order, nil
}

// ListByBoothWithStatus lists orders by booth with optional status filter (for vendor dashboard).
func (r *OrderRepo) ListByBoothWithStatus(ctx context.Context, boothID string, params models.PaginationParams, status *models.OrderStatus) ([]models.Order, int, error) {
	args := []interface{}{boothID}
	whereClause := " WHERE booth_id = $1"
	argIdx := 2

	if status != nil {
		whereClause += " AND status = $" + fmt.Sprintf("%d", argIdx)
		args = append(args, *status)
		argIdx++
	}

	var total int
	if err := r.pool.QueryRow(ctx, "SELECT COUNT(*) FROM orders"+whereClause, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	if total == 0 {
		return []models.Order{}, 0, nil
	}

	limitIdx := argIdx
	offsetIdx := argIdx + 1
	query := `SELECT id, order_number, customer_id, market_id, booth_id, total_amount, discount_amount,
	                  final_amount, status, payment_status, payment_method, payment_proof_url,
	                  pickup_date, pickup_time, customer_note, vendor_note, customer_description, cancelled_reason, created_at, updated_at
	           FROM orders` + whereClause + ` ORDER BY created_at DESC LIMIT $` + fmt.Sprintf("%d", limitIdx) + ` OFFSET $` + fmt.Sprintf("%d", offsetIdx)
	args = append(args, params.Limit(), params.Offset())

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var orders []models.Order
	for rows.Next() {
		var o models.Order
		if err := rows.Scan(&o.ID, &o.OrderNumber, &o.CustomerID, &o.MarketID, &o.BoothID,
			&o.TotalAmount, &o.DiscountAmount, &o.FinalAmount,
			&o.Status, &o.PaymentStatus, &o.PaymentMethod, &o.PaymentProofURL,
			&o.PickupDate, &o.PickupTime, &o.CustomerNote, &o.VendorNote,
			&o.CustomerDescription, &o.CancelledReason, &o.CreatedAt, &o.UpdatedAt); err != nil {
			return nil, 0, err
		}
		orders = append(orders, o)
	}
	return orders, total, nil
}

// ListByVendorBooths lists orders across all booths owned by a vendor.
func (r *OrderRepo) ListByVendorBooths(ctx context.Context, vendorID string, params models.PaginationParams, status *models.OrderStatus) ([]models.Order, int, error) {
	args := []interface{}{vendorID}
	whereClause := " WHERE b.vendor_id = $1"
	argIdx := 2

	if status != nil {
		whereClause += " AND o.status = $" + fmt.Sprintf("%d", argIdx)
		args = append(args, *status)
		argIdx++
	}

	countQuery := `SELECT COUNT(*) FROM orders o JOIN booths b ON o.booth_id = b.id` + whereClause
	var total int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	if total == 0 {
		return []models.Order{}, 0, nil
	}

	limitIdx := argIdx
	offsetIdx := argIdx + 1
	query := `SELECT o.id, o.order_number, o.customer_id, o.market_id, o.booth_id,
	                  o.total_amount, o.discount_amount, o.final_amount,
	                  o.status, o.payment_status, o.payment_method, o.payment_proof_url,
	                  o.pickup_date, o.pickup_time, o.customer_note, o.vendor_note,
	                  o.customer_description, o.cancelled_reason, o.created_at, o.updated_at
	           FROM orders o JOIN booths b ON o.booth_id = b.id` +
		whereClause + ` ORDER BY o.created_at DESC LIMIT $` + fmt.Sprintf("%d", limitIdx) + ` OFFSET $` + fmt.Sprintf("%d", offsetIdx)
	args = append(args, params.Limit(), params.Offset())

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var orders []models.Order
	for rows.Next() {
		var o models.Order
		if err := rows.Scan(&o.ID, &o.OrderNumber, &o.CustomerID, &o.MarketID, &o.BoothID,
			&o.TotalAmount, &o.DiscountAmount, &o.FinalAmount,
			&o.Status, &o.PaymentStatus, &o.PaymentMethod, &o.PaymentProofURL,
			&o.PickupDate, &o.PickupTime, &o.CustomerNote, &o.VendorNote,
			&o.CustomerDescription, &o.CancelledReason, &o.CreatedAt, &o.UpdatedAt); err != nil {
			return nil, 0, err
		}
		orders = append(orders, o)
	}
	return orders, total, nil
}

// --- Admin Dashboard & Reports ---

// GetDashboardStats aggregates stats for the admin dashboard.
func (r *OrderRepo) GetDashboardStats(ctx context.Context) (*models.DashboardStats, error) {
	stats := &models.DashboardStats{}

	// Total markets
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM markets`).Scan(&stats.TotalMarkets); err != nil {
		return nil, err
	}

	// Active markets
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM markets WHERE status = $1`, models.MarketStatusActive).Scan(&stats.ActiveMarkets); err != nil {
		return nil, err
	}

	// Total vendors
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM users WHERE role = $1`, models.UserRoleVendor).Scan(&stats.TotalVendors); err != nil {
		return nil, err
	}

	// Total customers
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM users WHERE role = $1`, models.UserRoleCustomer).Scan(&stats.TotalCustomers); err != nil {
		return nil, err
	}

	// Orders today
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM orders WHERE created_at >= CURRENT_DATE`).Scan(&stats.OrdersToday); err != nil {
		return nil, err
	}

	// Revenue today (from completed orders)
	if err := r.pool.QueryRow(ctx, `SELECT COALESCE(SUM(final_amount), 0) FROM orders WHERE created_at >= CURRENT_DATE AND status = $1`, models.OrderStatusCompleted).Scan(&stats.RevenueToday); err != nil {
		return nil, err
	}

	// Revenue this month
	if err := r.pool.QueryRow(ctx, `SELECT COALESCE(SUM(final_amount), 0) FROM orders WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE) AND status = $1`, models.OrderStatusCompleted).Scan(&stats.RevenueMonth); err != nil {
		return nil, err
	}

	// Orders by status
	statusRows, err := r.pool.Query(ctx, `SELECT status, COUNT(*) FROM orders GROUP BY status ORDER BY status`)
	if err != nil {
		return nil, err
	}
	defer statusRows.Close()
	for statusRows.Next() {
		var sc models.StatusCount
		if err := statusRows.Scan(&sc.Status, &sc.Count); err != nil {
			return nil, err
		}
		stats.OrdersByStatus = append(stats.OrdersByStatus, sc)
	}
	if stats.OrdersByStatus == nil {
		stats.OrdersByStatus = []models.StatusCount{}
	}

	// Recent orders (last 10)
	recentRows, err := r.pool.Query(ctx, `SELECT `+orderColumns+` FROM orders ORDER BY created_at DESC LIMIT 10`)
	if err != nil {
		return nil, err
	}
	defer recentRows.Close()
	for recentRows.Next() {
		o, err := scanOrder(recentRows)
		if err != nil {
			return nil, err
		}
		stats.RecentOrders = append(stats.RecentOrders, *o)
	}
	if stats.RecentOrders == nil {
		stats.RecentOrders = []models.Order{}
	}

	return stats, nil
}

// GetSalesReport generates a sales report by date range, optionally filtered by market or vendor.
func (r *OrderRepo) GetSalesReport(ctx context.Context, startDate, endDate string, marketID, vendorID *string) (*models.SalesReport, error) {
	report := &models.SalesReport{
		PeriodStart: startDate,
		PeriodEnd:   endDate,
	}

	// Build dynamic WHERE clause with optional filters
	whereClause := ` WHERE o.created_at >= $1::date AND o.created_at < $2::date + INTERVAL '1 day'`
	args := []interface{}{startDate, endDate}
	argIdx := 3

	if marketID != nil {
		whereClause += " AND b.market_id = $" + fmt.Sprintf("%d", argIdx)
		args = append(args, *marketID)
		argIdx++
	}
	if vendorID != nil {
		whereClause += " AND b.vendor_id = $" + fmt.Sprintf("%d", argIdx)
		args = append(args, *vendorID)
		argIdx++
	}

	// Total orders and revenue in period
	baseFrom := ` FROM orders o JOIN booths b ON o.booth_id = b.id`
	countQuery := `SELECT COUNT(*), COALESCE(SUM(o.final_amount), 0)` + baseFrom + whereClause
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&report.TotalOrders, &report.TotalRevenue); err != nil {
		return nil, err
	}

	if report.TotalOrders > 0 {
		report.AvgOrderValue = report.TotalRevenue / float64(report.TotalOrders)
	}

	// By market
	marketRows, err := r.pool.Query(ctx, `
		SELECT b.market_id, m.name, COUNT(*), COALESCE(SUM(o.final_amount), 0)
		`+baseFrom+` JOIN markets m ON b.market_id = m.id`+whereClause+`
		GROUP BY b.market_id, m.name ORDER BY m.name
	`, args...)
	if err != nil {
		return nil, err
	}
	defer marketRows.Close()
	for marketRows.Next() {
		var ms models.MarketSales
		if err := marketRows.Scan(&ms.MarketID, &ms.MarketName, &ms.OrderCount, &ms.TotalRevenue); err != nil {
			return nil, err
		}
		report.ByMarket = append(report.ByMarket, ms)
	}
	if report.ByMarket == nil {
		report.ByMarket = []models.MarketSales{}
	}

	// By vendor
	vendorRows, err := r.pool.Query(ctx, `
		SELECT b.vendor_id, u.name, b.booth_name, COUNT(*), COALESCE(SUM(o.final_amount), 0)
		`+baseFrom+` JOIN users u ON b.vendor_id = u.id`+whereClause+`
		GROUP BY b.vendor_id, u.name, b.booth_name ORDER BY u.name
	`, args...)
	if err != nil {
		return nil, err
	}
	defer vendorRows.Close()
	for vendorRows.Next() {
		var vs models.VendorSales
		if err := vendorRows.Scan(&vs.VendorID, &vs.VendorName, &vs.BoothName, &vs.OrderCount, &vs.TotalRevenue); err != nil {
			return nil, err
		}
		report.ByVendor = append(report.ByVendor, vs)
	}
	if report.ByVendor == nil {
		report.ByVendor = []models.VendorSales{}
	}

	// Daily breakdown
	dailyRows, err := r.pool.Query(ctx, `
		SELECT DATE(o.created_at), COUNT(*), COALESCE(SUM(o.final_amount), 0)
		`+baseFrom+whereClause+`
		GROUP BY DATE(o.created_at) ORDER BY DATE(o.created_at)
	`, args...)
	if err != nil {
		return nil, err
	}
	defer dailyRows.Close()
	for dailyRows.Next() {
		var ds models.DailySales
		var dateStr string
		if err := dailyRows.Scan(&dateStr, &ds.OrderCount, &ds.TotalRevenue); err != nil {
			return nil, err
		}
		ds.Date = dateStr
		report.DailyBreakdown = append(report.DailyBreakdown, ds)
	}
	if report.DailyBreakdown == nil {
		report.DailyBreakdown = []models.DailySales{}
	}

	return report, nil
}

// --- Order Items ---

type OrderItemRepo struct {
	pool *pgxpool.Pool
}

func NewOrderItemRepo(pool *pgxpool.Pool) *OrderItemRepo {
	return &OrderItemRepo{pool: pool}
}

func (r *OrderItemRepo) ListByOrder(ctx context.Context, orderID string) ([]models.OrderItem, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, order_id, product_id, product_name, quantity, unit_price, subtotal, notes
		FROM order_items WHERE order_id = $1 ORDER BY id
	`, orderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []models.OrderItem
	for rows.Next() {
		var item models.OrderItem
		if err := rows.Scan(&item.ID, &item.OrderID, &item.ProductID, &item.ProductName,
			&item.Quantity, &item.UnitPrice, &item.Subtotal, &item.Notes); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, nil
}

// --- Order Status History ---

type OrderHistoryRepo struct {
	pool *pgxpool.Pool
}

func NewOrderHistoryRepo(pool *pgxpool.Pool) *OrderHistoryRepo {
	return &OrderHistoryRepo{pool: pool}
}

func (r *OrderHistoryRepo) ListByOrder(ctx context.Context, orderID string) ([]models.OrderStatusHistory, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, order_id, from_status, to_status, changed_by, notes, created_at
		FROM order_status_history WHERE order_id = $1 ORDER BY created_at ASC
	`, orderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var history []models.OrderStatusHistory
	for rows.Next() {
		var h models.OrderStatusHistory
		if err := rows.Scan(&h.ID, &h.OrderID, &h.FromStatus, &h.ToStatus,
			&h.ChangedBy, &h.Notes, &h.CreatedAt); err != nil {
			return nil, err
		}
		history = append(history, h)
	}
	return history, nil
}
