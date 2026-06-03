package repository

import (
	"context"
	"fmt"

	"api/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

// DailyReport generates a report for the given date (YYYY-MM-DD).
func DailyReport(pool *pgxpool.Pool, date string) (*models.DailyReport, error) {
	ctx := context.Background()

	report := &models.DailyReport{Date: date}

	// Overall totals (non-cancelled orders)
	err := pool.QueryRow(ctx,
		`SELECT COUNT(*), COALESCE(SUM(total), 0), COALESCE(SUM(discount), 0)
		 FROM orders WHERE created_at::date = $1::date AND status != 'cancelled'`,
		date,
	).Scan(&report.TotalOrders, &report.TotalRevenue, &report.TotalDiscount)
	if err != nil {
		return nil, fmt.Errorf("daily totals: %w", err)
	}

	// By payment method breakdown
	rows, err := pool.Query(ctx,
		`SELECT COALESCE(payment_method, 'unknown'), COUNT(*), COALESCE(SUM(total), 0)
		 FROM orders
		 WHERE created_at::date = $1::date AND status != 'cancelled'
		 GROUP BY payment_method`,
		date,
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

	// Top 5 products
	report.TopProducts, err = getTopProducts(ctx, pool, "o.created_at::date = $1::date", date)
	if err != nil {
		return nil, err
	}

	return report, nil
}

// MonthlyReport generates a report for the given month (YYYY-MM).
func MonthlyReport(pool *pgxpool.Pool, month string) (*models.MonthlyReport, error) {
	ctx := context.Background()

	report := &models.MonthlyReport{Month: month}

	// Overall totals
	err := pool.QueryRow(ctx,
		`SELECT COUNT(*), COALESCE(SUM(total), 0), COALESCE(SUM(discount), 0)
		 FROM orders
		 WHERE to_char(created_at, 'YYYY-MM') = $1 AND status != 'cancelled'`,
		month,
	).Scan(&report.TotalOrders, &report.TotalRevenue, &report.TotalDiscount)
	if err != nil {
		return nil, fmt.Errorf("monthly totals: %w", err)
	}

	// By payment method
	rows, err := pool.Query(ctx,
		`SELECT COALESCE(payment_method, 'unknown'), COUNT(*), COALESCE(SUM(total), 0)
		 FROM orders
		 WHERE to_char(created_at, 'YYYY-MM') = $1 AND status != 'cancelled'
		 GROUP BY payment_method`,
		month,
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

	// Daily breakdown
	dailyRows, err := pool.Query(ctx,
		`SELECT created_at::date::text, COUNT(*), COALESCE(SUM(total), 0)
		 FROM orders
		 WHERE to_char(created_at, 'YYYY-MM') = $1 AND status != 'cancelled'
		 GROUP BY created_at::date
		 ORDER BY created_at::date ASC`,
		month,
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

	// Top products for the month
	report.TopProducts, err = getTopProducts(ctx, pool, "to_char(o.created_at, 'YYYY-MM') = $1", month)
	if err != nil {
		return nil, err
	}

	return report, nil
}

// getTopProducts returns the top 5 products by quantity sold matching the given where clause.
func getTopProducts(ctx context.Context, pool *pgxpool.Pool, whereClause string, arg interface{}) ([]models.TopProduct, error) {
	query := fmt.Sprintf(`
		SELECT oi.product_id, oi.product_name, SUM(oi.qty) AS total_qty, SUM(oi.subtotal) AS total_amount
		FROM order_items oi
		JOIN orders o ON o.id = oi.order_id
		WHERE %s AND o.status != 'cancelled'
		GROUP BY oi.product_id, oi.product_name
		ORDER BY total_qty DESC
		LIMIT 5`, whereClause)

	rows, err := pool.Query(ctx, query, arg)
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
