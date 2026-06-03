package qr

import (
	"strings"
	"testing"
)

// ── CRC16 Calculation Tests ──────────────────────────────────────────────

func TestCRC16(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{"empty", "", "FFFF"},
		{"single byte A", "A", "B915"},
		{"known PromptPay prefix", "000201010212", "342A"},
		{"simple string", "1234567890", "3218"},
		{"PromptPay-like payload start", "00020101021229300016A00000067701011101130066812345678953037645802TH", "872A"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := crc16([]byte(tt.input))
			if result != tt.expected {
				t.Errorf("crc16(%q) = %s, want %s", tt.input, result, tt.expected)
			}
		})
	}
}

// Verify CRC16 output is always 4 uppercase hex chars.
func TestCRC16Format(t *testing.T) {
	inputs := []string{"", "test", "hello world", "000201"}
	for _, in := range inputs {
		result := crc16([]byte(in))
		if len(result) != 4 {
			t.Errorf("crc16(%q) length = %d, want 4", in, len(result))
		}
		for _, c := range result {
			if !((c >= '0' && c <= '9') || (c >= 'A' && c <= 'F')) {
				t.Errorf("crc16(%q) contains invalid hex char: %c", in, c)
			}
		}
	}
}

// ── Payload Format Tests ─────────────────────────────────────────────────

func TestGeneratePayload_StaticQR_NoAmount(t *testing.T) {
	payload := GeneratePromptPayPayload("0812345678", 0)

	// Mandatory tags
	mandatoryTags := []string{"000201", "5303764", "5802TH", "6304"}
	for _, tag := range mandatoryTags {
		if !strings.Contains(payload, tag) {
			t.Errorf("static payload missing mandatory tag %s", tag)
		}
	}

	// Static QR should use Point of Initiation "010212"
	if !strings.Contains(payload, "010212") {
		t.Errorf("static QR should contain 010212 (static POI), got: %s", payload)
	}

	// No amount tag (54) when amount = 0
	if strings.Contains(payload, "54") {
		t.Errorf("static QR should NOT contain amount tag 54, got: %s", payload)
	}

	// Should contain the phone in 0066 format
	if !strings.Contains(payload, "0066812345678") {
		t.Errorf("payload should contain 0066812345678 (normalized phone), got: %s", payload)
	}

	// Should contain PromptPay AID
	if !strings.Contains(payload, "A000000677010111") {
		t.Errorf("payload should contain PromptPay AID, got: %s", payload)
	}
}

func TestGeneratePayload_DynamicQR_WithAmount(t *testing.T) {
	payload := GeneratePromptPayPayload("0812345678", 5000)

	// Dynamic QR should use POI "010211"
	if !strings.Contains(payload, "010211") {
		t.Errorf("dynamic QR should contain 010211 (dynamic POI), got: %s", payload)
	}

	// Should contain amount tag 54 with value
	if !strings.Contains(payload, "54") {
		t.Errorf("dynamic QR should contain amount tag 54")
	}
	// 5000 satang -> tag format is 54 + len("5000"=04) + "5000" = 54045000
	if !strings.Contains(payload, "5000") {
		t.Errorf("dynamic QR amount 5000 should appear in payload, got: %s", payload)
	}
}

func TestGeneratePayload_DifferentAmounts(t *testing.T) {
	tests := []struct {
		name       string
		phone      string
		amount     int
		expectPOI  string
		expectAmt  string // expected amount substring in tag 54
	}{
		{"amount 5000 satang (50 THB)", "0812345678", 5000, "010211", "5000"},
		{"amount 100000 satang (1000 THB)", "0812345678", 100000, "010211", "100000"},
		{"amount 0 satang (static)", "0812345678", 0, "010212", ""},
		{"amount 1 satang", "0899999999", 1, "010211", "1"},
		{"amount 99999999 satang", "0899999999", 99999999, "010211", "99999999"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			payload := GeneratePromptPayPayload(tt.phone, tt.amount)
			if !strings.Contains(payload, tt.expectPOI) {
				t.Errorf("expected POI %s, got: %s", tt.expectPOI, payload)
			}
			if tt.expectAmt != "" {
				// amount tag is 54 + len(amountStr as 2 digits) + amountStr
				if !strings.Contains(payload, tt.expectAmt) {
					t.Errorf("expected amount %s in payload, got: %s", tt.expectAmt, payload)
				}
			} else {
				if strings.Contains(payload, "54") {
					t.Errorf("expected no amount tag, but found 54 in: %s", payload)
				}
			}
		})
	}
}

// ── Phone Format Conversion Tests ─────────────────────────────────────────

func TestGeneratePayload_PhoneFormatConversion(t *testing.T) {
	tests := []struct {
		name     string
		phone    string
		expected string // substring that should be in the payload
	}{
		{"08xxxxxxxx format", "0812345678", "0066812345678"},
		{"0899999999 format", "0899999999", "0066899999999"},
		{"0811111111 format", "0811111111", "0066811111111"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			payload := GeneratePromptPayPayload(tt.phone, 0)
			if !strings.Contains(payload, tt.expected) {
				t.Errorf("phone %s should convert to %s in payload, got: %s", tt.phone, tt.expected, payload)
			}
		})
	}
}

