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

// List handles GET /api/categories
func (h *CategoryHandler) List(w http.ResponseWriter, r *http.Request) {
	categories, err := repository.CategoryList(h.pool)
	if err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to list categories")
		return
	}
	writeJSON(w, http.StatusOK, categories)
}

// Create handles POST /api/categories
func (h *CategoryHandler) Create(w http.ResponseWriter, r *http.Request) {
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

	cat, err := repository.CategoryCreate(h.pool, req.Name, req.SortOrder)
	if err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to create category")
		return
	}

	writeJSON(w, http.StatusCreated, cat)
}

// Update handles PUT /api/categories/{id}
func (h *CategoryHandler) Update(w http.ResponseWriter, r *http.Request) {
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

	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		errorJSON(w, http.StatusBadRequest, "category name is required")
		return
	}

	if err := repository.CategoryUpdate(h.pool, id, req.Name, req.SortOrder); err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to update category")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "category updated"})
}

// Delete handles DELETE /api/categories/{id}
func (h *CategoryHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		errorJSON(w, http.StatusBadRequest, "missing category id")
		return
	}

	if err := repository.CategoryDelete(h.pool, id); err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to delete category")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "category deleted"})
}
