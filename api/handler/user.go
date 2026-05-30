package handler

import (
	"net/http"

	"api/models"
	"api/repository"
)

type UserHandler struct {
	userRepo *repository.UserRepo
}

func NewUserHandler(userRepo *repository.UserRepo) *UserHandler {
	return &UserHandler{userRepo: userRepo}
}

// GetProfile handles GET /api/users/me
func (h *UserHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	userID := GetUserID(r)
	user, err := h.userRepo.FindByID(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Database error")
		return
	}
	if user == nil {
		writeError(w, http.StatusNotFound, "not_found", "User not found")
		return
	}
	writeJSON(w, http.StatusOK, user.ToResponse())
}

// UpdateProfile handles PUT /api/users/me
func (h *UserHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	var input models.UpdateUserInput
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid request body")
		return
	}

	userID := GetUserID(r)
	user, err := h.userRepo.Update(r.Context(), userID, input)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Failed to update profile")
		return
	}
	writeJSON(w, http.StatusOK, user.ToResponse())
}
