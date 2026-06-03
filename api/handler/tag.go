package handler

import (
	"net/http"

	"api/repository"

	"github.com/jackc/pgx/v5/pgxpool"
)

type TagHandler struct {
	pool *pgxpool.Pool
}

func NewTagHandler(pool *pgxpool.Pool) *TagHandler {
	return &TagHandler{pool: pool}
}

// List returns all customer tags
// GET /api/tags
func (h *TagHandler) List(w http.ResponseWriter, r *http.Request) {
	tags, err := repository.TagList(h.pool)
	if err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to list tags")
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"tags": tags})
}

// Create adds a new customer tag
// POST /api/tags
func (h *TagHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name string `json:"name"`
	}
	if err := readJSON(r, &req); err != nil || req.Name == "" {
		errorJSON(w, http.StatusBadRequest, "name is required")
		return
	}
	tag, err := repository.TagCreate(h.pool, req.Name)
	if err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to create tag")
		return
	}
	writeJSON(w, http.StatusCreated, tag)
}

// Delete removes a customer tag
// DELETE /api/tags/{id}
func (h *TagHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := repository.TagDelete(h.pool, id); err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to delete tag")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"success": true})
}
