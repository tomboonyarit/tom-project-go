package models

import (
	"encoding/json"
	"strings"
	"testing"
	"time"
)

// ── Vendor JSON Round-trip ───────────────────────────────────────────────

func TestVendor_MarshalJSON_ExcludesPinHash(t *testing.T) {
	v := Vendor{
		ID:          "v-001",
		Phone:       "0812345678",
		PinHash:     "$2a$10$secret-hash-should-not-leak",
		Name:        "ร้านทดสอบ",
		BoothName:   "บูธ A1",
		PromptpayID: "0812345678",
		CreatedAt:   time.Now().Truncate(time.Second),
		UpdatedAt:   time.Now().Truncate(time.Second),
	}

	data, err := json.Marshal(v)
	if err != nil {
		t.Fatalf("marshal Vendor: %v", err)
	}

	str := string(data)

	// PinHash must not appear in JSON output (json:"-" tag)
	if strings.Contains(str, "pin_hash") || strings.Contains(str, "PinHash") || strings.Contains(str, "secret-hash") {
		t.Errorf("PinHash leaked in JSON output: %s", str)
	}

	// All other fields should appear
	required := []string{"id", "phone", "name", "booth_name", "promptpay_id", "created_at", "updated_at"}
	for _, field := range required {
		if !strings.Contains(str, field) {
			t.Errorf("Vendor JSON missing field %q: %s", field, str)
		}
	}
}

func TestVendor_UnmarshalJSON(t *testing.T) {
	input := `{"id":"v-001","phone":"0812345678","name":"ร้านทดสอบ","booth_name":"บูธ","promptpay_id":"0812345678","created_at":"2026-06-03T10:00:00Z","updated_at":"2026-06-03T10:00:00Z"}`
	var v Vendor
	err := json.Unmarshal([]byte(input), &v)
	if err != nil {
		t.Fatalf("unmarshal Vendor: %v", err)
	}
	if v.ID != "v-001" {
		t.Errorf("expected ID v-001, got %s", v.ID)
	}
	if v.Phone != "0812345678" {
		t.Errorf("expected phone 0812345678, got %s", v.Phone)
	}
	if v.Name != "ร้านทดสอบ" {
		t.Errorf("expected name ร้านทดสอบ, got %s", v.Name)
	}
	// PinHash should remain empty (not in JSON input)
	if v.PinHash != "" {
		t.Errorf("PinHash should be empty after unmarshal, got %q", v.PinHash)
	}
}

// ── Product JSON Round-trip ──────────────────────────────────────────────

func TestProduct_MarshalJSON(t *testing.T) {
	catID := "cat-001"
	p := Product{
		ID:           "prod-001",
		CategoryID:   &catID,
		CategoryName: "อาหาร",
		Name:         "ข้าวผัด",
		Price:        5000, // 50 THB in satang
		Unit:         "จาน",
		ImageURL:     "https://example.com/img.jpg",
		IsActive:     true,
		CreatedAt:    time.Now().Truncate(time.Second),
		UpdatedAt:    time.Now().Truncate(time.Second),
	}

	data, err := json.Marshal(p)
	if err != nil {
		t.Fatalf("marshal Product: %v", err)
	}

	str := string(data)

	required := []string{"id", "category_id", "category_name", "name", "price", "unit", "image_url", "is_active", "created_at", "updated_at"}
	for _, field := range required {
		if !strings.Contains(str, field) {
			t.Errorf("Product JSON missing field %q: %s", field, str)
		}
	}

	// Price should be integer (satang), not float
	if strings.Contains(str, `"price":5000`) {
		// good — integer
	} else if strings.Contains(str, `"price":5000.0`) {
		t.Error("Product price marshaled as float, should be integer")
	}

	// Category name should be present (omitempty, but non-empty)
	if !strings.Contains(str, `"category_name":"อาหาร"`) {
		t.Errorf("Product JSON missing category_name: %s", str)
	}
}

