package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"api/models"

	"github.com/golang-jwt/jwt/v5"
)

// ── Helper Functions ─────────────────────────────────────────────────────

func generateTestToken(vendorID string, secret string, expiry time.Duration) string {
	claims := jwt.MapClaims{
		"vendor_id": vendorID,
		"exp":       time.Now().Add(expiry).Unix(),
		"iat":       time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, _ := token.SignedString([]byte(secret))
	return signed
}

func jsonBody(obj interface{}) *bytes.Buffer {
	b := &bytes.Buffer{}
	json.NewEncoder(b).Encode(obj)
	return b
}

func decodeJSON(t *testing.T, resp *http.Response, target interface{}) {
	t.Helper()
	if err := json.NewDecoder(resp.Body).Decode(target); err != nil {
		t.Fatalf("decode response: %v", err)
	}
}

// ── Auth Middleware Tests ─────────────────────────────────────────────────

func TestAuthMiddleware_ValidToken(t *testing.T) {
	secret := "test-jwt-secret"
	authMW := AuthMiddleware(secret)

	handler := authMW(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		vendorID, ok := r.Context().Value(VendorIDKey).(string)
		if !ok || vendorID == "" {
			http.Error(w, "no vendor_id", http.StatusUnauthorized)
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"vendor_id": vendorID})
	}))

	token := generateTestToken("vendor-123", secret, 1*time.Hour)

	req := httptest.NewRequest("GET", "/api/test", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	var body map[string]string
	decodeJSON(t, rec.Result(), &body)
	if body["vendor_id"] != "vendor-123" {
		t.Errorf("expected vendor_id=vendor-123, got %s", body["vendor_id"])
	}
}

func TestAuthMiddleware_MissingToken(t *testing.T) {
	secret := "test-jwt-secret"
	authMW := AuthMiddleware(secret)

	handler := authMW(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("handler should not be called when token is missing")
	}))

	req := httptest.NewRequest("GET", "/api/test", nil)
	// No Authorization header
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rec.Code)
	}

	var body map[string]string
	decodeJSON(t, rec.Result(), &body)
	if body["error"] == "" {
		t.Error("expected error message in response")
	}
}

func TestAuthMiddleware_ExpiredToken(t *testing.T) {
	secret := "test-jwt-secret"
	authMW := AuthMiddleware(secret)

	handler := authMW(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("handler should not be called for expired token")
	}))

	// Token expired 1 hour ago
	token := generateTestToken("vendor-123", secret, -1*time.Hour)

	req := httptest.NewRequest("GET", "/api/test", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestAuthMiddleware_MalformedToken(t *testing.T) {
	secret := "test-jwt-secret"
	authMW := AuthMiddleware(secret)

	handler := authMW(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("handler should not be called for malformed token")
	}))

	tests := []struct {
		name  string
		token string
	}{
		{"not a jwt", "not-a-jwt-token"},
		{"empty string", ""},
		{"three parts but bad", "a.b.c"},
		{"only one part", "abc123"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", "/api/test", nil)
			if tt.token != "" {
				req.Header.Set("Authorization", "Bearer "+tt.token)
			}
			rec := httptest.NewRecorder()
			handler.ServeHTTP(rec, req)

			if rec.Code != http.StatusUnauthorized {
				t.Errorf("expected 401 for %q, got %d: %s", tt.name, rec.Code, rec.Body.String())
			}
		})
	}
}

func TestAuthMiddleware_InvalidHeaderFormat(t *testing.T) {
	secret := "test-jwt-secret"
	authMW := AuthMiddleware(secret)

	handler := authMW(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("handler should not be called for invalid header")
	}))

	tests := []struct {
		name  string
		value string
	}{
		{"Basic auth", "Basic dXNlcjpwYXNz"},
		{"no Bearer prefix", "token123"},
		{"empty Bearer", "Bearer "},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", "/api/test", nil)
			req.Header.Set("Authorization", tt.value)
			rec := httptest.NewRecorder()
			handler.ServeHTTP(rec, req)

			if rec.Code != http.StatusUnauthorized {
				t.Errorf("expected 401 for %q, got %d", tt.name, rec.Code)
			}
		})
	}
}

