package handler

import (
	"net/http"

	"api/models"
	"api/repository"
)

type VendorHandler struct {
	orderRepo      *repository.OrderRepo
	orderItemRepo  *repository.OrderItemRepo
	boothRepo      *repository.BoothRepo
	productRepo    *repository.ProductRepo
	userRepo       *repository.UserRepo
	categoryRepo   *repository.CategoryRepo
}

func NewVendorHandler(
	orderRepo *repository.OrderRepo,
	orderItemRepo *repository.OrderItemRepo,
	boothRepo *repository.BoothRepo,
	productRepo *repository.ProductRepo,
	userRepo *repository.UserRepo,
	categoryRepo *repository.CategoryRepo,
) *VendorHandler {
	return &VendorHandler{
		orderRepo:      orderRepo,
		orderItemRepo:  orderItemRepo,
		boothRepo:      boothRepo,
		productRepo:    productRepo,
		userRepo:       userRepo,
		categoryRepo:   categoryRepo,
	}
}

// CreateOrder handles POST /api/vendor/orders
// Vendor creates an order for a walk-in customer.
func (h *VendorHandler) CreateOrder(w http.ResponseWriter, r *http.Request) {
	var input models.VendorCreateOrderInput
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid request body")
		return
	}

	if len(input.Items) == 0 {
		writeError(w, http.StatusBadRequest, "bad_request", "At least one item is required")
		return
	}

	vendorID := GetUserID(r)

	// Verify booth belongs to this vendor
	booth, err := h.boothRepo.FindByID(r.Context(), input.BoothID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Database error")
		return
	}
	if booth == nil {
		writeError(w, http.StatusNotFound, "not_found", "Booth not found")
		return
	}
	if booth.VendorID != vendorID {
		writeError(w, http.StatusForbidden, "forbidden", "This booth does not belong to you")
		return
	}

	// Build customer note: prefix with "Walk-in: " if customer name provided
	var customerNote *string
	if input.CustomerName != nil {
		note := "Walk-in: " + *input.CustomerName
		customerNote = &note
	}

	orderInput := models.CreateOrderInput{
		MarketID:            booth.MarketID,
		BoothID:             input.BoothID,
		CustomerNote:        customerNote,
		CustomerDescription: input.CustomerDescription,
		DiscountAmount:      input.DiscountAmount,
		Items:               input.Items,
	}

	order, err := h.orderRepo.Create(r.Context(), orderInput, vendorID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Failed to create order")
		return
	}

	writeJSON(w, http.StatusCreated, order)
}

// ListBooths handles GET /api/vendor/booths
// Lists all booths owned by the authenticated vendor.
func (h *VendorHandler) ListBooths(w http.ResponseWriter, r *http.Request) {
	vendorID := GetUserID(r)

	booths, err := h.boothRepo.ListByVendor(r.Context(), vendorID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Database error")
		return
	}

	writeJSON(w, http.StatusOK, booths)
}

// ListVendorProducts handles GET /api/vendor/products/list
// Lists all products for a given booth, with vendor ownership check.
func (h *VendorHandler) ListVendorProducts(w http.ResponseWriter, r *http.Request) {
	vendorID := GetUserID(r)
	boothID := parseQueryParam(r, "booth_id")
	if boothID == "" {
		writeError(w, http.StatusBadRequest, "bad_request", "booth_id is required")
		return
	}

	// Verify booth belongs to vendor
	booth, err := h.boothRepo.FindByID(r.Context(), boothID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Database error")
		return
	}
	if booth == nil || booth.VendorID != vendorID {
		writeError(w, http.StatusForbidden, "forbidden", "Access denied")
		return
	}

	params := parsePagination(r)
	products, total, err := h.productRepo.ListByBooth(r.Context(), boothID, params, false)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Database error")
		return
	}

	writeJSON(w, http.StatusOK, models.NewPaginatedResponse(products, total, params))
}

// SearchProducts handles GET /api/vendor/products
// Searches products by name or price within a specific booth.
// If booth_id is not provided, uses the vendor's default booth.
// Query params: q (search string), booth_id (optional)
func (h *VendorHandler) SearchProducts(w http.ResponseWriter, r *http.Request) {
	vendorID := GetUserID(r)
	query := parseQueryParam(r, "q")
	boothID := parseQueryParam(r, "booth_id")
	if boothID == "" {
		// Fall back to vendor's default booth
		user, err := h.userRepo.FindByID(r.Context(), vendorID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "server_error", "Database error")
			return
		}
		if user == nil || user.DefaultBoothID == nil {
			writeError(w, http.StatusBadRequest, "bad_request", "No default booth set and no booth_id provided")
			return
		}
		boothID = *user.DefaultBoothID
	}

	// Verify booth belongs to this vendor
	booth, err := h.boothRepo.FindByID(r.Context(), boothID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Database error")
		return
	}
	if booth == nil || booth.VendorID != vendorID {
		writeError(w, http.StatusNotFound, "not_found", "Booth not found")
		return
	}

	limit := 20
	products, err := h.productRepo.SearchByBooth(r.Context(), boothID, query, limit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Database error")
		return
	}

	writeJSON(w, http.StatusOK, products)
}