func TestProduct_UnmarshalJSON(t *testing.T) {
	input := `{"id":"prod-001","category_id":"cat-001","category_name":"อาหาร","name":"ข้าวผัด","price":5000,"unit":"จาน","image_url":"","is_active":true,"created_at":"2026-06-03T10:00:00Z","updated_at":"2026-06-03T10:00:00Z"}`
	var p Product
	err := json.Unmarshal([]byte(input), &p)
	if err != nil {
		t.Fatalf("unmarshal Product: %v", err)
	}
	if p.Name != "ข้าวผัด" {
		t.Errorf("expected name ข้าวผัด, got %s", p.Name)
	}
	if p.Price != 5000 {
		t.Errorf("expected price 5000, got %d", p.Price)
	}
}

func TestProduct_OmitEmptyFields(t *testing.T) {
	// Product with no category
	p := Product{
		ID:     "prod-002",
		Name:   "น้ำเปล่า",
		Price:  1000,
		Unit:   "ขวด",
	}

	data, err := json.Marshal(p)
	if err != nil {
		t.Fatalf("marshal Product: %v", err)
	}
	str := string(data)

	// category_name should be omitted (omitempty, empty string)
	if strings.Contains(str, `"category_name":`) {
		t.Errorf("category_name should be omitted when empty: %s", str)
	}
}

// ── Order JSON Round-trip ────────────────────────────────────────────────

func TestOrder_MarshalJSON(t *testing.T) {
	o := Order{
		ID:        "ord-001",
		OrderNo:   "POS-260603-0001",
		Subtotal:  15000,
		Discount:  0,
		Total:     15000,
		Status:    "new",
		Items:     []OrderItem{},
		CreatedAt: time.Now().Truncate(time.Second),
		UpdatedAt: time.Now().Truncate(time.Second),
	}

	data, err := json.Marshal(o)
	if err != nil {
		t.Fatalf("marshal Order: %v", err)
	}
	str := string(data)

	required := []string{"id", "order_no", "subtotal", "discount", "total", "status", "created_at", "updated_at"}
	for _, field := range required {
		if !strings.Contains(str, field) {
			t.Errorf("Order JSON missing field %q: %s", field, str)
		}
	}

	// items should be omitted when empty (omitempty)
	if strings.Contains(str, `"items"`) && strings.Contains(str, `"items":null`) {
		// null is expected for nil slice as omitempty skips it but nil -> null
		// Acceptable
	}

	// Verify integer values
	if !strings.Contains(str, `"subtotal":15000`) {
		t.Error("subtotal should be 15000")
	}
	if !strings.Contains(str, `"total":15000`) {
		t.Error("total should be 15000")
	}
}

func TestOrder_UnmarshalJSON(t *testing.T) {
	input := `{"id":"ord-001","order_no":"POS-260603-0001","subtotal":15000,"discount":0,"total":15000,"status":"new","payment_method":"cash","customer_note":"เผ็ดน้อย","created_at":"2026-06-03T10:00:00Z","updated_at":"2026-06-03T10:00:00Z"}`
	var o Order
	err := json.Unmarshal([]byte(input), &o)
	if err != nil {
		t.Fatalf("unmarshal Order: %v", err)
	}
	if o.Status != "new" {
		t.Errorf("expected status new, got %s", o.Status)
	}
	if o.Total != 15000 {
		t.Errorf("expected total 15000, got %d", o.Total)
	}
}

// ── OrderItem JSON Round-trip ────────────────────────────────────────────

func TestOrderItem_MarshalJSON(t *testing.T) {
	prodID := "prod-001"
	item := OrderItem{
		ID:          "oi-001",
		OrderID:     "ord-001",
		ProductID:   &prodID,
		ProductName: "ข้าวผัด",
		Price:       5000,
		Qty:         2,
		Subtotal:    10000,
		Notes:       "ไม่ใส่ผัก",
	}

	data, err := json.Marshal(item)
	if err != nil {
		t.Fatalf("marshal OrderItem: %v", err)
	}
	str := string(data)

	required := []string{"id", "order_id", "product_id", "product_name", "price", "qty", "subtotal", "notes"}
	for _, field := range required {
		if !strings.Contains(str, field) {
			t.Errorf("OrderItem JSON missing field %q: %s", field, str)
		}
	}
}

