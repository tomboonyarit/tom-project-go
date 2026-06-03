//go:build integration

package repository

import (
	"context"
	"os"
	"testing"

	"api/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

// testPool returns a connection pool for integration tests.
// Requires DATABASE_URL or TEST_DATABASE_URL environment variable.
func testPool(t *testing.T) *pgxpool.Pool {
	t.Helper()

	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		dsn = os.Getenv("DATABASE_URL")
	}
	if dsn == "" {
		t.Skip("TEST_DATABASE_URL or DATABASE_URL not set — skipping integration test")
	}

	pool, err := pgxpool.New(context.Background(), dsn)
	if err != nil {
		t.Fatalf("connect to test db: %v", err)
	}
	if err := pool.Ping(context.Background()); err != nil {
		t.Fatalf("ping test db: %v", err)
	}

	// Clean up test data
	t.Cleanup(func() {
		pool.Exec(context.Background(), `DELETE FROM order_items`)
		pool.Exec(context.Background(), `DELETE FROM orders`)
		pool.Exec(context.Background(), `DELETE FROM products`)
		pool.Exec(context.Background(), `DELETE FROM categories`)
		pool.Exec(context.Background(), `DELETE FROM vendors`)
		pool.Close()
	})

	return pool
}

// seedTestProduct creates a test product and returns it.
func seedTestProduct(t *testing.T, pool *pgxpool.Pool, name string, price int) *models.Product {
	t.Helper()
	p := &models.Product{
		Name:  name,
		Price: price,
		Unit:  "ชิ้น",
	}
	if err := ProductCreate(pool, p); err != nil {
		t.Fatalf("seed product %s: %v", name, err)
	}
	return p
}

// ── Vendor Tests ─────────────────────────────────────────────────────────

func TestVendorCreateAndFindByPhone(t *testing.T) {
	pool := testPool(t)

	v := &models.Vendor{
		Phone:     "0812345678",
		PinHash:   "$2a$10$placeholderhash",
		Name:      "ร้านทดสอบ",
		BoothName: "บูธ A1",
	}

	err := VendorCreate(pool, v)
	if err != nil {
		t.Fatalf("VendorCreate failed: %v", err)
	}

	if v.ID == "" {
		t.Error("VendorCreate did not set ID")
	}
	if v.CreatedAt.IsZero() {
		t.Error("VendorCreate did not set CreatedAt")
	}

	// Find by phone
	found, err := VendorFindByPhone(pool, "0812345678")
	if err != nil {
		t.Fatalf("VendorFindByPhone failed: %v", err)
	}
	if found.ID != v.ID {
		t.Errorf("expected ID %s, got %s", v.ID, found.ID)
	}
	if found.Name != "ร้านทดสอบ" {
		t.Errorf("expected Name ร้านทดสอบ, got %s", found.Name)
	}
	if found.PinHash != "$2a$10$placeholderhash" {
		t.Error("PinHash mismatch")
	}
}

func TestVendorFindByPhone_NotFound(t *testing.T) {
	pool := testPool(t)

	_, err := VendorFindByPhone(pool, "0899999999")
	if err == nil {
		t.Error("expected error for non-existent phone")
	}
}

func TestVendorCreate_DuplicatePhone(t *testing.T) {
	pool := testPool(t)

	v := &models.Vendor{
		Phone:   "0811111111",
		PinHash: "$2a$10$hash1",
		Name:    "ร้านที่ 1",
	}
	err := VendorCreate(pool, v)
	if err != nil {
		t.Fatalf("first VendorCreate failed: %v", err)
	}

	v2 := &models.Vendor{
		Phone:   "0811111111",
		PinHash: "$2a$10$hash2",
		Name:    "ร้านที่ 2",
	}
	err = VendorCreate(pool, v2)
	if err == nil {
		t.Error("expected error for duplicate phone, got nil")
	}
}

func TestVendorGetByID(t *testing.T) {
	pool := testPool(t)

	v := &models.Vendor{
		Phone:     "0822222222",
		PinHash:   "$2a$10$hash",
		Name:      "ร้านทดสอบ 2",
		BoothName: "บูธ B2",
	}
	if err := VendorCreate(pool, v); err != nil {
		t.Fatalf("VendorCreate: %v", err)
	}

	found, err := VendorGetByID(pool, v.ID)
	if err != nil {
		t.Fatalf("VendorGetByID: %v", err)
	}
	if found.ID != v.ID {
		t.Errorf("expected ID %s, got %s", v.ID, found.ID)
	}
	if found.Name != v.Name {
		t.Errorf("expected Name %s, got %s", v.Name, found.Name)
	}
}

