package models

// UserRole represents the role of a user in the system.
type UserRole string

const (
	UserRoleCustomer UserRole = "customer"
	UserRoleVendor   UserRole = "vendor"
	UserRoleAdmin    UserRole = "admin"
)

// MarketStatus represents the status of a market/event.
type MarketStatus string

const (
	MarketStatusDraft     MarketStatus = "draft"
	MarketStatusPublished MarketStatus = "published"
	MarketStatusActive    MarketStatus = "active"
	MarketStatusClosed    MarketStatus = "closed"
	MarketStatusCancelled MarketStatus = "cancelled"
)

// BoothStatus represents the status of a vendor booth.
type BoothStatus string

const (
	BoothStatusPending  BoothStatus = "pending"
	BoothStatusApproved BoothStatus = "approved"
	BoothStatusActive   BoothStatus = "active"
	BoothStatusClosed   BoothStatus = "closed"
	BoothStatusRejected BoothStatus = "rejected"
)

// OrderStatus represents the status of an order.
type OrderStatus string

const (
	OrderStatusPending       OrderStatus = "pending"
	OrderStatusConfirmed     OrderStatus = "confirmed"
	OrderStatusPreparing     OrderStatus = "preparing"
	OrderStatusReadyPickup   OrderStatus = "ready_for_pickup"
	OrderStatusCompleted     OrderStatus = "completed"
	OrderStatusCancelled     OrderStatus = "cancelled"
)

// PaymentStatus represents the payment status of an order.
type PaymentStatus string

const (
	PaymentStatusUnpaid         PaymentStatus = "unpaid"
	PaymentStatusPendingApproval PaymentStatus = "pending_approval"
	PaymentStatusPaid           PaymentStatus = "paid"
	PaymentStatusRefunded       PaymentStatus = "refunded"
)

// PaymentMethod represents the payment method used for an order.
type PaymentMethod string

const (
	PaymentMethodCashOnPickup PaymentMethod = "cash_on_pickup"
	PaymentMethodBankTransfer PaymentMethod = "bank_transfer"
	PaymentMethodPromptPay    PaymentMethod = "promptpay"
	PaymentMethodQRCode       PaymentMethod = "qr_code"
)
