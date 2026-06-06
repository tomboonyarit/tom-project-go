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

func (h *TagHandler) vendorID(r *http.Request) string {
	return r.Context().Value(VendorIDKey).(string)
}

func (h *TagHandler) List(w http.ResponseWriter, r *http.Request) {
	vendorID := h.vendorID(r)
	tags, err := repository.TagList(h.pool, vendorID)
	if err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to list tags")
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"tags": tags})
}

func (h *TagHandler) Create(w http.ResponseWriter, r *http.Request) {
	vendorID := h.vendorID(r)
	var req struct {
		Name string `json:"name"`
	}
	if err := readJSON(r, &req); err != nil || req.Name == "" {
		errorJSON(w, http.StatusBadRequest, "name is required")
		return
	}
	tag, err := repository.TagCreate(h.pool, vendorID, req.Name)
	if err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to create tag")
		return
	}
	writeJSON(w, http.StatusCreated, tag)
}

func (h *TagHandler) Update(w http.ResponseWriter, r *http.Request) {
	vendorID := h.vendorID(r)
	id := r.PathValue("id")
	var req struct {
		Name      string `json:"name"`
		SortOrder *int   `json:"sort_order"`
	}
	if err := readJSON(r, &req); err != nil {
		errorJSON(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Name == "" {
		errorJSON(w, http.StatusBadRequest, "name is required")
		return
	}
	sortOrder := 0
	if req.SortOrder != nil {
		sortOrder = *req.SortOrder
	}
	tag, err := repository.TagUpdate(h.pool, vendorID, id, req.Name, sortOrder)
	if err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to update tag")
		return
	}
	writeJSON(w, http.StatusOK, tag)
}

func (h *TagHandler) Delete(w http.ResponseWriter, r *http.Request) {
	vendorID := h.vendorID(r)
	id := r.PathValue("id")
	if err := repository.TagDelete(h.pool, vendorID, id); err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to delete tag")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"success": true})
}
