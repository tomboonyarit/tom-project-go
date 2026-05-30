package models

import "time"

// Cart represents a shopping cart (1 user = 1 active cart).
type Cart struct {
	ID         string    `json:"id"`
	CustomerID string    `json:"customer_id"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// CartItem represents a product added to a cart.
type CartItem struct {
	ID        string    `json:"id"`
	CartID    string    `json:"cart_id"`
	ProductID string    `json:"product_id"`
	Quantity  int       `json:"quantity"`
	Notes     *string   `json:"notes,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// AddCartItemInput is used when adding a product to cart.
type AddCartItemInput struct {
	ProductID string  `json:"product_id" validate:"required"`
	Quantity  int     `json:"quantity" validate:"required,gt=0"`
	Notes     *string `json:"notes,omitempty"`
}

// UpdateCartItemInput is used when updating cart item quantity.
type UpdateCartItemInput struct {
	Quantity int     `json:"quantity" validate:"required,gt=0"`
	Notes    *string `json:"notes,omitempty"`
}