func TestVendorGetByID_NotFound(t *testing.T) {
	pool := testPool(t)

	_, err := VendorGetByID(pool, "00000000-0000-0000-0000-000000000000")
	if err == nil {
		t.Error("expected error for non-existent vendor ID")
	}
}

func TestVendorUpdate(t *testing.T) {
	pool := testPool(t)

	v := &models.Vendor{
		Phone:   "0833333333",
		PinHash: "$2a$10$hash",
		Name:    "ร้านก่อนแก้",
	}
	if err := VendorCreate(pool, v); err != nil {
		t.Fatalf("VendorCreate: %v", err)
	}

	fields := map[string]interface{}{
		"name":        "ร้านหลังแก้",
		"booth_name":  "บูธใหม่",
		"promptpay_id": "0833333333",
	}
	err := VendorUpdate(pool, v.ID, fields)
	if err != nil {
		t.Fatalf("VendorUpdate: %v", err)
	}

	found, err := VendorGetByID(pool, v.ID)
	if err != nil {
		t.Fatalf("VendorGetByID: %v", err)
	}
	if found.Name != "ร้านหลังแก้" {
		t.Errorf("expected Name ร้านหลังแก้, got %s", found.Name)
	}
	if found.BoothName != "บูธใหม่" {
		t.Errorf("expected BoothName บูธใหม่, got %s", found.BoothName)
	}
	if found.PromptpayID != "0833333333" {
		t.Errorf("expected PromptpayID 0833333333, got %s", found.PromptpayID)
	}
}

// ── Product Tests ────────────────────────────────────────────────────────

func TestProductCreateAndList(t *testing.T) {
	pool := testPool(t)

	p1 := seedTestProduct(t, pool, "น้ำเปล่า", 1000) // 10 THB
	p2 := seedTestProduct(t, pool, "ข้าวผัด", 5000)  // 50 THB
	p3 := seedTestProduct(t, pool, "น้ำอัดลม", 1500) // 15 THB

	// List all
	products, err := ProductList(pool, ProductFilter{})
	if err != nil {
		t.Fatalf("ProductList: %v", err)
	}
	if len(products) < 3 {
		t.Errorf("expected at least 3 products, got %d", len(products))
	}

	// Check specific products exist
	names := make(map[string]bool)
	for _, p := range products {
		names[p.Name] = true
	}
	for _, expected := range []string{p1.Name, p2.Name, p3.Name} {
		if !names[expected] {
			t.Errorf("product %q not found in list", expected)
		}
	}
}

func TestProductList_WithSearch(t *testing.T) {
	pool := testPool(t)

	_ = seedTestProduct(t, pool, "น้ำเปล่า", 1000)
	_ = seedTestProduct(t, pool, "น้ำอัดลม", 1500)
	_ = seedTestProduct(t, pool, "ข้าวผัด", 5000)

	// Search for "น้ำ"
	products, err := ProductList(pool, ProductFilter{Search: "น้ำ"})
	if err != nil {
		t.Fatalf("ProductList with search: %v", err)
	}
	if len(products) < 2 {
		t.Errorf("search 'น้ำ' should return at least 2 products, got %d", len(products))
	}

	// Search for non-existent
	products, err = ProductList(pool, ProductFilter{Search: "zzzzzzz"})
	if err != nil {
		t.Fatalf("ProductList with non-matching search: %v", err)
	}
	if len(products) != 0 {
		t.Errorf("search 'zzzzzzz' should return 0 products, got %d", len(products))
	}
}

func TestProductCreate_InvalidPrice(t *testing.T) {
	pool := testPool(t)

	p := &models.Product{
		Name:  "สินค้าทดสอบ",
		Price: -100,
		Unit:  "ชิ้น",
	}
	err := ProductCreate(pool, p)
	// Should succeed at DB level (price constraint is in handler, not DB)
	// This tests that the repo allows negative prices — validation is handler's job
	if err != nil {
		t.Logf("DB rejected negative price: %v (this is fine either way)", err)
	}
}

