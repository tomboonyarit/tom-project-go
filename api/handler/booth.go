package handler

import (
	"net/http"

	"api/models"
	"api/repository"
)

type BoothHandler struct {
	boothRepo *repository.BoothRepo
}

func NewBoothHandler(boothRepo *repository.BoothRepo) *BoothHandler {
	return &BoothHandler{boothRepo: boothRepo}
}

// ListByMarket handles GET /api/markets/{marketId}/booths
func (h *BoothHandler) ListByMarket(w http.ResponseWriter, r *http.Request) {
	marketID := r.PathValue("marketId")
	statusStr := parseQueryParam(r, "status")
	var status *models.BoothStatus
	if statusStr != "" {
		s := models.BoothStatus(statusStr)
		status = &s
	}

	booths, err := h.boothRepo.ListByMarket(r.Context(), marketID, status)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Database error")
		return
	}
	writeJSON(w, http.StatusOK, booths)
}

// GetByID handles GET /api/booths/{id}
func (h *BoothHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	booth, err := h.boothRepo.FindByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Database error")
		return
	}
	if booth == nil {
		writeError(w, http.StatusNotFound, "not_found", "Booth not found")
		return
	}
	writeJSON(w, http.StatusOK, booth)
}

// Create handles POST /api/markets/{marketId}/booths
func (h *BoothHandler) Create(w http.ResponseWriter, r *http.Request) {
	var input models.CreateBoothInput
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid request body")
		return
	}

	input.MarketID = r.PathValue("marketId")
	userID := GetUserID(r)

	booth, err := h.boothRepo.Create(r.Context(), input, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Failed to create booth")
		return
	}
	writeJSON(w, http.StatusCreated, booth)
}

// Update handles PUT /api/booths/{id}
func (h *BoothHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var input models.UpdateBoothInput
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid request body")
		return
	}

	existing, err := h.boothRepo.FindByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Database error")
		return
	}
	if existing == nil {
		writeError(w, http.StatusNotFound, "not_found", "Booth not found")
		return
	}
	if existing.VendorID != GetUserID(r) {
		writeError(w, http.StatusForbidden, "forbidden", "This booth does not belong to you")
		return
	}

	booth, err := h.boothRepo.Update(r.Context(), id, input)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Failed to update booth")
		return
	}
	writeJSON(w, http.StatusOK, booth)
}

// Delete handles DELETE /api/booths/{id}
func (h *BoothHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	existing, err := h.boothRepo.FindByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Database error")
		return
	}
	if existing == nil {
		writeError(w, http.StatusNotFound, "not_found", "Booth not found")
		return
	}
	if existing.VendorID != GetUserID(r) {
		writeError(w, http.StatusForbidden, "forbidden", "This booth does not belong to you")
		return
	}

	if err := h.boothRepo.Delete(r.Context(), id); err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Failed to delete booth")
		return
	}
	writeMessage(w, http.StatusOK, "Booth deleted")
}
