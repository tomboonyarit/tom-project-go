package handler

import (
	"fmt"
	"net/http"
	"strconv"

	"api/models"
	"api/repository"
)

// AdminHandler handles admin-only endpoints.
type AdminHandler struct {
	userRepo     *repository.UserRepo
	marketRepo   *repository.MarketRepo
	boothRepo    *repository.BoothRepo
	categoryRepo *repository.CategoryRepo
	orderRepo    *repository.OrderRepo
}

// NewAdminHandler creates a new AdminHandler.
func NewAdminHandler(
	userRepo *repository.UserRepo,
	marketRepo *repository.MarketRepo,
	boothRepo *repository.BoothRepo,
	categoryRepo *repository.CategoryRepo,
	orderRepo *repository.OrderRepo,
) *AdminHandler {
	return &AdminHandler{
		userRepo:     userRepo,
		marketRepo:   marketRepo,
		boothRepo:    boothRepo,
		categoryRepo: categoryRepo,
		orderRepo:    orderRepo,
	}
}

// AdminOnly wraps a handler with admin role check.
func AdminOnly(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if GetUserRole(r) != "admin" {
			writeError(w, http.StatusForbidden, "forbidden", "Admin access required")
			return
		}
		next(w, r)
	}
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

// GetDashboard handles GET /api/admin/dashboard
func (h *AdminHandler) GetDashboard(w http.ResponseWriter, r *http.Request) {
	stats, err := h.orderRepo.GetDashboardStats(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Failed to get dashboard stats")
		return
	}
	writeJSON(w, http.StatusOK, stats)
}

// ---------------------------------------------------------------------------
// Market Management
// ---------------------------------------------------------------------------

// ListMarkets handles GET /api/admin/markets
func (h *AdminHandler) ListMarkets(w http.ResponseWriter, r *http.Request) {
	params := parsePagination(r)
	statusStr := parseQueryParam(r, "status")
	var status *models.MarketStatus
	if statusStr != "" {
		s := models.MarketStatus(statusStr)
		status = &s
	}

	markets, total, err := h.marketRepo.List(r.Context(), params, status)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Database error")
		return
	}
	writeJSON(w, http.StatusOK, models.NewPaginatedResponse(markets, total, params))
}

// CreateMarket handles POST /api/admin/markets
func (h *AdminHandler) CreateMarket(w http.ResponseWriter, r *http.Request) {
	var input models.CreateMarketInput
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid request body")
		return
	}

	if input.Status == "" {
		input.Status = models.MarketStatusDraft
	}

	userID := GetUserID(r)
	market, err := h.marketRepo.Create(r.Context(), input, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Failed to create market")
		return
	}
	writeJSON(w, http.StatusCreated, market)
}

// GetMarket handles GET /api/admin/markets/{id}
func (h *AdminHandler) GetMarket(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	market, err := h.marketRepo.FindByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Database error")
		return
	}
	if market == nil {
		writeError(w, http.StatusNotFound, "not_found", "Market not found")
		return
	}
	writeJSON(w, http.StatusOK, market)
}

// UpdateMarket handles PUT /api/admin/markets/{id}
func (h *AdminHandler) UpdateMarket(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var input models.UpdateMarketInput
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid request body")
		return
	}

	market, err := h.marketRepo.Update(r.Context(), id, input)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Failed to update market")
		return
	}
	if market == nil {
		writeError(w, http.StatusNotFound, "not_found", "Market not found")
		return
	}
	writeJSON(w, http.StatusOK, market)
}

// DeleteMarket handles DELETE /api/admin/markets/{id}
func (h *AdminHandler) DeleteMarket(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := h.marketRepo.Delete(r.Context(), id); err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Failed to delete market")
		return
	}
	writeMessage(w, http.StatusOK, "Market deleted")
}

// ---------------------------------------------------------------------------
// Booth Management
// ---------------------------------------------------------------------------

// ListBooths handles GET /api/admin/booths
func (h *AdminHandler) ListBooths(w http.ResponseWriter, r *http.Request) {
	params := parsePagination(r)

	// Parse optional filters
	var marketID, vendorID *string
	var status *models.BoothStatus

	if m := parseQueryParam(r, "market_id"); m != "" {
		marketID = &m
	}
	if v := parseQueryParam(r, "vendor_id"); v != "" {
		vendorID = &v
	}
	if s := parseQueryParam(r, "status"); s != "" {
		st := models.BoothStatus(s)
		status = &st
	}
	search := parseQueryParam(r, "search")

	booths, total, err := h.boothRepo.ListAllBooths(r.Context(), params, marketID, vendorID, status, search)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Database error")
		return
	}
	writeJSON(w, http.StatusOK, models.NewPaginatedResponse(booths, total, params))
}