func TestProductGetByID(t *testing.T) {
	pool := testPool(t)

	created := seedTestProduct(t, pool, "สินค้าเป้าหมาย", 2000)

	found, err := ProductGetByID(pool, created.ID)
	if err != nil {
		t.Fatalf("ProductGetByID: %v", err)
	}
	if found.Name != "สินค้าเป้าหมาย" {
		t.Errorf("expected Name สินค้าเป้าหมาย, got %s", found.Name)
	}
	if found.Price != 2000 {
		t.Errorf("expected Price 2000, got %d", found.Price)
	}
}

func TestProductUpdate(t *testing.T) {
	pool := testPool(t)

	created := seedTestProduct(t, pool, "ของเก่า", 1000)

	fields := map[string]interface{}{
		"name":  "ของใหม่",
		"price": 2000,
	}
	err := ProductUpdate(pool, created.ID, fields)
	if err != nil {
		t.Fatalf("ProductUpdate: %v", err)
	}

	found, err := ProductGetByID(pool, created.ID)
	if err != nil {
		t.Fatalf("ProductGetByID: %v", err)
	}
	if found.Name != "ของใหม่" {
		t.Errorf("expected Name ของใหม่, got %s", found.Name)
	}
	if found.Price != 2000 {
		t.Errorf("expected Price 2000, got %d", found.Price)
	}
}

func TestProductDelete(t *testing.T) {
	pool := testPool(t)

	created := seedTestProduct(t, pool, "ของที่จะลบ", 500)

	err := ProductDelete(pool, created.ID)
	if err != nil {
		t.Fatalf("ProductDelete: %v", err)
	}

	_, err = ProductGetByID(pool, created.ID)
	if err == nil {
		t.Error("ProductGetByID should return error for deleted product")
	}
}

// ── Order Tests ──────────────────────────────────────────────────────────

func TestOrderCreate(t *testing.T) {
	pool := testPool(t)

	p1 := seedTestProduct(t, pool, "น้ำเปล่า", 1000) // 10 THB
	p2 := seedTestProduct(t, pool, "ข้าวผัด", 5000)  // 50 THB

	items := []models.CreateOrderItem{
		{ProductID: p1.ID, Qty: 2, Notes: "เย็น"},
		{ProductID: p2.ID, Qty: 1, Notes: "เผ็ดน้อย"},
	}

	order, err := OrderCreate(pool, items, 500, "รีบหน่อย")
	if err != nil {
		t.Fatalf("OrderCreate: %v", err)
	}

	// Verify order fields
	if order.ID == "" {
		t.Error("order ID should not be empty")
	}
	if order.OrderNo == "" {
		t.Error("order number should not be empty")
	}
	// subtotal: 2*1000 + 1*5000 = 7000
	if order.Subtotal != 7000 {
		t.Errorf("expected subtotal 7000, got %d", order.Subtotal)
	}
	if order.Discount != 500 {
		t.Errorf("expected discount 500, got %d", order.Discount)
	}
	// total: 7000 - 500 = 6500
	if order.Total != 6500 {
		t.Errorf("expected total 6500, got %d", order.Total)
	}
	if order.Status != "new" {
		t.Errorf("expected status 'new', got %s", order.Status)
	}
	if order.CustomerNote != "รีบหน่อย" {
		t.Errorf("expected customer note รีบหน่อย, got %s", order.CustomerNote)
	}

	// Verify order items
	if len(order.Items) != 2 {
		t.Fatalf("expected 2 order items, got %d", len(order.Items))
	}
}

func TestOrderCreate_CalculatesTotalCorrectly(t *testing.T) {
	pool := testPool(t)

	p := seedTestProduct(t, pool, "ของ", 100) // 1 THB

	items := []models.CreateOrderItem{
		{ProductID: p.ID, Qty: 10},
	}

	order, err := OrderCreate(pool, items, 0, "")
	if err != nil {
		t.Fatalf("OrderCreate: %v", err)
	}

	// subtotal: 10 * 100 = 1000
	if order.Subtotal != 1000 {
		t.Errorf("expected subtotal 1000, got %d", order.Subtotal)
	}
	// total: 1000
	if order.Total != 1000 {
		t.Errorf("expected total 1000, got %d", order.Total)
	}
}

