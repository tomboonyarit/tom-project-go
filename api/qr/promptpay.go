package qr

import (
	"fmt"
	"strings"

	qrcode "github.com/skip2/go-qrcode"
)

// GeneratePromptPayQR creates a PNG QR code image ([]byte) for Thai PromptPay.
//
// phone:    Thai phone number, 10 digits starting with 0 (e.g. "0812345678")
// amount:   Amount in satang. 0 = static QR (no amount), >0 = dynamic QR with amount.
// Returns raw PNG bytes ready to serve or display.
func GeneratePromptPayQR(phone string, amount int) ([]byte, error) {
	payload := generatePayload(phone, amount)
	png, err := qrcode.Encode(payload, qrcode.Medium, 256)
	if err != nil {
		return nil, fmt.Errorf("generate QR: %w", err)
	}
	return png, nil
}

// generatePayload creates the EMVCo QR string for Thai PromptPay credit transfer.
// Reference: Thai PromptPay QR Code Specification (Tag30 — Credit Transfer)
func generatePayload(phone string, amount int) string {
	// Normalise phone: 08XXXXXXXX → 0066XXXXXXXXX (13 digits)
	phone13 := "0066" + phone[1:]

	// Build merchant account information (Tag 29 — Merchant Presented QR)
	// Subtag 00: PromptPay Application ID
	aid := "0016A000000677010111"
	// Subtag 01: PromptPay ID (phone number)
	phoneLen := fmt.Sprintf("%02d", len(phone13))
	phoneTag := "01" + phoneLen + phone13

	tag30Value := aid + phoneTag
	tag30Len := fmt.Sprintf("%02d", len(tag30Value))
	tag30 := "29" + tag30Len + tag30Value

	// Point of Initiation Method
	// Tag 01: "11" = dynamic QR (amount may change), "12" = static QR (reusable)
	poi := "010212" // default: static QR
	if amount > 0 {
		poi = "010211" // dynamic QR with fixed amount
	}

	// Build payload (everything before CRC)
	var b strings.Builder
	b.WriteString("000201")  // Payload Format Indicator v2.1
	b.WriteString(poi)       // Point of Initiation
	b.WriteString(tag30)     // Merchant Account Info
	b.WriteString("5303764") // Currency: THB (764)

	// Transaction Amount (optional — Tag 54)
	// EMVCo format: amount as string, last 2 digits = decimal fraction
	// e.g. 5000 satang → "5000" (interpreted as 50.00 THB)
	if amount > 0 {
		amountStr := fmt.Sprintf("%d", amount)
		amtLen := fmt.Sprintf("%02d", len(amountStr))
		b.WriteString("54" + amtLen + amountStr)
	}

	b.WriteString("5802TH") // Country Code: TH

	// CRC16 checksum (Tag 63) — computed over all preceding data
	data := b.String()
	crc := crc16([]byte(data))
	b.WriteString("6304" + crc)

	return b.String()
}

// crc16 computes CRC-16-CCITT (poly 0x1021, init 0xFFFF) over data.
func crc16(data []byte) string {
	crc := uint16(0xFFFF)
	for _, b := range data {
		crc ^= uint16(b) << 8
		for i := 0; i < 8; i++ {
			if crc&0x8000 != 0 {
				crc = (crc << 1) ^ 0x1021
			} else {
				crc <<= 1
			}
		}
	}
	return fmt.Sprintf("%04X", crc)
}

// GeneratePromptPayPayload returns just the EMVCo string (no PNG).
// Useful if you want to encode it yourself.
func GeneratePromptPayPayload(phone string, amount int) string {
	return generatePayload(phone, amount)
}


