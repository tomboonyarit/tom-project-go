package handler

import (
	"net/http"

	"api/models"
	"api/repository"
)

type ProductHandler struct {
	productRepo  *repository.ProductRepo
	categoryRepo *repository.CategoryRepo
}

func NewProductHandler(productRepo *repository.ProductRepo, categoryRepo *repository.CategoryRepo) *ProductHandler {
	return &ProductHandler{
		productRepo:  productRepo,
		categoryRepo: categoryRepo,
	}
}

// --- Categories ---

// ListCategories handles GET /api/categories
func (h *ProductHandler) ListCategories(w http.ResponseWriter, r *http.Request) {
	categories, err := h.categoryRepo.List(r.Context(), true, nil)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Database error")
		return
	}
	writeJSON(w, http.StatusOK, categories)
}

// --- Products ---

// ListByBooth handles GET /api/booths/{boothId}/products
func (h *ProductHandler) ListByBooth(w http.ResponseWriter, r *http.Request) {
	boothID := r.PathValue("boothId")
	params := parsePagination(r)
	availableOnly := parseQueryParam(r, "available") != "false"

	products, total, err := h.productRepo.ListByBooth(r.Context(), boothID, params, availableOnly)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Database error")
		return
	}
	writeJSON(w, http.StatusOK, models.NewPaginatedResponse(products, total, params))
}

// GetProduct handles GET /api/products/{id}
func (h *ProductHandler) GetProduct(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	product, err := h.productRepo.FindByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Database error")
		return
	}
	if product == nil {
		writeError(w, http.StatusNotFound, "not_found", "Product not found")
		return
	}
	writeJSON(w, http.StatusOK, product)
}

// CreateProduct handles POST /api/booths/{boothId}/products
func (h *ProductHandler) CreateProduct(w http.ResponseWriter, r *http.Request) {
	var input models.CreateProductInput
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid request body")
		return
	}

	input.BoothID = r.PathValue("boothId")
	userID := GetUserID(r)

	product, err := h.productRepo.Create(r.Context(), input, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Failed to create product")
		return
	}
	writeJSON(w, http.StatusCreated, product)
}

// UpdateProduct handles PUT /api/products/{id}
func (h *ProductHandler) UpdateProduct(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var input models.UpdateProductInput
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid request body")
		return
	}

	product, err := h.productRepo.Update(r.Context(), id, input)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Failed to update product")
		return
	}
	if product == nil {
		writeError(w, http.StatusNotFound, "not_found", "Product not found")
		return
	}
	writeJSON(w, http.StatusOK, product)
}

// DeleteProduct handles DELETE /api/products/{id}
func (h *ProductHandler) DeleteProduct(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := h.productRepo.Delete(r.Context(), id); err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Failed to delete product")
		return
	}
	writeMessage(w, http.StatusOK, "Product deleted")
}
