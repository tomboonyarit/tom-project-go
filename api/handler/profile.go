package handler

import (
	"net/http"
	"strings"

	"api/models"
	"api/repository"

	"github.com/jackc/pgx/v5/pgxpool"
)

type ProfileHandler struct {
	pool *pgxpool.Pool
}

func NewProfileHandler(pool *pgxpool.Pool) *ProfileHandler {
	return &ProfileHandler{pool: pool}
}

// Get handles GET /api/profile
func (h *ProfileHandler) Get(w http.ResponseWriter, r *http.Request) {
	vendorID, ok := r.Context().Value(VendorIDKey).(string)
	if !ok {
		errorJSON(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	vendor, err := repository.VendorGetByID(h.pool, vendorID)
	if err != nil {
		errorJSON(w, http.StatusNotFound, "vendor not found")
		return
	}

	writeJSON(w, http.StatusOK, vendor)
}

// Update handles PUT /api/profile
func (h *ProfileHandler) Update(w http.ResponseWriter, r *http.Request) {
	vendorID, ok := r.Context().Value(VendorIDKey).(string)
	if !ok {
		errorJSON(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req models.UpdateVendorProfileRequest
	if err := readJSON(r, &req); err != nil {
		errorJSON(w, http.StatusBadRequest, "invalid request body")
		return
	}

	fields := map[string]interface{}{}
	if strings.TrimSpace(req.Name) != "" {
		fields["name"] = strings.TrimSpace(req.Name)
	}
	if strings.TrimSpace(req.BoothName) != "" {
		fields["booth_name"] = strings.TrimSpace(req.BoothName)
	}
	if strings.TrimSpace(req.PromptpayID) != "" {
		fields["promptpay_id"] = strings.TrimSpace(req.PromptpayID)
	}

	if err := repository.VendorUpdate(h.pool, vendorID, fields); err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to update profile")
		return
	}

	// Return updated vendor
	vendor, err := repository.VendorGetByID(h.pool, vendorID)
	if err != nil {
		errorJSON(w, http.StatusInternalServerError, "profile updated but failed to fetch")
		return
	}

	writeJSON(w, http.StatusOK, vendor)
}
