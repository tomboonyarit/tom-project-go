package models

import (
	"encoding/json"
	"time"
)

// Category represents a product category (e.g. อาหาร, เสื้อผ้า).
type Category struct {
	ID          string     `json:"id"`
	Name        string     `json:"name"`
	Slug        string     `json:"slug"`
	Description *string    `json:"description,omitempty"`
	ImageURL    *string    `json:"image_url,omitempty"`
	ParentID    *string    `json:"parent_id,omitempty"`
	SortOrder   int        `json:"sort_order"`
	IsActive    bool       `json:"is_active"`
	VendorID    *string    `json:"vendor_id,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
}

// CreateCategoryInput is used when creating a new category.
type CreateCategoryInput struct {
	Name        string  `json:"name" validate:"required"`
	Slug        string  `json:"slug" validate:"required"`
	Description *string `json:"description,omitempty"`
	ImageURL    *string `json:"image_url,omitempty"`
	ParentID    *string `json:"parent_id,omitempty"`
	SortOrder   *int    `json:"sort_order,omitempty"`
	VendorID    *string `json:"vendor_id,omitempty"`
}

// UpdateCategoryInput is used when updating a category.
type UpdateCategoryInput struct {
	Name        *string `json:"name,omitempty"`
	Slug        *string `json:"slug,omitempty"`
	Description *string `json:"description,omitempty"`
	ImageURL    *string `json:"image_url,omitempty"`
	ParentID    *string `json:"parent_id,omitempty"`
	SortOrder   *int    `json:"sort_order,omitempty"`
	IsActive    *bool   `json:"is_active,omitempty"`
}

// Product represents a product/item sold at a booth.
type Product struct {
	ID            string           `json:"id"`
	BoothID       string           `json:"booth_id"`
	VendorID      string           `json:"vendor_id"`
	CategoryID    *string          `json:"category_id,omitempty"`
	Name          string           `json:"name"`
	Description   *string          `json:"description,omitempty"`
	Price         float64          `json:"price"`
	SalePrice     *float64         `json:"sale_price,omitempty"`
	ImageURLs     json.RawMessage  `json:"image_urls"`
	StockQuantity *int             `json:"stock_quantity,omitempty"`
	Unit          string           `json:"unit"`
	IsAvailable   bool             `json:"is_available"`
	IsFeatured    bool             `json:"is_featured"`
	CreatedAt     time.Time        `json:"created_at"`
	UpdatedAt     time.Time        `json:"updated_at"`
}

// CreateProductInput is used when adding a new product.
type CreateProductInput struct {
	BoothID       string   `json:"booth_id" validate:"required"`
	CategoryID    *string  `json:"category_id,omitempty"`
	Name          string   `json:"name" validate:"required"`
	Description   *string  `json:"description,omitempty"`
	Price         float64  `json:"price" validate:"required,gt=0"`
	SalePrice     *float64 `json:"sale_price,omitempty"`
	ImageURLs     []string `json:"image_urls,omitempty"`
	StockQuantity *int     `json:"stock_quantity,omitempty"`
	Unit          *string  `json:"unit,omitempty"`
	IsAvailable   *bool    `json:"is_available,omitempty"`
	IsFeatured    *bool    `json:"is_featured,omitempty"`
}

// UpdateProductInput is used when updating a product.
type UpdateProductInput struct {
	CategoryID    *string   `json:"category_id,omitempty"`
	Name          *string   `json:"name,omitempty"`
	Description   *string   `json:"description,omitempty"`
	Price         *float64  `json:"price,omitempty"`
	SalePrice     *float64  `json:"sale_price,omitempty"`
	ImageURLs     []string  `json:"image_urls,omitempty"`
	StockQuantity *int      `json:"stock_quantity,omitempty"`
	Unit          *string   `json:"unit,omitempty"`
	IsAvailable   *bool     `json:"is_available,omitempty"`
	IsFeatured    *bool     `json:"is_featured,omitempty"`
}
