package handler

import (
	"net/http"

	"api/models"
	"api/repository"
)

type OrderHandler struct {
	orderRepo      *repository.OrderRepo
	orderItemRepo  *repository.OrderItemRepo
	orderHistRepo  *repository.OrderHistoryRepo
}

func NewOrderHandler(
	orderRepo *repository.OrderRepo,
	orderItemRepo *repository.OrderItemRepo,
	orderHistRepo *repository.OrderHistoryRepo,
) *OrderHandler {
	return &OrderHandler{
		orderRepo:     orderRepo,
		orderItemRepo: orderItemRepo,
		orderHistRepo: orderHistRepo,
	}
}

// Create handles POST /api/orders
func (h *OrderHandler) Create(w http.ResponseWriter, r *http.Request) {
	var input models.CreateOrderInput
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid request body")
		return
	}

	if len(input.Items) == 0 {
		writeError(w, http.StatusBadRequest, "bad_request", "At least one item is required")
		return
	}

	userID := GetUserID(r)
	order, err := h.orderRepo.Create(r.Context(), input, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Failed to create order")
		return
	}
	writeJSON(w, http.StatusCreated, order)
}

// List handles GET /api/orders
func (h *OrderHandler) List(w http.ResponseWriter, r *http.Request) {
	params := parsePagination(r)
	role := GetUserRole(r)
	userID := GetUserID(r)

	var orders []models.Order
	var total int
	var err error

	if role == string(models.UserRoleVendor) || role == string(models.UserRoleAdmin) {
		// For vendors/admins, filter by booth if specified
		boothID := parseQueryParam(r, "booth_id")
		if boothID != "" {
			orders, total, err = h.orderRepo.ListByBooth(r.Context(), boothID, params)
		} else {
			// List all orders for the user's booths (simplified: just by customer for now)
			orders, total, err = h.orderRepo.ListByCustomer(r.Context(), userID, params)
		}
	} else {
		orders, total, err = h.orderRepo.ListByCustomer(r.Context(), userID, params)
	}

	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Database error")
		return
	}
	writeJSON(w, http.StatusOK, models.NewPaginatedResponse(orders, total, params))
}

// GetByID handles GET /api/orders/{id}
func (h *OrderHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	order, err := h.orderRepo.FindByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Database error")
		return
	}
	if order == nil {
		writeError(w, http.StatusNotFound, "not_found", "Order not found")
		return
	}

	// Fetch items and history
	items, _ := h.orderItemRepo.ListByOrder(r.Context(), id)
	history, _ := h.orderHistRepo.ListByOrder(r.Context(), id)

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"order":   order,
		"items":   items,
		"history": history,
	})
}

// UpdateStatus handles PUT /api/orders/{id}/status
func (h *OrderHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var input models.UpdateOrderStatusInput
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid request body")
		return
	}

	userID := GetUserID(r)
	order, err := h.orderRepo.UpdateStatus(r.Context(), id, input, &userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Failed to update order status")
		return
	}
	if order == nil {
		writeError(w, http.StatusNotFound, "not_found", "Order not found")
		return
	}
	writeJSON(w, http.StatusOK, order)
}

// UpdatePayment handles PUT /api/orders/{id}/payment
func (h *OrderHandler) UpdatePayment(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var input models.UpdateOrderPaymentInput
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid request body")
		return
	}

	order, err := h.orderRepo.UpdatePayment(r.Context(), id, input)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Failed to update payment")
		return
	}
	if order == nil {
		writeError(w, http.StatusNotFound, "not_found", "Order not found")
		return
	}
	writeJSON(w, http.StatusOK, order)
}
