package models

import "time"

// Market represents a market event (e.g. "ตลาดนัดจตุจักร").
type Market struct {
	ID          string        `json:"id"`
	Name        string        `json:"name"`
	Description *string       `json:"description,omitempty"`
	Location    string        `json:"location"`
	Address     *string       `json:"address,omitempty"`
	Latitude    *float64      `json:"latitude,omitempty"`
	Longitude   *float64      `json:"longitude,omitempty"`
	MarketDate  time.Time     `json:"market_date"`
	StartTime   *string       `json:"start_time,omitempty"`
	EndTime     *string       `json:"end_time,omitempty"`
	Status      MarketStatus  `json:"status"`
	BannerURL   *string       `json:"banner_url,omitempty"`
	CreatedBy   string        `json:"created_by"`
	CreatedAt   time.Time     `json:"created_at"`
	UpdatedAt   time.Time     `json:"updated_at"`
}

// CreateMarketInput is used when creating a new market.
type CreateMarketInput struct {
	Name        string        `json:"name" validate:"required"`
	Description *string       `json:"description,omitempty"`
	Location    string        `json:"location" validate:"required"`
	Address     *string       `json:"address,omitempty"`
	Latitude    *float64      `json:"latitude,omitempty"`
	Longitude   *float64      `json:"longitude,omitempty"`
	MarketDate  string        `json:"market_date" validate:"required"` // "2006-01-02"
	StartTime   *string       `json:"start_time,omitempty"`           // "15:04"
	EndTime     *string       `json:"end_time,omitempty"`             // "15:04"
	Status      MarketStatus  `json:"status"`
	BannerURL   *string       `json:"banner_url,omitempty"`
}

// UpdateMarketInput is used when updating a market.
type UpdateMarketInput struct {
	Name        *string       `json:"name,omitempty"`
	Description *string       `json:"description,omitempty"`
	Location    *string       `json:"location,omitempty"`
	Address     *string       `json:"address,omitempty"`
	Latitude    *float64      `json:"latitude,omitempty"`
	Longitude   *float64      `json:"longitude,omitempty"`
	MarketDate  *string       `json:"market_date,omitempty"`
	StartTime   *string       `json:"start_time,omitempty"`
	EndTime     *string       `json:"end_time,omitempty"`
	Status      *MarketStatus `json:"status,omitempty"`
	BannerURL   *string       `json:"banner_url,omitempty"`
}

// Booth represents a vendor's booth/stand within a market.
type Booth struct {
	ID          string      `json:"id"`
	MarketID    string      `json:"market_id"`
	VendorID    string      `json:"vendor_id"`
	BoothName   string      `json:"booth_name"`
	BoothNumber *string     `json:"booth_number,omitempty"`
	Zone        *string     `json:"zone,omitempty"`
	Description *string     `json:"description,omitempty"`
	LogoURL     *string     `json:"logo_url,omitempty"`
	Status      BoothStatus `json:"status"`
	CreatedAt   time.Time   `json:"created_at"`
	UpdatedAt   time.Time   `json:"updated_at"`
}

// CreateBoothInput is used when registering a new booth.
type CreateBoothInput struct {
	MarketID    string  `json:"market_id" validate:"required"`
	BoothName   string  `json:"booth_name" validate:"required"`
	BoothNumber *string `json:"booth_number,omitempty"`
	Zone        *string `json:"zone,omitempty"`
	Description *string `json:"description,omitempty"`
	LogoURL     *string `json:"logo_url,omitempty"`
}

// UpdateBoothInput is used when updating a booth.
type UpdateBoothInput struct {
	BoothName   *string      `json:"booth_name,omitempty"`
	BoothNumber *string      `json:"booth_number,omitempty"`
	Zone        *string      `json:"zone,omitempty"`
	Description *string      `json:"description,omitempty"`
	LogoURL     *string      `json:"logo_url,omitempty"`
	Status      *BoothStatus `json:"status,omitempty"`
}
