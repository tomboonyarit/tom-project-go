package handler

import (
	"net/http"
	"regexp"
	"strings"
	"time"

	"api/models"
	"api/repository"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

// AuthHandler handles registration and login.
type AuthHandler struct {
	pool      *pgxpool.Pool
	jwtSecret string
}

func NewAuthHandler(pool *pgxpool.Pool, jwtSecret string) *AuthHandler {
	return &AuthHandler{pool: pool, jwtSecret: jwtSecret}
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req models.RegisterRequest
	if err := readJSON(r, &req); err != nil {
		errorJSON(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Trim spaces
	req.Phone = strings.TrimSpace(req.Phone)
	req.PIN = strings.TrimSpace(req.PIN)
	req.Name = strings.TrimSpace(req.Name)

	// Validate phone: must be 10 digits starting with 0
	phoneRegex := regexp.MustCompile(`^0[0-9]{9}$`)
	if !phoneRegex.MatchString(req.Phone) {
		errorJSON(w, http.StatusBadRequest, "phone must be 10 digits starting with 0")
		return
	}

	// Validate PIN: 6 digits
	pinRegex := regexp.MustCompile(`^[0-9]{6}$`)
	if !pinRegex.MatchString(req.PIN) {
		errorJSON(w, http.StatusBadRequest, "PIN must be 6 digits")
		return
	}

	// Validate name
	if req.Name == "" {
		errorJSON(w, http.StatusBadRequest, "name is required")
		return
	}

	// Check phone not taken
	existing, err := repository.VendorFindByPhone(h.pool, req.Phone)
	if err != nil {
		errorJSON(w, http.StatusInternalServerError, "server error")
		return
	}
	if existing != nil {
		errorJSON(w, http.StatusConflict, "phone already registered")
		return
	}

	// Hash PIN
	hash, err := bcrypt.GenerateFromPassword([]byte(req.PIN), bcrypt.DefaultCost)
	if err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to process password")
		return
	}

	vendor := &models.Vendor{
		Phone:     req.Phone,
		PinHash:   string(hash),
		Name:      req.Name,
		BoothName: req.BoothName,
	}

	if err := repository.VendorCreate(h.pool, vendor); err != nil {
		if strings.Contains(err.Error(), "duplicate key") || strings.Contains(err.Error(), "unique") {
			errorJSON(w, http.StatusConflict, "phone already registered")
		} else {
			errorJSON(w, http.StatusInternalServerError, "failed to create vendor")
		}
		return
	}

	// Generate JWT
	token, err := h.generateToken(vendor.ID)
	if err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to generate token")
		return
	}

	writeJSON(w, http.StatusCreated, models.AuthResponse{
		Vendor: *vendor,
		Token:  token,
	})
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req models.LoginRequest
	if err := readJSON(r, &req); err != nil {
		errorJSON(w, http.StatusBadRequest, "invalid request body")
		return
	}

	req.Phone = strings.TrimSpace(req.Phone)

	vendor, err := repository.VendorFindByPhone(h.pool, req.Phone)
	if err != nil {
		errorJSON(w, http.StatusUnauthorized, "invalid phone or PIN")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(vendor.PinHash), []byte(req.PIN)); err != nil {
		errorJSON(w, http.StatusUnauthorized, "invalid phone or PIN")
		return
	}

	token, err := h.generateToken(vendor.ID)
	if err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to generate token")
		return
	}

	writeJSON(w, http.StatusOK, models.AuthResponse{
		Vendor: *vendor,
		Token:  token,
	})
}

func (h *AuthHandler) generateToken(vendorID string) (string, error) {
	claims := jwt.MapClaims{
		"vendor_id": vendorID,
		"exp":       time.Now().Add(72 * time.Hour).Unix(),
		"iat":       time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(h.jwtSecret))
}