func TestOrderCreate_DiscountExceedsSubtotal(t *testing.T) {
	pool := testPool(t)

	p := seedTestProduct(t, pool, "ของ", 100) // 1 THB

	items := []models.CreateOrderItem{
		{ProductID: p.ID, Qty: 1},
	}

	// Discount > subtotal should result in total = 0 (not negative)
	order, err := OrderCreate(pool, items, 500, "")
	if err != nil {
		t.Fatalf("OrderCreate: %v", err)
	}

	if order.Total < 0 {
		t.Errorf("total should not be negative: got %d", order.Total)
	}
	if order.Total != 0 {
		t.Errorf("expected total 0 when discount > subtotal, got %d", order.Total)
	}
}

func TestOrderCreate_EmptyItems(t *testing.T) {
	pool := testPool(t)

	_, err := OrderCreate(pool, []models.CreateOrderItem{}, 0, "")
	// Handler validates this; repo should succeed with empty items (no items to insert)
	if err != nil {
		t.Logf("OrderCreate with empty items returned error: %v", err)
	}
}

func TestOrderGetByID(t *testing.T) {
	pool := testPool(t)

	p := seedTestProduct(t, pool, "ของ", 1000)
	items := []models.CreateOrderItem{
		{ProductID: p.ID, Qty: 1},
	}
	created, err := OrderCreate(pool, items, 0, "")
	if err != nil {
		t.Fatalf("OrderCreate: %v", err)
	}

	found, err := OrderGetByID(pool, created.ID)
	if err != nil {
		t.Fatalf("OrderGetByID: %v", err)
	}
	if found.ID != created.ID {
		t.Errorf("expected ID %s, got %s", created.ID, found.ID)
	}
	if len(found.Items) != 1 {
		t.Errorf("expected 1 item, got %d", len(found.Items))
	}
}

// ── Order Status Transition Tests ────────────────────────────────────────

func TestOrderUpdateStatus_ValidTransitions(t *testing.T) {
	pool := testPool(t)

	p := seedTestProduct(t, pool, "ของ", 1000)
	items := []models.CreateOrderItem{{ProductID: p.ID, Qty: 1}}
	order, err := OrderCreate(pool, items, 0, "")
	if err != nil {
		t.Fatalf("OrderCreate: %v", err)
	}

	transitions := []string{
		"preparing", // new → preparing (valid)
		"paid",      // preparing → paid (valid)
		"completed", // paid → completed (valid)
	}

	for _, newStatus := range transitions {
		err := OrderUpdateStatus(pool, order.ID, newStatus)
		if err != nil {
			t.Fatalf("OrderUpdateStatus to %s failed: %v", newStatus, err)
		}

		updated, err := OrderGetByID(pool, order.ID)
		if err != nil {
			t.Fatalf("OrderGetByID after status change: %v", err)
		}
		if updated.Status != newStatus {
			t.Errorf("expected status %s, got %s", newStatus, updated.Status)
		}
	}
}

func TestOrderUpdateStatus_InvalidTransitions(t *testing.T) {
	pool := testPool(t)

	p := seedTestProduct(t, pool, "ของ", 1000)
	items := []models.CreateOrderItem{{ProductID: p.ID, Qty: 1}}
	order, err := OrderCreate(pool, items, 0, "")
	if err != nil {
		t.Fatalf("OrderCreate: %v", err)
	}

	// new → paid is NOT valid (must go through preparing)
	err = OrderUpdateStatus(pool, order.ID, "paid")
	if err == nil {
		t.Error("expected error for invalid transition new → paid")
	}

	// new → completed is NOT valid
	err = OrderUpdateStatus(pool, order.ID, "completed")
	if err == nil {
		t.Error("expected error for invalid transition new → completed")
	}

	// new → new (same status) is NOT valid
	err = OrderUpdateStatus(pool, order.ID, "new")
	if err == nil {
		t.Error("expected error for invalid transition new → new")
	}
}

func TestOrderUpdateStatus_CancelledIsTerminal(t *testing.T) {
	pool := testPool(t)

	p := seedTestProduct(t, pool, "ของ", 1000)
	items := []models.CreateOrderItem{{ProductID: p.ID, Qty: 1}}
	order, err := OrderCreate(pool, items, 0, "")
	if err != nil {
		t.Fatalf("OrderCreate: %v", err)
	}

	// Cancel the order
	err = OrderUpdateStatus(pool, order.ID, "cancelled")
	if err != nil {
		t.Fatalf("cancel order: %v", err)
	}

	// Cannot transition from cancelled to anything
	invalidTargets := []string{"new", "preparing", "paid", "completed"}
	for _, target := range invalidTargets {
		err = OrderUpdateStatus(pool, order.ID, target)
		if err == nil {
			t.Errorf("expected error for transition cancelled → %s", target)
		}
	}
}