func TestAuthMiddleware_DifferentSecret(t *testing.T) {
	// Token signed with different secret should be rejected
	authMW := AuthMiddleware("real-secret")

	handler := authMW(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("handler should not be called for wrong-secret token")
	}))

	token := generateTestToken("vendor-123", "wrong-secret", 1*time.Hour)

	req := httptest.NewRequest("GET", "/api/test", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 for wrong secret, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestAuthMiddleware_TokenWithoutVendorID(t *testing.T) {
	secret := "test-jwt-secret"
	authMW := AuthMiddleware(secret)

	handler := authMW(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("handler should not be called for token without vendor_id")
	}))

	// Create token without vendor_id claim
	claims := jwt.MapClaims{
		"exp": time.Now().Add(1 * time.Hour).Unix(),
		"iat": time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, _ := token.SignedString([]byte(secret))

	req := httptest.NewRequest("GET", "/api/test", nil)
	req.Header.Set("Authorization", "Bearer "+signed)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 for token without vendor_id, got %d", rec.Code)
	}
}

// ── writeJSON / errorJSON Tests ──────────────────────────────────────────

func TestWriteJSON(t *testing.T) {
	rec := httptest.NewRecorder()
	data := map[string]string{"message": "ok"}
	writeJSON(rec, http.StatusCreated, data)

	if rec.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d", rec.Code)
	}

	ct := rec.Header().Get("Content-Type")
	if ct != "application/json" {
		t.Errorf("expected Content-Type application/json, got %s", ct)
	}

	var result map[string]string
	decodeJSON(t, rec.Result(), &result)
	if result["message"] != "ok" {
		t.Errorf("expected message=ok, got %s", result["message"])
	}
}

func TestErrorJSON(t *testing.T) {
	rec := httptest.NewRecorder()
	errorJSON(rec, http.StatusBadRequest, "something went wrong")

	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rec.Code)
	}

	var result map[string]string
	decodeJSON(t, rec.Result(), &result)
	if result["error"] != "something went wrong" {
		t.Errorf("expected error message, got %q", result["error"])
	}
}

func TestReadJSON_Valid(t *testing.T) {
	type testReq struct {
		Name string `json:"name"`
		Age  int    `json:"age"`
	}

	body := bytes.NewBufferString(`{"name":"John","age":30}`)
	req := httptest.NewRequest("POST", "/test", body)

	var reqData testReq
	err := readJSON(req, &reqData)
	if err != nil {
		t.Fatalf("readJSON failed: %v", err)
	}
	if reqData.Name != "John" {
		t.Errorf("expected Name=John, got %s", reqData.Name)
	}
	if reqData.Age != 30 {
		t.Errorf("expected Age=30, got %d", reqData.Age)
	}
}

func TestReadJSON_Invalid(t *testing.T) {
	body := bytes.NewBufferString(`not-valid-json`)
	req := httptest.NewRequest("POST", "/test", body)

	var reqData map[string]interface{}
	err := readJSON(req, &reqData)
	if err == nil {
		t.Error("expected error for invalid JSON")
	}
}

// ── CORS Middleware Tests ─────────────────────────────────────────────────

func TestCORSMiddleware_Options(t *testing.T) {
	var finalHandler http.Handler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("handler should not be called for OPTIONS request")
	})
	finalHandler = CORSMiddleware(finalHandler)

	req := httptest.NewRequest("OPTIONS", "/api/test", nil)
	rec := httptest.NewRecorder()
	finalHandler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected 200 for OPTIONS, got %d", rec.Code)
	}

	origin := rec.Header().Get("Access-Control-Allow-Origin")
	if origin != "*" {
		t.Errorf("expected Access-Control-Allow-Origin: *, got %s", origin)
	}
}

func TestCORSMiddleware_HeadersSet(t *testing.T) {
	var finalHandler http.Handler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	finalHandler = CORSMiddleware(finalHandler)

	req := httptest.NewRequest("GET", "/api/test", nil)
	rec := httptest.NewRecorder()
	finalHandler.ServeHTTP(rec, req)

	headers := map[string]string{
		"Access-Control-Allow-Origin":  "*",
		"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type, Authorization",
	}

	for key, expected := range headers {
		got := rec.Header().Get(key)
		if got != expected {
			t.Errorf("expected %s: %s, got %s", key, expected, got)
		}
	}
}

// ── Context Key Tests ────────────────────────────────────────────────────

func TestVendorIDKey(t *testing.T) {
	ctx := context.WithValue(context.Background(), VendorIDKey, "vendor-456")
	val, ok := ctx.Value(VendorIDKey).(string)
	if !ok {
		t.Fatal("VendorIDKey not found in context")
	}
	if val != "vendor-456" {
		t.Errorf("expected vendor-456, got %s", val)
	}
}

func TestVendorIDKey_NotFound(t *testing.T) {
	ctx := context.Background()
	val := ctx.Value(VendorIDKey)
	if val != nil {
		t.Errorf("expected nil for missing VendorIDKey, got %v", val)
	}
}

// ── Logging Middleware Tests ──────────────────────────────────────────────

