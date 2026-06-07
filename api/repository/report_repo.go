package repository

import (
	"context"
	"fmt"

	"api/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

func DailyReport(pool *pgxpool.Pool, vendorID, date string) (*models.DailyReport, error) {
	ctx := context.Background()

	report := &models.DailyReport{Date: date}

	err := pool.QueryRow(ctx,
		`SELECT COUNT(*), COALESCE(SUM(total), 0), COALESCE(SUM(discount), 0)
		 FROM orders WHERE created_at::date = $1::date AND status != 'cancelled' AND vendor_id = $2`,
		date, vendorID,
	).Scan(&report.TotalOrders, &report.TotalRevenue, &report.TotalDiscount)
	if err != nil {
		return nil, fmt.Errorf("daily totals: %w", err)
	}

	rows, err := pool.Query(ctx,
		`SELECT COALESCE(payment_method, 'unknown'), COUNT(*), COALESCE(SUM(total), 0)
		 FROM orders
		 WHERE created_at::date = $1::date AND status != 'cancelled' AND vendor_id = $2
		 GROUP BY payment_method`,
		date, vendorID,
	)
	if err != nil {
		return nil, fmt.Errorf("daily by payment: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var ps models.PaymentSummary
		err := rows.Scan(&ps.PaymentMethod, &ps.Count, &ps.Total)
		if err != nil {
			return nil, fmt.Errorf("scan payment summary: %w", err)
		}
		report.ByPayment = append(report.ByPayment, ps)
	}
	if report.ByPayment == nil {
		report.ByPayment = []models.PaymentSummary{}
	}

	report.TopProducts, err = getTopProducts(ctx, pool, vendorID, "o.created_at::date = $1::date AND o.vendor_id = $2", date, vendorID)
	if err != nil {
		return nil, err
	}

	return report, nil
}

func MonthlyReport(pool *pgxpool.Pool, vendorID, month string) (*models.MonthlyReport, error) {
	ctx := context.Background()

	report := &models.MonthlyReport{Month: month}

	err := pool.QueryRow(ctx,
		`SELECT COUNT(*), COALESCE(SUM(total), 0), COALESCE(SUM(discount), 0)
		 FROM orders
		 WHERE to_char(created_at, 'YYYY-MM') = $1 AND status != 'cancelled' AND vendor_id = $2`,
		month, vendorID,
	).Scan(&report.TotalOrders, &report.TotalRevenue, &report.TotalDiscount)
	if err != nil {
		return nil, fmt.Errorf("monthly totals: %w", err)
	}

	rows, err := pool.Query(ctx,
		`SELECT COALESCE(payment_method, 'unknown'), COUNT(*), COALESCE(SUM(total), 0)
		 FROM orders
		 WHERE to_char(created_at, 'YYYY-MM') = $1 AND status != 'cancelled' AND vendor_id = $2
		 GROUP BY payment_method`,
		month, vendorID,
	)
	if err != nil {
		return nil, fmt.Errorf("monthly by payment: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var ps models.PaymentSummary
		err := rows.Scan(&ps.PaymentMethod, &ps.Count, &ps.Total)
		if err != nil {
			return nil, fmt.Errorf("scan payment summary: %w", err)
		}
		report.ByPayment = append(report.ByPayment, ps)
	}
	if report.ByPayment == nil {
		report.ByPayment = []models.PaymentSummary{}
	}

	dailyRows, err := pool.Query(ctx,
		`SELECT created_at::date::text, COUNT(*), COALESCE(SUM(total), 0)
		 FROM orders
		 WHERE to_char(created_at, 'YYYY-MM') = $1 AND status != 'cancelled' AND vendor_id = $2
		 GROUP BY created_at::date
		 ORDER BY created_at::date ASC`,
		month, vendorID,
	)
	if err != nil {
		return nil, fmt.Errorf("monthly daily breakdown: %w", err)
	}
	defer dailyRows.Close()

	for dailyRows.Next() {
		var ds models.DailySummary
		err := dailyRows.Scan(&ds.Date, &ds.TotalOrders, &ds.TotalRevenue)
		if err != nil {
			return nil, fmt.Errorf("scan daily summary: %w", err)
		}
		report.DailyBreakdown = append(report.DailyBreakdown, ds)
	}
	if report.DailyBreakdown == nil {
		report.DailyBreakdown = []models.DailySummary{}
	}

	report.TopProducts, err = getTopProducts(ctx, pool, vendorID, "to_char(o.created_at, 'YYYY-MM') = $1 AND o.vendor_id = $2", month, vendorID)
	if err != nil {
		return nil, err
	}

	return report, nil
}

func getTopProducts(ctx context.Context, pool *pgxpool.Pool, vendorID string, whereClause string, args ...interface{}) ([]models.TopProduct, error) {
	query := fmt.Sprintf(`
		SELECT oi.product_id, oi.product_name, SUM(oi.qty) AS total_qty, SUM(oi.subtotal) AS total_amount
		FROM order_items oi
		JOIN orders o ON o.id = oi.order_id
		WHERE %s AND o.status != 'cancelled' AND o.vendor_id = $%d
		GROUP BY oi.product_id, oi.product_name
		ORDER BY total_qty DESC
		LIMIT 5`, whereClause, len(args)+1)

	allArgs := append(args, vendorID)

	rows, err := pool.Query(ctx, query, allArgs...)
	if err != nil {
		return nil, fmt.Errorf("top products: %w", err)
	}
	defer rows.Close()

	var products []models.TopProduct
	for rows.Next() {
		var tp models.TopProduct
		err := rows.Scan(&tp.ProductID, &tp.ProductName, &tp.TotalQty, &tp.TotalAmount)
		if err != nil {
			return nil, fmt.Errorf("scan top product: %w", err)
		}
		products = append(products, tp)
	}
	if products == nil {
		products = []models.TopProduct{}
	}
	return products, nil
}