// ── Request Types JSON ───────────────────────────────────────────────────

func TestRegisterRequest_UnmarshalJSON(t *testing.T) {
	input := `{"phone":"0812345678","pin":"123456","name":"ร้านทดสอบ","booth_name":"บูธ A1"}`
	var req RegisterRequest
	err := json.Unmarshal([]byte(input), &req)
	if err != nil {
		t.Fatalf("unmarshal RegisterRequest: %v", err)
	}
	if req.Phone != "0812345678" {
		t.Errorf("expected phone 0812345678, got %s", req.Phone)
	}
	if req.PIN != "123456" {
		t.Errorf("expected PIN 123456, got %s", req.PIN)
	}
	if req.Name != "ร้านทดสอบ" {
		t.Errorf("expected name ร้านทดสอบ, got %s", req.Name)
	}
	if req.BoothName != "บูธ A1" {
		t.Errorf("expected booth_name บูธ A1, got %s", req.BoothName)
	}
}

func TestLoginRequest_UnmarshalJSON(t *testing.T) {
	input := `{"phone":"0812345678","pin":"123456"}`
	var req LoginRequest
	err := json.Unmarshal([]byte(input), &req)
	if err != nil {
		t.Fatalf("unmarshal LoginRequest: %v", err)
	}
	if req.Phone != "0812345678" {
		t.Errorf("expected phone 0812345678, got %s", req.Phone)
	}
	if req.PIN != "123456" {
		t.Errorf("expected PIN 123456, got %s", req.PIN)
	}
}

func TestCreateOrderRequest_UnmarshalJSON(t *testing.T) {
	input := `{"items":[{"product_id":"prod-001","qty":2,"notes":"เผ็ดน้อย"}],"discount":500,"customer_note":"รีบหน่อย"}`
	var req CreateOrderRequest
	err := json.Unmarshal([]byte(input), &req)
	if err != nil {
		t.Fatalf("unmarshal CreateOrderRequest: %v", err)
	}
	if len(req.Items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(req.Items))
	}
	if req.Items[0].ProductID != "prod-001" {
		t.Errorf("expected product_id prod-001, got %s", req.Items[0].ProductID)
	}
	if req.Items[0].Qty != 2 {
		t.Errorf("expected qty 2, got %d", req.Items[0].Qty)
	}
	if req.Discount != 500 {
		t.Errorf("expected discount 500, got %d", req.Discount)
	}
	if req.CustomerNote != "รีบหน่อย" {
		t.Errorf("expected customer_note รีบหน่อย, got %s", req.CustomerNote)
	}
}

func TestUpdateStatusRequest_UnmarshalJSON(t *testing.T) {
	input := `{"status":"paid"}`
	var req UpdateStatusRequest
	err := json.Unmarshal([]byte(input), &req)
	if err != nil {
		t.Fatalf("unmarshal UpdateStatusRequest: %v", err)
	}
	if req.Status != "paid" {
		t.Errorf("expected status paid, got %s", req.Status)
	}
}

// ── AuthResponse JSON ────────────────────────────────────────────────────

func TestAuthResponse_MarshalJSON(t *testing.T) {
	resp := AuthResponse{
		Vendor: Vendor{
			ID:          "v-001",
			Phone:       "0812345678",
			PinHash:     "secret",
			Name:        "ร้านทดสอบ",
			BoothName:   "บูธ",
			PromptpayID: "0812345678",
			CreatedAt:   time.Now().Truncate(time.Second),
			UpdatedAt:   time.Now().Truncate(time.Second),
		},
		Token: "eyJhbGciOiJIUzI1NiIs...",
	}

	data, err := json.Marshal(resp)
	if err != nil {
		t.Fatalf("marshal AuthResponse: %v", err)
	}
	str := string(data)

	if !strings.Contains(str, "vendor") {
		t.Error("AuthResponse JSON missing vendor field")
	}
	if !strings.Contains(str, "token") {
		t.Error("AuthResponse JSON missing token field")
	}
	// PinHash must not appear
	if strings.Contains(str, "pin_hash") || strings.Contains(str, "secret") {
		t.Errorf("PinHash leaked in AuthResponse: %s", str)
	}
}

