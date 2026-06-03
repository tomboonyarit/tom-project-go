package handler

import (
	"net/http"
	"strings"

	"api/models"
	"api/repository"

	"github.com/jackc/pgx/v5/pgxpool"
)

type OrderHandler struct {
	pool *pgxpool.Pool
}

func NewOrderHandler(pool *pgxpool.Pool) *OrderHandler {
	return &OrderHandler{pool: pool}
}

// Create handles POST /api/orders
func (h *OrderHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req models.CreateOrderRequest
	if err := readJSON(r, &req); err != nil {
		errorJSON(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if len(req.Items) == 0 {
		errorJSON(w, http.StatusBadRequest, "order must have at least one item")
		return
	}

	for _, item := range req.Items {
		if item.ProductID == "" {
			errorJSON(w, http.StatusBadRequest, "each item must have a product_id")
			return
		}
		if item.Qty <= 0 {
			errorJSON(w, http.StatusBadRequest, "item quantity must be greater than 0")
			return
		}
	}

	order, err := repository.OrderCreate(h.pool, req.Items, req.Discount, req.CustomerNote, req.Tags)
	if err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to create order")
		return
	}

	writeJSON(w, http.StatusCreated, order)
}

// List handles GET /api/orders
func (h *OrderHandler) List(w http.ResponseWriter, r *http.Request) {
	dateParam := r.URL.Query().Get("date")
	statusParam := r.URL.Query().Get("status")

	var date *string
	var status *string
	if dateParam != "" {
		date = &dateParam
	}
	if statusParam != "" {
		status = &statusParam
	}

	orders, totalOrders, totalRevenue, err := repository.OrderList(h.pool, date, status)
	if err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to list orders")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"orders":        orders,
		"total_orders":  totalOrders,
		"total_revenue": totalRevenue,
	})
}

// GetByID handles GET /api/orders/{id}
func (h *OrderHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		errorJSON(w, http.StatusBadRequest, "missing order id")
		return
	}

	order, err := repository.OrderGetByID(h.pool, id)
	if err != nil {
		errorJSON(w, http.StatusNotFound, "order not found")
		return
	}

	writeJSON(w, http.StatusOK, order)
}

// UpdateTags handles PUT /api/orders/{id}/tags
func (h *OrderHandler) UpdateTags(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var req struct {
		Tags []string `json:"tags"`
	}
	if err := readJSON(r, &req); err != nil {
		errorJSON(w, http.StatusBadRequest, "invalid request body")
		return
	}
	tagsStr := strings.Join(req.Tags, ",")
	if err := repository.OrderUpdateTags(h.pool, id, tagsStr); err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to update tags")
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"tags": tagsStr})
}

// UpdateStatus handles PUT /api/orders/{id}/status
func (h *OrderHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		errorJSON(w, http.StatusBadRequest, "missing order id")
		return
	}

	var req models.UpdateStatusRequest
	if err := readJSON(r, &req); err != nil {
		errorJSON(w, http.StatusBadRequest, "invalid request body")
		return
	}

	req.Status = strings.TrimSpace(req.Status)
	validStatuses := map[string]bool{"new": true, "preparing": true, "paid": true, "completed": true, "cancelled": true}
	if !validStatuses[req.Status] {
		errorJSON(w, http.StatusBadRequest, "invalid status: must be one of new, preparing, paid, completed, cancelled")
		return
	}

	if err := repository.OrderUpdateStatus(h.pool, id, req.Status); err != nil {
		errorJSON(w, http.StatusBadRequest, err.Error())
		return
	}

	// Fetch updated order
	order, err := repository.OrderGetByID(h.pool, id)
	if err != nil {
		errorJSON(w, http.StatusInternalServerError, "status updated but failed to fetch order")
		return
	}

	writeJSON(w, http.StatusOK, order)
}

// UpdatePayment handles PUT /api/orders/{id}/payment
func (h *OrderHandler) UpdatePayment(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		errorJSON(w, http.StatusBadRequest, "missing order id")
		return
	}

	var req models.UpdatePaymentRequest
	if err := readJSON(r, &req); err != nil {
		errorJSON(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := repository.OrderUpdatePayment(h.pool, id, req.PaymentMethod); err != nil {
		errorJSON(w, http.StatusBadRequest, err.Error())
		return
	}

	// Fetch updated order
	order, err := repository.OrderGetByID(h.pool, id)
	if err != nil {
		errorJSON(w, http.StatusInternalServerError, "payment updated but failed to fetch order")
		return
	}

	writeJSON(w, http.StatusOK, order)
}
