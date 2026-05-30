package models

import "time"

// User represents a user in the system (customer, vendor, or admin).
type User struct {
	ID             string    `json:"id"`
	Email          string    `json:"email"`
	PasswordHash   string    `json:"-"`
	Name           string    `json:"name"`
	Phone          *string   `json:"phone,omitempty"`
	Role           UserRole  `json:"role"`
	AvatarURL      *string   `json:"avatar_url,omitempty"`
	Address        *string   `json:"address,omitempty"`
	DefaultBoothID *string   `json:"default_booth_id,omitempty"`
	IsActive       bool      `json:"is_active"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// CreateUserInput is used when creating a new user.
type CreateUserInput struct {
	Email    string    `json:"email" validate:"required,email"`
	Password string    `json:"password" validate:"required,min=6"`
	Name     string    `json:"name" validate:"required"`
	Phone    *string   `json:"phone,omitempty"`
	Role     UserRole  `json:"role"`
	AvatarURL *string  `json:"avatar_url,omitempty"`
	Address  *string   `json:"address,omitempty"`
}

// UpdateUserInput is used when updating an existing user.
type UpdateUserInput struct {
	Name           *string `json:"name,omitempty"`
	Phone          *string `json:"phone,omitempty"`
	AvatarURL      *string `json:"avatar_url,omitempty"`
	Address        *string `json:"address,omitempty"`
	DefaultBoothID *string `json:"default_booth_id,omitempty"`
}

// UserResponse is a public-facing user response (no password hash).
type UserResponse struct {
	ID             string    `json:"id"`
	Email          string    `json:"email"`
	Name           string    `json:"name"`
	Phone          *string   `json:"phone,omitempty"`
	Role           UserRole  `json:"role"`
	AvatarURL      *string   `json:"avatar_url,omitempty"`
	Address        *string   `json:"address,omitempty"`
	DefaultBoothID *string   `json:"default_booth_id,omitempty"`
	IsActive       bool      `json:"is_active"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// ToResponse converts a User to a safe UserResponse.
func (u *User) ToResponse() UserResponse {
	return UserResponse{
		ID:             u.ID,
		Email:          u.Email,
		Name:           u.Name,
		Phone:          u.Phone,
		Role:           u.Role,
		AvatarURL:      u.AvatarURL,
		Address:        u.Address,
		DefaultBoothID: u.DefaultBoothID,
		IsActive:       u.IsActive,
		CreatedAt:      u.CreatedAt,
		UpdatedAt:      u.UpdatedAt,
	}
}
