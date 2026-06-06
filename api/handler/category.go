package handler

import (
	"net/http"
	"strings"

	"api/models"
	"api/repository"

	"github.com/jackc/pgx/v5/pgxpool"
)

type CategoryHandler struct {
	pool *pgxpool.Pool
}

func NewCategoryHandler(pool *pgxpool.Pool) *CategoryHandler {
	return &CategoryHandler{pool: pool}
}

func (h *CategoryHandler) vendorID(r *http.Request) string {
	v, ok := r.Context().Value(VendorIDKey).(string)
	if !ok {
		return ""
	}
	return v
}

func (h *CategoryHandler) List(w http.ResponseWriter, r *http.Request) {
	vendorID := h.vendorID(r)
	categories, err := repository.CategoryList(h.pool, vendorID)
	if err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to list categories")
		return
	}
	writeJSON(w, http.StatusOK, categories)
}

func (h *CategoryHandler) Create(w http.ResponseWriter, r *http.Request) {
	vendorID := h.vendorID(r)
	var req models.CreateCategoryRequest
	if err := readJSON(r, &req); err != nil {
		errorJSON(w, http.StatusBadRequest, "invalid request body")
		return
	}

	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		errorJSON(w, http.StatusBadRequest, "category name is required")
		return
	}

	cat, err := repository.CategoryCreate(h.pool, vendorID, req.Name, req.SortOrder)
	if err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to create category")
		return
	}

	writeJSON(w, http.StatusCreated, cat)
}

func (h *CategoryHandler) Update(w http.ResponseWriter, r *http.Request) {
	vendorID := h.vendorID(r)
	id := r.PathValue("id")
	if id == "" {
		errorJSON(w, http.StatusBadRequest, "missing category id")
		return
	}

	var req models.UpdateCategoryRequest
	if err := readJSON(r, &req); err != nil {
		errorJSON(w, http.StatusBadRequest, "invalid request body")
		return
	}

	name := ""
	if req.Name != nil {
		name = strings.TrimSpace(*req.Name)
		if name == "" {
			errorJSON(w, http.StatusBadRequest, "category name cannot be empty")
			return
		}
	}
	sortOrder := 0
	hasSortOrder := req.SortOrder != nil
	if hasSortOrder {
		sortOrder = *req.SortOrder
	}

	fields := map[string]interface{}{}
	if req.Name != nil {
		fields["name"] = name
	}
	if hasSortOrder {
		fields["sort_order"] = sortOrder
	}

	if err := repository.CategoryUpdate(h.pool, vendorID, id, fields); err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to update category")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "category updated"})
}

func (h *CategoryHandler) Delete(w http.ResponseWriter, r *http.Request) {
	vendorID := h.vendorID(r)
	id := r.PathValue("id")
	if id == "" {
		errorJSON(w, http.StatusBadRequest, "missing category id")
		return
	}

	if err := repository.CategoryDelete(h.pool, vendorID, id); err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to delete category")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "category deleted"})
}