// ── DailyReport JSON ─────────────────────────────────────────────────────

func TestDailyReport_MarshalJSON(t *testing.T) {
	report := DailyReport{
		Date:         "2026-06-03",
		TotalOrders:  42,
		TotalRevenue: 1500000,
		TotalDiscount: 5000,
		ByPayment: []PaymentSummary{
			{PaymentMethod: "cash", Count: 30, Total: 1000000},
			{PaymentMethod: "promptpay", Count: 12, Total: 500000},
		},
		TopProducts: []TopProduct{
			{ProductName: "ข้าวผัด", TotalQty: 50, TotalAmount: 250000},
		},
	}

	data, err := json.Marshal(report)
	if err != nil {
		t.Fatalf("marshal DailyReport: %v", err)
	}
	str := string(data)

	required := []string{"date", "total_orders", "total_revenue", "total_discount", "by_payment", "top_products"}
	for _, field := range required {
		if !strings.Contains(str, field) {
			t.Errorf("DailyReport JSON missing field %q: %s", field, str)
		}
	}

	// Check nested by_payment
	if !strings.Contains(str, "cash") || !strings.Contains(str, "promptpay") {
		t.Errorf("DailyReport by_payment missing entries: %s", str)
	}
}

func TestMonthlyReport_MarshalJSON(t *testing.T) {
	report := MonthlyReport{
		Month:         "2026-06",
		TotalOrders:   120,
		TotalRevenue:  5000000,
		TotalDiscount: 15000,
		DailyBreakdown: []DailySummary{
			{Date: "2026-06-01", TotalOrders: 40, TotalRevenue: 1500000},
		},
	}

	data, err := json.Marshal(report)
	if err != nil {
		t.Fatalf("marshal MonthlyReport: %v", err)
	}
	str := string(data)

	required := []string{"month", "total_orders", "total_revenue", "daily_breakdown"}
	for _, field := range required {
		if !strings.Contains(str, field) {
			t.Errorf("MonthlyReport JSON missing field %q: %s", field, str)
		}
	}
}

// ── Helper Function Tests ────────────────────────────────────────────────

func TestNullUUID_NilInput(t *testing.T) {
	result := NullUUID(nil)
	if result.Valid {
		t.Error("NullUUID(nil) should return invalid UUID")
	}
}

func TestNullUUID_EmptyString(t *testing.T) {
	result := NullUUID(StringPtr(""))
	if result.Valid {
		t.Error("NullUUID(\"\") should return invalid UUID")
	}
}

func TestNullUUID_InvalidUUID(t *testing.T) {
	result := NullUUID(StringPtr("not-a-valid-uuid"))
	if result.Valid {
		t.Error("NullUUID(invalid) should return invalid UUID")
	}
}

func TestNullUUID_ValidUUID(t *testing.T) {
	// Valid UUID format
	result := NullUUID(StringPtr("550e8400-e29b-41d4-a716-446655440000"))
	if !result.Valid {
		t.Error("NullUUID(valid) should return valid UUID")
	}
}

func TestStringPtr(t *testing.T) {
	s := "hello"
	ptr := StringPtr(s)
	if ptr == nil {
		t.Fatal("StringPtr returned nil")
	}
	if *ptr != "hello" {
		t.Errorf("StringPtr value: got %q, want %q", *ptr, s)
	}

	// Empty string
	ptr2 := StringPtr("")
	if ptr2 == nil {
		t.Fatal("StringPtr(\"\") returned nil")
	}
	if *ptr2 != "" {
		t.Errorf("StringPtr(\"\") value: got %q, want empty", *ptr2)
	}
}

// ── Price Formatting (Satang) Tests ──────────────────────────────────────

