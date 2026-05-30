package models

// PaginationParams holds pagination query parameters.
type PaginationParams struct {
	Page     int `json:"page"`
	PageSize int `json:"page_size"`
}

// DefaultPagination returns default pagination values.
func DefaultPagination() PaginationParams {
	return PaginationParams{
		Page:     1,
		PageSize: 20,
	}
}

// Offset returns the SQL OFFSET value.
func (p PaginationParams) Offset() int {
	return (p.Page - 1) * p.PageSize
}

// Limit returns the SQL LIMIT value.
func (p PaginationParams) Limit() int {
	return p.PageSize
}

// PaginatedResponse wraps a paginated list response.
type PaginatedResponse struct {
	Data       interface{} `json:"data"`
	Total      int         `json:"total"`
	Page       int         `json:"page"`
	PageSize   int         `json:"page_size"`
	TotalPages int         `json:"total_pages"`
}

// NewPaginatedResponse creates a PaginatedResponse.
func NewPaginatedResponse(data interface{}, total int, params PaginationParams) PaginatedResponse {
	totalPages := total / params.PageSize
	if total%params.PageSize > 0 {
		totalPages++
	}
	return PaginatedResponse{
		Data:       data,
		Total:      total,
		Page:       params.Page,
		PageSize:   params.PageSize,
		TotalPages: totalPages,
	}
}

// ErrorResponse represents an API error response.
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message,omitempty"`
}

// NewErrorResponse creates an ErrorResponse.
func NewErrorResponse(err string, msg string) ErrorResponse {
	return ErrorResponse{
		Error:   err,
		Message: msg,
	}
}

// MessageResponse represents a simple API message response.
type MessageResponse struct {
	Message string `json:"message"`
}

// NewMessageResponse creates a MessageResponse.
func NewMessageResponse(msg string) MessageResponse {
	return MessageResponse{
		Message: msg,
	}
}
