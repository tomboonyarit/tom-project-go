package handler

import (
	"net/http"
	"strings"

	"api/models"
	"api/repository"

	"github.com/jackc/pgx/v5/pgxpool"
)

type ProductHandler struct {
	pool *pgxpool.Pool
}

func NewProductHandler(pool *pgxpool.Pool) *ProductHandler {
	return &ProductHandler{pool: pool}
}

func (h *ProductHandler) vendorID(r *http.Request) string {
	v, ok := r.Context().Value(VendorIDKey).(string)
	if !ok {
		return ""
	}
	return v
}

func (h *ProductHandler) List(w http.ResponseWriter, r *http.Request) {
	vendorID := h.vendorID(r)
	filter := repository.ProductFilter{
		VendorID: vendorID,
		Search:   r.URL.Query().Get("search"),
	}
	if catID := r.URL.Query().Get("category_id"); catID != "" {
		filter.CategoryID = &catID
	}

	products, err := repository.ProductList(h.pool, filter)
	if err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to list products")
		return
	}

	writeJSON(w, http.StatusOK, products)
}

func (h *ProductHandler) Create(w http.ResponseWriter, r *http.Request) {
	vendorID := h.vendorID(r)
	var req models.CreateProductRequest
	if err := readJSON(r, &req); err != nil {
		errorJSON(w, http.StatusBadRequest, "invalid request body")
		return
	}

	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		errorJSON(w, http.StatusBadRequest, "product name is required")
		return
	}
	if req.Price <= 0 {
		errorJSON(w, http.StatusBadRequest, "price must be greater than 0")
		return
	}
	if req.Unit == "" {
		req.Unit = "ชิ้น"
	}
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	p := &models.Product{
		CategoryID: req.CategoryID,
		Name:       req.Name,
		Price:      req.Price,
		Unit:       req.Unit,
		ImageURL:   req.ImageURL,
		IsActive:   isActive,
	}

	if err := repository.ProductCreate(h.pool, vendorID, p); err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to create product")
		return
	}

	writeJSON(w, http.StatusCreated, p)
}

func (h *ProductHandler) QuickCreate(w http.ResponseWriter, r *http.Request) {
	vendorID := h.vendorID(r)
	var req models.QuickCreateProductRequest
	if err := readJSON(r, &req); err != nil {
		errorJSON(w, http.StatusBadRequest, "invalid request body")
		return
	}

	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		errorJSON(w, http.StatusBadRequest, "product name is required")
		return
	}
	if req.Price <= 0 {
		errorJSON(w, http.StatusBadRequest, "price must be greater than 0")
		return
	}

	p, err := repository.ProductQuickCreate(h.pool, vendorID, req.Name, req.Price)
	if err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to create product")
		return
	}

	writeJSON(w, http.StatusCreated, p)
}

func (h *ProductHandler) Update(w http.ResponseWriter, r *http.Request) {
	vendorID := h.vendorID(r)
	id := r.PathValue("id")
	if id == "" {
		errorJSON(w, http.StatusBadRequest, "missing product id")
		return
	}

	var req models.UpdateProductRequest
	if err := readJSON(r, &req); err != nil {
		errorJSON(w, http.StatusBadRequest, "invalid request body")
		return
	}

	fields := map[string]interface{}{}
	if req.Name != nil {
		fields["name"] = *req.Name
	}
	if req.Price != nil {
		fields["price"] = *req.Price
	}
	if req.Unit != nil {
		fields["unit"] = *req.Unit
	}
	if req.CategoryID != nil {
		fields["category_id"] = *req.CategoryID
	}
	if req.ImageURL != nil {
		fields["image_url"] = *req.ImageURL
	}
	if req.IsActive != nil {
		fields["is_active"] = *req.IsActive
	}

	if err := repository.ProductUpdate(h.pool, vendorID, id, fields); err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to update product")
		return
	}

	product, err := repository.ProductGetByID(h.pool, vendorID, id)
	if err != nil {
		errorJSON(w, http.StatusInternalServerError, "product updated but failed to fetch")
		return
	}

	writeJSON(w, http.StatusOK, product)
}

func (h *ProductHandler) Delete(w http.ResponseWriter, r *http.Request) {
	vendorID := h.vendorID(r)
	id := r.PathValue("id")
	if id == "" {
		errorJSON(w, http.StatusBadRequest, "missing product id")
		return
	}

	if err := repository.ProductDelete(h.pool, vendorID, id); err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to delete product")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "product deleted"})
}
