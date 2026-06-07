package handler

import (
	"net/http"
	"strconv"

	"api/qr"
	"api/repository"

	"github.com/jackc/pgx/v5/pgxpool"
)

// QRHandler serves PromptPay QR code images.
type QRHandler struct {
	pool *pgxpool.Pool
}

// NewQRHandler creates a new QRHandler.
func NewQRHandler(pool *pgxpool.Pool) *QRHandler {
	return &QRHandler{pool: pool}
}

// Generate returns a PNG QR code for PromptPay payment.
// GET /api/qr/promptpay?amount=5000
// Uses the authenticated vendor's promptpay_id (phone number).
func (h *QRHandler) Generate(w http.ResponseWriter, r *http.Request) {
	vendorID, ok := r.Context().Value(VendorIDKey).(string)
	if !ok {
		errorJSON(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	vendor, err := repository.VendorGetByID(h.pool, vendorID)
	if err != nil {
		errorJSON(w, http.StatusNotFound, "vendor not found")
		return
	}

	if vendor.PromptpayID == "" {
		errorJSON(w, http.StatusBadRequest, "กรุณาตั้งค่า PromptPay ID ในหน้าการตั้งค่า")
		return
	}

	amount := 0
	amountStr := r.URL.Query().Get("amount")
	if amountStr != "" {
		amount, err = strconv.Atoi(amountStr)
		if err != nil || amount < 0 {
			errorJSON(w, http.StatusBadRequest, "invalid amount")
			return
		}
	}

	png, err := qr.GeneratePromptPayQR(vendor.PromptpayID, amount)
	if err != nil {
		errorJSON(w, http.StatusInternalServerError, "สร้าง QR Code ไม่สำเร็จ")
		return
	}

	w.Header().Set("Content-Type", "image/png")
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	w.Write(png)
}