// ListOrders handles GET /api/vendor/orders
// Lists orders across all booths owned by the vendor, filterable by status.
func (h *VendorHandler) ListOrders(w http.ResponseWriter, r *http.Request) {
	params := parsePagination(r)
	vendorID := GetUserID(r)

	var status *models.OrderStatus
	statusStr := parseQueryParam(r, "status")
	if statusStr != "" {
		s := models.OrderStatus(statusStr)
		status = &s
	}

	orders, total, err := h.orderRepo.ListByVendorBooths(r.Context(), vendorID, params, status)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Database error")
		return
	}
	writeJSON(w, http.StatusOK, models.NewPaginatedResponse(orders, total, params))
}

// GetOrder handles GET /api/vendor/orders/{id}
func (h *VendorHandler) GetOrder(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	vendorID := GetUserID(r)

	order, err := h.orderRepo.FindByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Database error")
		return
	}
	if order == nil {
		writeError(w, http.StatusNotFound, "not_found", "Order not found")
		return
	}

	// Verify order belongs to one of vendor's booths
	booth, err := h.boothRepo.FindByID(r.Context(), order.BoothID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Database error")
		return
	}
	if booth == nil || booth.VendorID != vendorID {
		writeError(w, http.StatusForbidden, "forbidden", "Access denied")
		return
	}

	// Fetch items
	items, _ := h.orderItemRepo.ListByOrder(r.Context(), id)

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"order": order,
		"items": items,
	})
}

// UpdateStatus handles PUT /api/vendor/orders/{id}/status
func (h *VendorHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	vendorID := GetUserID(r)

	var input struct {
		Status     models.OrderStatus `json:"status"`
		VendorNote *string            `json:"vendor_note,omitempty"`
	}
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid request body")
		return
	}

	// Validate allowed status transitions for vendor
	allowedStatuses := map[models.OrderStatus]bool{
		models.OrderStatusPreparing:   true,
		models.OrderStatusReadyPickup: true,
		models.OrderStatusCompleted:   true,
	}
	if !allowedStatuses[input.Status] {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid status. Allowed: preparing, ready_for_pickup, completed")
		return
	}

	// Verify ownership
	order, err := h.orderRepo.FindByID(r.Context(), id)
	if err != nil || order == nil {
		writeError(w, http.StatusNotFound, "not_found", "Order not found")
		return
	}
	booth, err := h.boothRepo.FindByID(r.Context(), order.BoothID)
	if err != nil || booth == nil || booth.VendorID != vendorID {
		writeError(w, http.StatusForbidden, "forbidden", "Access denied")
		return
	}

	updateInput := models.UpdateOrderStatusInput{
		Status:     input.Status,
		VendorNote: input.VendorNote,
	}
	updatedOrder, err := h.orderRepo.UpdateStatus(r.Context(), id, updateInput, &vendorID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Failed to update status")
		return
	}
	writeJSON(w, http.StatusOK, updatedOrder)
}

// --- Vendor Category Management ---

// ListVendorCategories handles GET /api/vendor/categories
// Returns categories owned by the vendor plus system categories (vendor_id IS NULL).
func (h *VendorHandler) ListVendorCategories(w http.ResponseWriter, r *http.Request) {
	vendorID := GetUserID(r)
	categories, err := h.categoryRepo.List(r.Context(), true, &vendorID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Database error")
		return
	}
	writeJSON(w, http.StatusOK, categories)
}

// CreateVendorCategory handles POST /api/vendor/categories
func (h *VendorHandler) CreateVendorCategory(w http.ResponseWriter, r *http.Request) {
	var input models.CreateCategoryInput
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid request body")
		return
	}
	if input.Name == "" || input.Slug == "" {
		writeError(w, http.StatusBadRequest, "bad_request", "Name and slug are required")
		return
	}

	vendorID := GetUserID(r)
	input.VendorID = &vendorID

	category, err := h.categoryRepo.Create(r.Context(), input)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Failed to create category")
		return
	}
	writeJSON(w, http.StatusCreated, category)
}

// UpdateVendorCategory handles PUT /api/vendor/categories/{id}
func (h *VendorHandler) UpdateVendorCategory(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	vendorID := GetUserID(r)

	// Verify ownership
	existing, err := h.categoryRepo.FindByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Database error")
		return
	}
	if existing == nil {
		writeError(w, http.StatusNotFound, "not_found", "Category not found")
		return
	}
	if existing.VendorID == nil || *existing.VendorID != vendorID {
		writeError(w, http.StatusForbidden, "forbidden", "Access denied")
		return
	}

	var input models.UpdateCategoryInput
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid request body")
		return
	}

	category, err := h.categoryRepo.Update(r.Context(), id, input)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Failed to update category")
		return
	}
	writeJSON(w, http.StatusOK, category)
}

// DeleteVendorCategory handles DELETE /api/vendor/categories/{id}
func (h *VendorHandler) DeleteVendorCategory(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	vendorID := GetUserID(r)

	existing, err := h.categoryRepo.FindByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Database error")
		return
	}
	if existing == nil {
		writeError(w, http.StatusNotFound, "not_found", "Category not found")
		return
	}
	if existing.VendorID == nil || *existing.VendorID != vendorID {
		writeError(w, http.StatusForbidden, "forbidden", "Access denied")
		return
	}

	if err := h.categoryRepo.Delete(r.Context(), id); err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Failed to delete category")
		return
	}
	writeMessage(w, http.StatusOK, "Category deleted")
}
