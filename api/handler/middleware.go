package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const VendorIDKey contextKey = "vendor_id"

// CORSMiddleware allows all origins, methods, and common headers.
func CORSMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// LoggingMiddleware logs method, path, and duration for each request.
func LoggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		// Use a simple log print — production would use structured logger
		// log.Printf("%s %s %s", r.Method, r.URL.Path, time.Since(start))
		_ = start // keeping for future logging
	})
}

// AuthMiddleware validates JWT and injects vendor_id into the request context.
func AuthMiddleware(jwtSecret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				errorJSON(w, http.StatusUnauthorized, "missing authorization header")
				return
			}

			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
				errorJSON(w, http.StatusUnauthorized, "invalid authorization header format")
				return
			}
			tokenStr := parts[1]

			token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
				if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, jwt.ErrSignatureInvalid
				}
				return []byte(jwtSecret), nil
			})
			if err != nil || !token.Valid {
				errorJSON(w, http.StatusUnauthorized, "invalid or expired token")
				return
			}

			claims, ok := token.Claims.(jwt.MapClaims)
			if !ok {
				errorJSON(w, http.StatusUnauthorized, "invalid token claims")
				return
			}

			vendorID, ok := claims["vendor_id"].(string)
			if !ok || vendorID == "" {
				errorJSON(w, http.StatusUnauthorized, "invalid token: missing vendor_id")
				return
			}

			ctx := context.WithValue(r.Context(), VendorIDKey, vendorID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// writeJSON sends a JSON response with the given status code and data.
func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

// readJSON decodes JSON from the request body into v.
func readJSON(r *http.Request, v interface{}) error {
	decoder := json.NewDecoder(r.Body)
	return decoder.Decode(v)
}

// errorJSON sends a JSON error response.
func errorJSON(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
