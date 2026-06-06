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

func (h *OrderHandler) vendorID(r *http.Request) string {
	v, ok := r.Context().Value(VendorIDKey).(string)
	if !ok {
		return ""
	}
	return v
}

func (h *OrderHandler) Create(w http.ResponseWriter, r *http.Request) {
	vendorID := h.vendorID(r)
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

	order, err := repository.OrderCreate(h.pool, vendorID, req.Items, req.Discount, req.CustomerNote, req.PaymentMethod, req.Tags)
	if err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to create order: "+err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, order)
}

func (h *OrderHandler) List(w http.ResponseWriter, r *http.Request) {
	vendorID := h.vendorID(r)
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

	orders, totalOrders, totalRevenue, err := repository.OrderList(h.pool, vendorID, date, status)
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

func (h *OrderHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	vendorID := h.vendorID(r)
	id := r.PathValue("id")
	if id == "" {
		errorJSON(w, http.StatusBadRequest, "missing order id")
		return
	}

	order, err := repository.OrderGetByID(h.pool, vendorID, id)
	if err != nil {
		errorJSON(w, http.StatusNotFound, "order not found")
		return
	}

	writeJSON(w, http.StatusOK, order)
}

func (h *OrderHandler) UpdateTags(w http.ResponseWriter, r *http.Request) {
	vendorID := h.vendorID(r)
	id := r.PathValue("id")
	var req struct {
		Tags []string `json:"tags"`
	}
	if err := readJSON(r, &req); err != nil {
		errorJSON(w, http.StatusBadRequest, "invalid request body")
		return
	}
	tagsStr := strings.Join(req.Tags, ",")
	if err := repository.OrderUpdateTags(h.pool, vendorID, id, tagsStr); err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to update tags")
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"tags": tagsStr})
}

func (h *OrderHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	vendorID := h.vendorID(r)
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

	if err := repository.OrderUpdateStatus(h.pool, vendorID, id, req.Status); err != nil {
		if strings.Contains(err.Error(), "cannot transition") || strings.Contains(err.Error(), "invalid current status") {
			errorJSON(w, http.StatusBadRequest, err.Error())
		} else {
			errorJSON(w, http.StatusInternalServerError, "failed to update status")
		}
		return
	}

	order, err := repository.OrderGetByID(h.pool, vendorID, id)
	if err != nil {
		errorJSON(w, http.StatusInternalServerError, "status updated but failed to fetch order")
		return
	}

	writeJSON(w, http.StatusOK, order)
}

func (h *OrderHandler) UpdatePayment(w http.ResponseWriter, r *http.Request) {
	vendorID := h.vendorID(r)
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

	if err := repository.OrderUpdatePayment(h.pool, vendorID, id, req.PaymentMethod); err != nil {
		if strings.Contains(err.Error(), "invalid") || strings.Contains(err.Error(), "cannot update payment") {
			errorJSON(w, http.StatusBadRequest, err.Error())
		} else {
			errorJSON(w, http.StatusInternalServerError, "failed to update payment")
		}
		return
	}

	order, err := repository.OrderGetByID(h.pool, vendorID, id)
	if err != nil {
		errorJSON(w, http.StatusInternalServerError, "payment updated but failed to fetch order")
		return
	}

	writeJSON(w, http.StatusOK, order)
}