// UpdateBoothStatus handles PUT /api/admin/booths/{id}/status
func (h *AdminHandler) UpdateBoothStatus(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	var input struct {
		Status models.BoothStatus `json:"status"`
	}
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid request body")
		return
	}

	// Validate allowed status transitions
	allowedStatuses := map[models.BoothStatus]bool{
		models.BoothStatusApproved: true,
		models.BoothStatusRejected: true,
		models.BoothStatusClosed:   true,
	}
	if !allowedStatuses[input.Status] {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid status. Allowed: approved, rejected, closed")
		return
	}

	booth, err := h.boothRepo.UpdateStatus(r.Context(), id, input.Status)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Failed to update booth status")
		return
	}
	if booth == nil {
		writeError(w, http.StatusNotFound, "not_found", "Booth not found")
		return
	}
	writeJSON(w, http.StatusOK, booth)
}

// ---------------------------------------------------------------------------
// User Management
// ---------------------------------------------------------------------------

// ListUsers handles GET /api/admin/users
func (h *AdminHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	params := parsePagination(r)

	var role *models.UserRole
	var isActive *bool

	if rStr := parseQueryParam(r, "role"); rStr != "" {
		rl := models.UserRole(rStr)
		role = &rl
	}
	if aStr := parseQueryParam(r, "is_active"); aStr != "" {
		a, err := strconv.ParseBool(aStr)
		if err == nil {
			isActive = &a
		}
	}
	search := parseQueryParam(r, "search")

	users, total, err := h.userRepo.ListAll(r.Context(), params, role, isActive, search)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Database error")
		return
	}

	// Return safe user responses (no password hash)
	responses := make([]models.UserResponse, 0, len(users))
	for _, u := range users {
		responses = append(responses, u.ToResponse())
	}

	writeJSON(w, http.StatusOK, models.NewPaginatedResponse(responses, total, params))
}

// UpdateUser handles PUT /api/admin/users/{id}
func (h *AdminHandler) UpdateUser(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	var input models.AdminUpdateUserInput
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid request body")
		return
	}

	user, err := h.userRepo.AdminUpdate(r.Context(), id, input)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Failed to update user")
		return
	}
	if user == nil {
		writeError(w, http.StatusNotFound, "not_found", "User not found")
		return
	}
	writeJSON(w, http.StatusOK, user.ToResponse())
}

// ---------------------------------------------------------------------------
// Category Management
// ---------------------------------------------------------------------------

// CreateCategory handles POST /api/admin/categories
func (h *AdminHandler) CreateCategory(w http.ResponseWriter, r *http.Request) {
	var input models.CreateCategoryInput
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid request body")
		return
	}

	if input.Name == "" || input.Slug == "" {
		writeError(w, http.StatusBadRequest, "bad_request", "Name and slug are required")
		return
	}

	category, err := h.categoryRepo.Create(r.Context(), input)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Failed to create category")
		return
	}
	writeJSON(w, http.StatusCreated, category)
}

// UpdateCategory handles PUT /api/admin/categories/{id}
func (h *AdminHandler) UpdateCategory(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

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
	if category == nil {
		writeError(w, http.StatusNotFound, "not_found", "Category not found")
		return
	}
	writeJSON(w, http.StatusOK, category)
}

// DeleteCategory handles DELETE /api/admin/categories/{id}
func (h *AdminHandler) DeleteCategory(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	if err := h.categoryRepo.Delete(r.Context(), id); err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Failed to delete category")
		return
	}
	writeMessage(w, http.StatusOK, "Category deleted")
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

// GetSalesReport handles GET /api/admin/reports/sales
func (h *AdminHandler) GetSalesReport(w http.ResponseWriter, r *http.Request) {
	startDate := parseQueryParam(r, "start_date")
	endDate := parseQueryParam(r, "end_date")

	if startDate == "" || endDate == "" {
		writeError(w, http.StatusBadRequest, "bad_request", "start_date and end_date are required (YYYY-MM-DD)")
		return
	}

	// Validate date format
	if _, err := parseDate(startDate); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", fmt.Sprintf("Invalid start_date: %s", startDate))
		return
	}
	if _, err := parseDate(endDate); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", fmt.Sprintf("Invalid end_date: %s", endDate))
		return
	}

	var marketID, vendorID *string
	if m := parseQueryParam(r, "market_id"); m != "" {
		marketID = &m
	}
	if v := parseQueryParam(r, "vendor_id"); v != "" {
		vendorID = &v
	}

	report, err := h.orderRepo.GetSalesReport(r.Context(), startDate, endDate, marketID, vendorID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Failed to generate sales report")
		return
	}
	writeJSON(w, http.StatusOK, report)
}

// parseDate validates a YYYY-MM-DD date string.
func parseDate(s string) (string, error) {
	if len(s) != 10 {
		return "", fmt.Errorf("invalid date format")
	}
	return s, nil
}