func TestLoggingMiddleware_PassesThrough(t *testing.T) {
	var finalHandler http.Handler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusAccepted)
		_, _ = w.Write([]byte(`{"ok":true}`))
	})
	finalHandler = LoggingMiddleware(finalHandler)

	req := httptest.NewRequest("POST", "/api/test", bytes.NewBufferString(`{"data":"test"}`))
	rec := httptest.NewRecorder()
	finalHandler.ServeHTTP(rec, req)

	if rec.Code != http.StatusAccepted {
		t.Errorf("expected 202, got %d", rec.Code)
	}
	if rec.Body.String() != `{"ok":true}` {
		t.Errorf("expected body {\"ok\":true}, got %s", rec.Body.String())
	}
}

// ── Report Handler Validation Tests (no DB needed) ───────────────────────

func TestDailyReportHandler_MissingDate(t *testing.T) {
	// Test validation — handler returns error before DB call on missing date
	// We don't need a real pool to test this, but handler needs a pool
	// We test the validation by constructing a request that would fail validation
	// Since the handler calls repository.DailyReport which needs a pool,
	// we need to create a handler with a real pool to test.
	// Skipped without DB — marked as integration test aspect.
	t.Skip("requires database — run with go test -tags=integration")
}

// ── Request Validation Type Tests ────────────────────────────────────────

func TestRegisterRequest_MissingFields(t *testing.T) {
	tests := []struct {
		name    string
		json    string
		wantErr string
	}{
		{"missing phone", `{"pin":"123456","name":"Test"}`, "phone"},
		{"missing PIN", `{"phone":"0812345678","name":"Test"}`, "pin"},
		{"missing name", `{"phone":"0812345678","pin":"123456"}`, "name"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var req models.RegisterRequest
			err := json.Unmarshal([]byte(tt.json), &req)
			if err != nil {
				if tt.wantErr == "json" {
					return // expected
				}
				t.Fatalf("unmarshal failed: %v", err)
			}
			// Verify zero values are set for missing fields
			switch tt.wantErr {
			case "phone":
				if req.Phone != "" {
					t.Error("expected empty phone")
				}
			case "pin":
				if req.PIN != "" {
					t.Error("expected empty pin")
				}
			case "name":
				if req.Name != "" {
					t.Error("expected empty name")
				}
			}
		})
	}
}

// ── Status Transition Validation (Logic Test without DB) ─────────────────

func TestValidStatusTransitions(t *testing.T) {
	// Replicate the validStatusTransitions map from order_repo.go
	transitions := map[string][]string{
		"new":       {"preparing", "cancelled"},
		"preparing": {"paid", "cancelled"},
		"paid":      {"completed", "cancelled"},
		"completed": {},
		"cancelled": {},
	}

	validTests := []struct {
		from, to string
	}{
		{"new", "preparing"},
		{"new", "cancelled"},
		{"preparing", "paid"},
		{"preparing", "cancelled"},
		{"paid", "completed"},
		{"paid", "cancelled"},
	}

	invalidTests := []struct {
		from, to string
	}{
		{"new", "completed"},
		{"new", "paid"},
		{"preparing", "completed"},
		{"preparing", "new"},
		{"paid", "new"},
		{"paid", "preparing"},
		{"completed", "new"},
		{"completed", "preparing"},
		{"completed", "paid"},
		{"completed", "cancelled"},
		{"cancelled", "new"},
		{"cancelled", "preparing"},
		{"cancelled", "paid"},
		{"cancelled", "completed"},
	}

	for _, tt := range validTests {
		t.Run("valid:"+tt.from+"→"+tt.to, func(t *testing.T) {
			allowed := transitions[tt.from]
			found := false
			for _, s := range allowed {
				if s == tt.to {
					found = true
					break
				}
			}
			if !found {
				t.Errorf("transition %s → %s should be valid", tt.from, tt.to)
			}
		})
	}

	for _, tt := range invalidTests {
		t.Run("invalid:"+tt.from+"→"+tt.to, func(t *testing.T) {
			allowed := transitions[tt.from]
			found := false
			for _, s := range allowed {
				if s == tt.to {
					found = true
					break
				}
			}
			if found {
				t.Errorf("transition %s → %s should be invalid", tt.from, tt.to)
			}
		})
	}
}

// ── Order Number Format Validation ───────────────────────────────────────

