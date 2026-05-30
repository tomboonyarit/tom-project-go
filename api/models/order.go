package models

import "time"

// Order represents a purchase order placed by a customer at a booth.
type Order struct {
	ID              string         `json:"id"`
	OrderNumber     string         `json:"order_number"`
	CustomerID      string         `json:"customer_id"`
	MarketID        string         `json:"market_id"`
	BoothID         string         `json:"booth_id"`
	TotalAmount     float64        `json:"total_amount"`
	DiscountAmount  float64        `json:"discount_amount"`
	FinalAmount     float64        `json:"final_amount"`
	Status          OrderStatus    `json:"status"`
	PaymentStatus   PaymentStatus  `json:"payment_status"`
	PaymentMethod   *PaymentMethod `json:"payment_method,omitempty"`
	PaymentProofURL *string        `json:"payment_proof_url,omitempty"`
	PickupDate      *string        `json:"pickup_date,omitempty"`
	PickupTime      *string        `json:"pickup_time,omitempty"`
	CustomerNote          *string        `json:"customer_note,omitempty"`
	VendorNote            *string        `json:"vendor_note,omitempty"`
	CustomerDescription   *string        `json:"customer_description,omitempty"`
	CancelledReason       *string        `json:"cancelled_reason,omitempty"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
}

// CreateOrderInput is used when placing a new order.
type CreateOrderInput struct {
	MarketID             string                 `json:"market_id" validate:"required"`
	BoothID              string                 `json:"booth_id" validate:"required"`
	PaymentMethod        *PaymentMethod         `json:"payment_method,omitempty"`
	PickupDate           *string                `json:"pickup_date,omitempty"`
	PickupTime           *string                `json:"pickup_time,omitempty"`
	CustomerNote         *string                `json:"customer_note,omitempty"`
	CustomerDescription  *string                `json:"customer_description,omitempty"`
	DiscountAmount       *float64               `json:"discount_amount,omitempty"`
	Items                []CreateOrderItemInput `json:"items" validate:"required,min=1,dive"`
}

// VendorCreateOrderInput is used when a vendor creates an order for a walk-in customer.
type VendorCreateOrderInput struct {
	BoothID              string                 `json:"booth_id" validate:"required"`
	CustomerName         *string                `json:"customer_name,omitempty"`
	CustomerDescription  *string                `json:"customer_description,omitempty"`
	DiscountAmount       *float64               `json:"discount_amount,omitempty"`
	Items                []CreateOrderItemInput  `json:"items" validate:"required,min=1,dive"`
}

// UpdateOrderStatusInput is used when changing order status.
type UpdateOrderStatusInput struct {
	Status          OrderStatus `json:"status" validate:"required"`
	VendorNote      *string     `json:"vendor_note,omitempty"`
	CancelledReason *string     `json:"cancelled_reason,omitempty"`
}

// UpdateOrderPaymentInput is used when updating payment information.
type UpdateOrderPaymentInput struct {
	PaymentStatus   PaymentStatus  `json:"payment_status"`
	PaymentMethod   *PaymentMethod `json:"payment_method,omitempty"`
	PaymentProofURL *string        `json:"payment_proof_url,omitempty"`
}

// OrderItem represents an individual item within an order.
type OrderItem struct {
	ID          string  `json:"id"`
	OrderID     string  `json:"order_id"`
	ProductID   *string `json:"product_id,omitempty"`
	ProductName string  `json:"product_name"`
	Quantity    int     `json:"quantity"`
	UnitPrice   float64 `json:"unit_price"`
	Subtotal    float64 `json:"subtotal"`
	Notes       *string `json:"notes,omitempty"`
}

// CreateOrderItemInput is used when adding items to an order.
type CreateOrderItemInput struct {
	ProductID   *string `json:"product_id,omitempty"`
	ProductName string  `json:"product_name" validate:"required"`
	Quantity    int     `json:"quantity" validate:"required,gt=0"`
	UnitPrice   float64 `json:"unit_price" validate:"required,gt=0"`
	Notes       *string `json:"notes,omitempty"`
}

// OrderStatusHistory records status changes for an order.
type OrderStatusHistory struct {
	ID         string       `json:"id"`
	OrderID    string       `json:"order_id"`
	FromStatus *OrderStatus `json:"from_status,omitempty"`
	ToStatus   OrderStatus  `json:"to_status"`
	ChangedBy  *string      `json:"changed_by,omitempty"`
	Notes      *string      `json:"notes,omitempty"`
	CreatedAt  time.Time    `json:"created_at"`
}
