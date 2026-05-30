package handler

import (
	"net/http"

	"api/models"
	"api/repository"
)

type MarketHandler struct {
	marketRepo *repository.MarketRepo
}

func NewMarketHandler(marketRepo *repository.MarketRepo) *MarketHandler {
	return &MarketHandler{marketRepo: marketRepo}
}

// List handles GET /api/markets
func (h *MarketHandler) List(w http.ResponseWriter, r *http.Request) {
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

// GetByID handles GET /api/markets/{id}
func (h *MarketHandler) GetByID(w http.ResponseWriter, r *http.Request) {
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

// Create handles POST /api/markets
func (h *MarketHandler) Create(w http.ResponseWriter, r *http.Request) {
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

// Update handles PUT /api/markets/{id}
func (h *MarketHandler) Update(w http.ResponseWriter, r *http.Request) {
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

// Delete handles DELETE /api/markets/{id}
func (h *MarketHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := h.marketRepo.Delete(r.Context(), id); err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Failed to delete market")
		return
	}
	writeMessage(w, http.StatusOK, "Market deleted")
}