func TestOrderNumberFormat(t *testing.T) {
	now := time.Now()
	datePrefix := now.Format("060102") // YYMMDD

	// Test format: POS-YYMMDD-NNNN
	orderNo := "POS-" + datePrefix + "-" + "0001"

	if len(orderNo) != 15 {
		t.Errorf("order number length: expected 15, got %d: %s", len(orderNo), orderNo)
	}

	// Check prefix
	if orderNo[:4] != "POS-" {
		t.Errorf("order number should start with POS-, got %s", orderNo[:4])
	}

	// Check date part (6 chars after POS-)
	if len(orderNo[4:10]) != 6 {
		t.Errorf("date part should be 6 chars, got %s", orderNo[4:10])
	}

	// Check dash separator
	if orderNo[10] != '-' {
		t.Errorf("expected dash after date part")
	}

	// Check sequence (4 digits)
	seq := orderNo[11:]
	if len(seq) != 4 {
		t.Errorf("sequence should be 4 digits, got %s", seq)
	}
}

// ── JWT Signing Method Validation ────────────────────────────────────────

func TestJWTSigningMethod(t *testing.T) {
	secret := "test-secret"

	// HS256 (valid)
	tokenHS := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"vendor_id": "v-001",
		"exp":       time.Now().Add(1 * time.Hour).Unix(),
	})
	signedHS, err := tokenHS.SignedString([]byte(secret))
	if err != nil {
		t.Fatalf("sign HS256: %v", err)
	}

	// Verify
	parsed, err := jwt.Parse(signedHS, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			t.Error("expected HMAC signing method")
		}
		return []byte(secret), nil
	})
	if err != nil {
		t.Fatalf("parse HS256 token: %v", err)
	}
	if !parsed.Valid {
		t.Error("token should be valid")
	}
}

// ── Boundary Value Tests ─────────────────────────────────────────────────

func TestBoundaryValues_RequestTypes(t *testing.T) {
	t.Run("CreateOrderRequest with zero discount", func(t *testing.T) {
		req := models.CreateOrderRequest{
			Items:    []models.CreateOrderItem{{ProductID: "p-1", Qty: 1}},
			Discount: 0,
		}
		if req.Discount != 0 {
			t.Errorf("expected discount 0, got %d", req.Discount)
		}
	})

	t.Run("CreateOrderRequest with negative discount", func(t *testing.T) {
		req := models.CreateOrderRequest{
			Items:    []models.CreateOrderItem{{ProductID: "p-1", Qty: 1}},
			Discount: -100,
		}
		// Negative discount is allowed at struct level; handler/repo handle it
		if req.Discount != -100 {
			t.Errorf("expected discount -100, got %d", req.Discount)
		}
	})

	t.Run("CreateOrderRequest empty items", func(t *testing.T) {
		req := models.CreateOrderRequest{
			Items: []models.CreateOrderItem{},
		}
		if len(req.Items) != 0 {
			t.Errorf("expected 0 items, got %d", len(req.Items))
		}
	})

	t.Run("UpdateStatusRequest with empty status", func(t *testing.T) {
		req := models.UpdateStatusRequest{}
		if req.Status != "" {
			t.Errorf("expected empty status, got %s", req.Status)
		}
	})
}

// ── ErrorJSON Format Consistency ─────────────────────────────────────────

func TestErrorJSON_Format(t *testing.T) {
	testCases := []struct {
		status int
		msg    string
	}{
		{400, "bad request"},
		{401, "unauthorized"},
		{404, "not found"},
		{500, "internal server error"},
	}

	for _, tc := range testCases {
		rec := httptest.NewRecorder()
		errorJSON(rec, tc.status, tc.msg)

		if rec.Code != tc.status {
			t.Errorf("expected status %d, got %d", tc.status, rec.Code)
		}

		// Verify JSON structure
		var body map[string]string
		decodeJSON(t, rec.Result(), &body)
		if body["error"] != tc.msg {
			t.Errorf("expected error=%q, got %q", tc.msg, body["error"])
		}

		// Should have exactly one key: "error"
		if len(body) != 1 {
			t.Errorf("expected exactly 1 key in error response, got %d keys: %v", len(body), body)
		}
	}
}

// ── writeJSON Handles Edge Cases ─────────────────────────────────────────

func TestWriteJSON_NilData(t *testing.T) {
	rec := httptest.NewRecorder()
	writeJSON(rec, http.StatusOK, nil)

	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}
	// JSON null is valid
	if rec.Body.String() != "null\n" {
		t.Logf("nil data encoded as: %s", rec.Body.String())
	}
}

func TestWriteJSON_EmptyMap(t *testing.T) {
	rec := httptest.NewRecorder()
	writeJSON(rec, http.StatusOK, map[string]string{})

	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}
}

func TestWriteJSON_Array(t *testing.T) {
	rec := httptest.NewRecorder()
	writeJSON(rec, http.StatusOK, []int{1, 2, 3})

	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}
	if rec.Body.String() != "[1,2,3]\n" {
		t.Errorf("expected [1,2,3], got %s", rec.Body.String())
	}
}
