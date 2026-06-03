package models

import (
	"time"

	"github.com/jackc/pgx/v5/pgtype"
)

// ============================================================================
// Database Models
// ============================================================================

type Vendor struct {
	ID          string    `json:"id"`
	Phone       string    `json:"phone"`
	PinHash     string    `json:"-"` // never expose in JSON
	Name        string    `json:"name"`
	BoothName   string    `json:"booth_name"`
	PromptpayID string    `json:"promptpay_id"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type Category struct {
	ID           string    `json:"id"`
	VendorID     string    `json:"vendor_id"`
	Name         string    `json:"name"`
	SortOrder    int       `json:"sort_order"`
	CreatedAt    time.Time `json:"created_at"`
	ProductCount int       `json:"product_count,omitempty"`
}

type Product struct {
	ID           string    `json:"id"`
	VendorID     string    `json:"vendor_id"`
	CategoryID   *string   `json:"category_id"`
	CategoryName string    `json:"category_name,omitempty"`
	Name         string    `json:"name"`
	Price        int       `json:"price"`
	Unit         string    `json:"unit"`
	ImageURL     string    `json:"image_url"`
	IsActive     bool      `json:"is_active"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type Order struct {
	ID            string       `json:"id"`
	VendorID      string       `json:"vendor_id"`
	OrderNo       string       `json:"order_no"`
	Subtotal      int          `json:"subtotal"`
	Discount      int          `json:"discount"`
	Total         int          `json:"total"`
	Status        string       `json:"status"`
	PaymentMethod *string      `json:"payment_method"`
	CustomerNote  string       `json:"customer_note"`
	Tags          string       `json:"tags"`
	ItemCount     int          `json:"item_count,omitempty"`
	Items         []OrderItem  `json:"items,omitempty"`
	CreatedAt     time.Time    `json:"created_at"`
	UpdatedAt     time.Time    `json:"updated_at"`
}

type OrderItem struct {
	ID          string  `json:"id"`
	VendorID    string  `json:"vendor_id"`
	OrderID     string  `json:"order_id"`
	ProductID   *string `json:"product_id"`
	ProductName string  `json:"product_name"`
	Price       int     `json:"price"`
	Qty         int     `json:"qty"`
	Subtotal    int     `json:"subtotal"`
	Notes       string  `json:"notes"`
}

type CustomerTag struct {
	ID        string    `json:"id"`
	VendorID  string    `json:"vendor_id"`
	Name      string    `json:"name"`
	SortOrder int       `json:"sort_order"`
	CreatedAt time.Time `json:"created_at"`
}

// ============================================================================
// Report Types
// ============================================================================
// Report Types
// ============================================================================

type DailyReport struct {
	Date           string              `json:"date"`
	TotalOrders    int                 `json:"total_orders"`
	TotalRevenue   int                 `json:"total_revenue"`   // satang
	TotalDiscount  int                 `json:"total_discount"`  // satang
	ByPayment      []PaymentSummary    `json:"by_payment"`
	TopProducts    []TopProduct        `json:"top_products"`
}

type MonthlyReport struct {
	Month          string              `json:"month"`
	TotalOrders    int                 `json:"total_orders"`
	TotalRevenue   int                 `json:"total_revenue"`
	TotalDiscount  int                 `json:"total_discount"`
	ByPayment      []PaymentSummary    `json:"by_payment"`
	DailyBreakdown []DailySummary      `json:"daily_breakdown"`
	TopProducts    []TopProduct        `json:"top_products"`
}

type PaymentSummary struct {
	PaymentMethod string `json:"payment_method"`
	Count         int    `json:"count"`
	Total         int    `json:"total"`
}

type TopProduct struct {
	ProductID   *string `json:"product_id"`
	ProductName string  `json:"product_name"`
	TotalQty    int     `json:"total_qty"`
	TotalAmount int     `json:"total_amount"`
}

type DailySummary struct {
	Date         string `json:"date"`
	TotalOrders  int    `json:"total_orders"`
	TotalRevenue int    `json:"total_revenue"`
}

// ============================================================================
// Request / Response Types
// ============================================================================

type RegisterRequest struct {
	Phone     string `json:"phone"`
	PIN       string `json:"pin"`
	Name      string `json:"name"`
	BoothName string `json:"booth_name"`
}

type LoginRequest struct {
	Phone string `json:"phone"`
	PIN   string `json:"pin"`
}

type AuthResponse struct {
	Vendor Vendor `json:"vendor"`
	Token  string `json:"token"`
}

type CreateOrderRequest struct {
	Items         []CreateOrderItem `json:"items"`
	Discount      int               `json:"discount"`
	CustomerNote  string            `json:"customer_note"`
	PaymentMethod *string           `json:"payment_method"`
	Tags          []string          `json:"tags"`
}

type CreateOrderItem struct {
	ProductID string `json:"product_id"`
	Qty       int    `json:"qty"`
	Notes     string `json:"notes"`
}

type UpdateStatusRequest struct {
	Status string `json:"status"`
}

type UpdatePaymentRequest struct {
	PaymentMethod string `json:"payment_method"`
}

type CreateProductRequest struct {
	CategoryID *string `json:"category_id"`
	Name       string  `json:"name"`
	Price      int     `json:"price"`
	Unit       string  `json:"unit"`
	ImageURL   string  `json:"image_url"`
	IsActive   *bool   `json:"is_active"`
}

type UpdateProductRequest struct {
	CategoryID *string `json:"category_id"`
	Name       string  `json:"name"`
	Price      int     `json:"price"`
	Unit       string  `json:"unit"`
	ImageURL   string  `json:"image_url"`
	IsActive   *bool   `json:"is_active"`
}

type QuickCreateProductRequest struct {
	Name  string `json:"name"`
	Price int    `json:"price"`
}

type CreateCategoryRequest struct {
	Name      string `json:"name"`
	SortOrder int    `json:"sort_order"`
}

type UpdateCategoryRequest struct {
	Name      string `json:"name"`
	SortOrder int    `json:"sort_order"`
}

type UpdateVendorProfileRequest struct {
	Name       string `json:"name"`
	BoothName  string `json:"booth_name"`
	PromptpayID string `json:"promptpay_id"`
}

// ============================================================================
// Helpers
// ============================================================================

// NullUUID converts a *string to pgtype.UUID for nullable UUID columns.
func NullUUID(s *string) pgtype.UUID {
	if s == nil || *s == "" {
		return pgtype.UUID{Valid: false}
	}
	u := pgtype.UUID{}
	if err := u.Scan(*s); err != nil {
		return pgtype.UUID{Valid: false}
	}
	return u
}

// StringPtr returns a pointer to the string value.
func StringPtr(s string) *string {
	return &s
}