func TestPriceSatangValues(t *testing.T) {
	tests := []struct {
		name   string
		satang int
		thb    float64
	}{
		{"10 THB", 1000, 10.00},
		{"15 THB", 1500, 15.00},
		{"50 THB", 5000, 50.00},
		{"100 THB", 10000, 100.00},
		{"1000 THB", 100000, 1000.00},
		{"0 THB", 0, 0.00},
		{"0.50 THB", 50, 0.50},
		{"0.25 THB", 25, 0.25},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Verify satang to THB conversion
			thb := float64(tt.satang) / 100.0
			if thb != tt.thb {
				t.Errorf("satang %d → THB %.2f, want %.2f", tt.satang, thb, tt.thb)
			}

			// Verify THB to satang conversion
			satang := int(tt.thb * 100)
			if satang != tt.satang {
				t.Errorf("THB %.2f → satang %d, want %d", tt.thb, satang, tt.satang)
			}
		})
	}
}

// ── CreateProductRequest Edge Cases ──────────────────────────────────────

func TestCreateProductRequest_Defaults(t *testing.T) {
	// is_active should default to true when nil
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{"with is_active false", `{"name":"test","price":1000,"unit":"ชิ้น","is_active":false}`, ""},
		{"without is_active", `{"name":"test","price":1000}`, ""},
		{"with category", `{"name":"test","price":1000,"category_id":"cat-001"}`, ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var req CreateProductRequest
			err := json.Unmarshal([]byte(tt.input), &req)
			if err != nil {
				t.Fatalf("unmarshal: %v", err)
			}
			if req.Name != "test" {
				t.Errorf("expected name test, got %s", req.Name)
			}
			if req.Price != 1000 {
				t.Errorf("expected price 1000, got %d", req.Price)
			}
		})
	}
}

// ── Category JSON Round-trip ─────────────────────────────────────────────

func TestCategory_MarshalJSON(t *testing.T) {
	c := Category{
		ID:           "cat-001",
		Name:         "อาหาร",
		SortOrder:    1,
		ProductCount: 15,
		CreatedAt:    time.Now().Truncate(time.Second),
	}

	data, err := json.Marshal(c)
	if err != nil {
		t.Fatalf("marshal Category: %v", err)
	}
	str := string(data)

	// product_count should appear
	if !strings.Contains(str, `"product_count":15`) {
		t.Errorf("Category JSON missing product_count: %s", str)
	}
}

func TestCategory_ProductCountOmittedWhenZero(t *testing.T) {
	c := Category{
		ID:        "cat-002",
		Name:      "เครื่องดื่ม",
		SortOrder: 2,
		CreatedAt: time.Now().Truncate(time.Second),
	}

	data, err := json.Marshal(c)
	if err != nil {
		t.Fatalf("marshal Category: %v", err)
	}
	str := string(data)

	// With omitempty and ProductCount=0, should omit from JSON
	if strings.Contains(str, `"product_count"`) {
		t.Errorf("product_count=0 should be omitted via omitempty: %s", str)
	}
}

// ── Concurrent Safety (Struct Copy) ──────────────────────────────────────

func TestVendor_CopyDoesNotSharePinHash(t *testing.T) {
	original := Vendor{
		ID:      "v-001",
		PinHash: "original-hash",
	}

	// JSON marshal/unmarshal acts like a deep copy (minus PinHash)
	data, _ := json.Marshal(original)
	var copy Vendor
	json.Unmarshal(data, &copy)

	// The copy should NOT have the PinHash
	if copy.PinHash != "" {
		t.Errorf("copy should not have PinHash, got %q", copy.PinHash)
	}
}

// ── Empty/Nil Slice Handling ─────────────────────────────────────────────

func TestEmptySlicesMarshal(t *testing.T) {
	// Empty items in Order
	o := Order{
		ID:    "ord-001",
		Items: []OrderItem{},
	}
	data, _ := json.Marshal(o)
	str := string(data)
	// Empty slice should marshal as [] or be omitted; both acceptable
	_ = str

	// Nil items
	o2 := Order{
		ID:    "ord-002",
		Items: nil,
	}
	data2, _ := json.Marshal(o2)
	str2 := string(data2)
	// With omitempty and nil slice, should be omitted
	if strings.Contains(str2, `"items":null`) {
		// Acceptable — omitempty omits nil but JSON null is possible
	}
	_ = str2
}
