package handler

import (
	"net/http"

	"api/models"
	"api/repository"

	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	userRepo *repository.UserRepo
}

func NewAuthHandler(userRepo *repository.UserRepo) *AuthHandler {
	return &AuthHandler{userRepo: userRepo}
}

// Register handles POST /api/auth/register
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var input models.CreateUserInput
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid request body")
		return
	}

	if input.Email == "" || input.Password == "" || input.Name == "" {
		writeError(w, http.StatusBadRequest, "bad_request", "Email, password, and name are required")
		return
	}

	// Check if email already exists
	existing, err := h.userRepo.FindByEmail(r.Context(), input.Email)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Database error")
		return
	}
	if existing != nil {
		writeError(w, http.StatusConflict, "conflict", "Email already registered")
		return
	}

	// Hash password
	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Failed to hash password")
		return
	}

	// Default role
	if input.Role == "" {
		input.Role = models.UserRoleCustomer
	}

	user, err := h.userRepo.Create(r.Context(), input, string(hashedBytes))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Failed to create user")
		return
	}

	// Generate token
	token, err := GenerateToken(user.ID, string(user.Role))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Failed to generate token")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"user":  user.ToResponse(),
		"token": token,
	})
}

// Login handles POST /api/auth/login
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid request body")
		return
	}

	if input.Email == "" || input.Password == "" {
		writeError(w, http.StatusBadRequest, "bad_request", "Email and password are required")
		return
	}

	user, err := h.userRepo.FindByEmail(r.Context(), input.Email)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Database error")
		return
	}
	if user == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Invalid email or password")
		return
	}

	if !user.IsActive {
		writeError(w, http.StatusForbidden, "forbidden", "Account is deactivated")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.Password)); err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Invalid email or password")
		return
	}

	token, err := GenerateToken(user.ID, string(user.Role))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Failed to generate token")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"user":  user.ToResponse(),
		"token": token,
	})
}
