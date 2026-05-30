package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"api/models"
)

// Helpers for JSON responses

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if data != nil {
		json.NewEncoder(w).Encode(data)
	}
}

func writeError(w http.ResponseWriter, status int, err string, msg string) {
	writeJSON(w, status, models.NewErrorResponse(err, msg))
}

func writeMessage(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, models.NewMessageResponse(msg))
}

func decodeJSON(r *http.Request, v interface{}) error {
	defer r.Body.Close()
	return json.NewDecoder(r.Body).Decode(v)
}

// parsePagination extracts pagination params from query string.
func parsePagination(r *http.Request) models.PaginationParams {
	params := models.DefaultPagination()
	if p := r.URL.Query().Get("page"); p != "" {
		if i, err := strconv.Atoi(p); err == nil && i > 0 {
			params.Page = i
		}
	}
	if s := r.URL.Query().Get("page_size"); s != "" {
		if i, err := strconv.Atoi(s); err == nil && i > 0 && i <= 100 {
			params.PageSize = i
		}
	}
	return params
}

// parseQueryParam extracts a query parameter value by key.
func parseQueryParam(r *http.Request, key string) string {
	return r.URL.Query().Get(key)
}

// Context key type for user claims
type contextKey string

const (
	ContextKeyUserID   contextKey = "user_id"
	ContextKeyUserRole contextKey = "user_role"
)
