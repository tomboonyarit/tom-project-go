package models

// DashboardStats — ภาพรวมสำหรับ admin dashboard
type DashboardStats struct {
	TotalMarkets    int           `json:"total_markets"`
	ActiveMarkets   int           `json:"active_markets"`
	TotalVendors    int           `json:"total_vendors"`
	TotalCustomers  int           `json:"total_customers"`
	OrdersToday     int           `json:"orders_today"`
	RevenueToday    float64       `json:"revenue_today"`
	RevenueMonth    float64       `json:"revenue_month"`
	OrdersByStatus  []StatusCount `json:"orders_by_status"`
	RecentOrders    []Order       `json:"recent_orders"`
}

// StatusCount represents order count grouped by status.
type StatusCount struct {
	Status string `json:"status"`
	Count  int    `json:"count"`
}

// SalesReport — รายงานยอดขาย
type SalesReport struct {
	PeriodStart   string        `json:"period_start"`
	PeriodEnd     string        `json:"period_end"`
	TotalOrders   int           `json:"total_orders"`
	TotalRevenue  float64       `json:"total_revenue"`
	AvgOrderValue float64       `json:"avg_order_value"`
	ByMarket      []MarketSales `json:"by_market,omitempty"`
	ByVendor      []VendorSales `json:"by_vendor,omitempty"`
	DailyBreakdown []DailySales `json:"daily_breakdown,omitempty"`
}

// MarketSales represents sales aggregated by market.
type MarketSales struct {
	MarketID     string  `json:"market_id"`
	MarketName   string  `json:"market_name"`
	OrderCount   int     `json:"order_count"`
	TotalRevenue float64 `json:"total_revenue"`
}

// VendorSales represents sales aggregated by vendor.
type VendorSales struct {
	VendorID     string  `json:"vendor_id"`
	VendorName   string  `json:"vendor_name"`
	BoothName    string  `json:"booth_name"`
	OrderCount   int     `json:"order_count"`
	TotalRevenue float64 `json:"total_revenue"`
}

// DailySales represents sales aggregated by day.
type DailySales struct {
	Date         string  `json:"date"`
	OrderCount   int     `json:"order_count"`
	TotalRevenue float64 `json:"total_revenue"`
}

// AdminUpdateUserInput — สำหรับ admin แก้ไข user
type AdminUpdateUserInput struct {
	Name     *string   `json:"name,omitempty"`
	Phone    *string   `json:"phone,omitempty"`
	Role     *UserRole `json:"role,omitempty"`
	IsActive *bool     `json:"is_active,omitempty"`
}