// ── QR PNG Generation Tests ──────────────────────────────────────────────

func TestGeneratePromptPayQR_Valid(t *testing.T) {
	png, err := GeneratePromptPayQR("0812345678", 5000)
	if err != nil {
		t.Fatalf("GeneratePromptPayQR failed: %v", err)
	}
	if len(png) == 0 {
		t.Error("GeneratePromptPayQR returned empty PNG data")
	}

	// PNG magic bytes
	if len(png) < 8 {
		t.Error("PNG data too short")
	} else {
		pngHeader := []byte{137, 80, 78, 71, 13, 10, 26, 10}
		for i := 0; i < 8; i++ {
			if png[i] != pngHeader[i] {
				t.Errorf("invalid PNG header at byte %d: got %d, want %d", i, png[i], pngHeader[i])
			}
		}
	}
}

func TestGeneratePromptPayQR_Static(t *testing.T) {
	png, err := GeneratePromptPayQR("0812345678", 0)
	if err != nil {
		t.Fatalf("GeneratePromptPayQR (static) failed: %v", err)
	}
	if len(png) == 0 {
		t.Error("GeneratePromptPayQR returned empty PNG data for static QR")
	}
}

func TestGeneratePromptPayQR_LargeAmount(t *testing.T) {
	png, err := GeneratePromptPayQR("0812345678", 100000)
	if err != nil {
		t.Fatalf("GeneratePromptPayQR (100000 satang) failed: %v", err)
	}
	if len(png) == 0 {
		t.Error("GeneratePromptPayQR returned empty PNG data for large amount")
	}
}

// ── Payload Completeness Tests ────────────────────────────────────────────

func TestGeneratePayload_ContainsAllMandatoryTags(t *testing.T) {
	tests := []struct {
		phone  string
		amount int
	}{
		{"0812345678", 0},
		{"0812345678", 5000},
		{"0899999999", 100000},
		{"0811111111", 1},
	}

	for _, tt := range tests {
		payload := GeneratePromptPayPayload(tt.phone, tt.amount)

		// Ensure payload starts with "000201" (Payload Format Indicator v2.1)
		if !strings.HasPrefix(payload, "000201") {
			t.Errorf("payload must start with 000201, got: %s", payload[:12])
		}

		// Ensure payload ends with "6304" + 4 hex CRC chars
		if !strings.Contains(payload, "6304") {
			t.Errorf("payload missing CRC tag 6304: %s", payload)
		}
		idx := strings.LastIndex(payload, "6304")
		if idx < 0 || idx+8 > len(payload) {
			t.Errorf("malformed CRC section in: %s", payload)
		}

		// Currency THB (764)
		if !strings.Contains(payload, "5303764") {
			t.Errorf("payload missing currency tag 5303764: %s", payload)
		}

		// Country TH
		if !strings.Contains(payload, "5802TH") {
			t.Errorf("payload missing country tag 5802TH: %s", payload)
		}

		// Point of Initiation
		if !strings.Contains(payload, "0102") {
			t.Errorf("payload missing Point of Initiation: %s", payload)
		}

		// Merchant account info tag 29
		if !strings.Contains(payload, "29") {
			t.Errorf("payload missing merchant account info tag 29: %s", payload)
		}
	}
}

// ── CRC16 Self-Consistency Test ───────────────────────────────────────────

func TestCRC16_Idempotent(t *testing.T) {
	// CRC is deterministic
	data := []byte("00020101021229300016A00000067701011101130066812345678953037645802TH6304")
	result1 := crc16(data)
	result2 := crc16(data)
	if result1 != result2 {
		t.Errorf("crc16 not deterministic: %s vs %s", result1, result2)
	}
}

// ── Edge Cases ────────────────────────────────────────────────────────────

func TestGeneratePayload_MinimalAmount_OneSatang(t *testing.T) {
	payload := GeneratePromptPayPayload("0812345678", 1)
	if !strings.Contains(payload, "010211") {
		t.Error("amount=1 should produce dynamic QR")
	}
	if !strings.Contains(payload, "5303764") {
		t.Error("payload should contain currency tag")
	}
}

func TestGeneratePayload_MaxAmount(t *testing.T) {
	// Very large amount — just ensure no panic
	payload := GeneratePromptPayPayload("0812345678", 999999999)
	if len(payload) < 50 {
		t.Errorf("payload unexpectedly short for large amount: %s", payload)
	}
}

func TestGeneratePromptPayQR_DifferentPhones(t *testing.T) {
	phones := []string{"0812345678", "0899999999", "0811111111", "0822222222"}
	for _, phone := range phones {
		png, err := GeneratePromptPayQR(phone, 100)
		if err != nil {
			t.Errorf("GeneratePromptPayQR(%s, 100) failed: %v", phone, err)
		}
		if len(png) == 0 {
			t.Errorf("GeneratePromptPayQR(%s, 100) returned empty data", phone)
		}
	}
}