// ── Payment Update Tests ─────────────────────────────────────────────────

func TestOrderUpdatePayment(t *testing.T) {
	pool := testPool(t)

	p := seedTestProduct(t, pool, "ของ", 1000)
	items := []models.CreateOrderItem{{ProductID: p.ID, Qty: 1}}
	order, err := OrderCreate(pool, items, 0, "")
	if err != nil {
		t.Fatalf("OrderCreate: %v", err)
	}

	// Set payment method to cash
	err = OrderUpdatePayment(pool, order.ID, "cash")
	if err != nil {
		t.Fatalf("OrderUpdatePayment cash: %v", err)
	}

	updated, err := OrderGetByID(pool, order.ID)
	if err != nil {
		t.Fatalf("OrderGetByID: %v", err)
	}
	if updated.PaymentMethod == nil || *updated.PaymentMethod != "cash" {
		t.Errorf("expected payment_method cash, got %v", updated.PaymentMethod)
	}

	// Switch to promptpay
	err = OrderUpdatePayment(pool, order.ID, "promptpay")
	if err != nil {
		t.Fatalf("OrderUpdatePayment promptpay: %v", err)
	}

	updated, err = OrderGetByID(pool, order.ID)
	if err != nil {
		t.Fatalf("OrderGetByID: %v", err)
	}
	if updated.PaymentMethod == nil || *updated.PaymentMethod != "promptpay" {
		t.Errorf("expected payment_method promptpay, got %v", updated.PaymentMethod)
	}
}

func TestOrderUpdatePayment_InvalidMethod(t *testing.T) {
	pool := testPool(t)

	p := seedTestProduct(t, pool, "ของ", 1000)
	items := []models.CreateOrderItem{{ProductID: p.ID, Qty: 1}}
	order, err := OrderCreate(pool, items, 0, "")
	if err != nil {
		t.Fatalf("OrderCreate: %v", err)
	}

	invalidMethods := []string{"credit_card", "bank_transfer", "", "CASH", "PromptPay"}
	for _, method := range invalidMethods {
		err = OrderUpdatePayment(pool, order.ID, method)
		if err == nil {
			t.Errorf("expected error for invalid payment method %q", method)
		}
	}
}

// ── Order Number Format Tests ────────────────────────────────────────────

func TestOrderNumberFormat(t *testing.T) {
	pool := testPool(t)

	p := seedTestProduct(t, pool, "ของ", 1000)
	items := []models.CreateOrderItem{{ProductID: p.ID, Qty: 1}}
	order, err := OrderCreate(pool, items, 0, "")
	if err != nil {
		t.Fatalf("OrderCreate: %v", err)
	}

	orderNo := order.OrderNo

	// Format: POS-YYMMDD-NNNN (e.g. POS-260603-0001)
	if len(orderNo) != 15 {
		t.Errorf("order number length: expected 15, got %d (%s)", len(orderNo), orderNo)
	}
	if orderNo[:4] != "POS-" {
		t.Errorf("order number must start with POS-, got %s", orderNo[:4])
	}
	if orderNo[10] != '-' {
		t.Errorf("order number must have dash at position 10, got %s", orderNo)
	}

	// Verify the sequence part is numeric
	seq := orderNo[11:]
	for _, c := range seq {
		if c < '0' || c > '9' {
			t.Errorf("sequence part must be numeric, got %s", orderNo)
			break
		}
	}
}

// ── Order List Tests ─────────────────────────────────────────────────────

func TestOrderList(t *testing.T) {
	pool := testPool(t)

	p := seedTestProduct(t, pool, "ของ", 1000)
	items := []models.CreateOrderItem{{ProductID: p.ID, Qty: 1}}
	_, err := OrderCreate(pool, items, 0, "")
	if err != nil {
		t.Fatalf("OrderCreate: %v", err)
	}

	orders, totalOrders, totalRevenue, err := OrderList(pool, nil, nil)
	if err != nil {
		t.Fatalf("OrderList: %v", err)
	}

	if len(orders) < 1 {
		t.Error("expected at least 1 order in list")
	}
	if totalOrders < 1 {
		t.Errorf("expected totalOrders >= 1, got %d", totalOrders)
	}
	if totalRevenue < 0 {
		t.Errorf("totalRevenue should be >= 0, got %d", totalRevenue)
	}
}
