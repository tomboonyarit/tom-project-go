package handler

import (
	"net/http"
	"regexp"

	"api/repository"

	"github.com/jackc/pgx/v5/pgxpool"
)

type ReportHandler struct {
	pool *pgxpool.Pool
}

func NewReportHandler(pool *pgxpool.Pool) *ReportHandler {
	return &ReportHandler{pool: pool}
}

// DailyReport handles GET /api/reports/daily?date=2026-06-03
func (h *ReportHandler) DailyReport(w http.ResponseWriter, r *http.Request) {
	date := r.URL.Query().Get("date")
	if date == "" {
		errorJSON(w, http.StatusBadRequest, "date query parameter is required (YYYY-MM-DD)")
		return
	}

	dateRegex := regexp.MustCompile(`^\d{4}-\d{2}-\d{2}$`)
	if !dateRegex.MatchString(date) {
		errorJSON(w, http.StatusBadRequest, "invalid date format, expected YYYY-MM-DD")
		return
	}

	report, err := repository.DailyReport(h.pool, date)
	if err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to generate daily report")
		return
	}

	writeJSON(w, http.StatusOK, report)
}

// MonthlyReport handles GET /api/reports/monthly?month=2026-06
func (h *ReportHandler) MonthlyReport(w http.ResponseWriter, r *http.Request) {
	month := r.URL.Query().Get("month")
	if month == "" {
		errorJSON(w, http.StatusBadRequest, "month query parameter is required (YYYY-MM)")
		return
	}

	monthRegex := regexp.MustCompile(`^\d{4}-\d{2}$`)
	if !monthRegex.MatchString(month) {
		errorJSON(w, http.StatusBadRequest, "invalid month format, expected YYYY-MM")
		return
	}

	report, err := repository.MonthlyReport(h.pool, month)
	if err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to generate monthly report")
		return
	}

	writeJSON(w, http.StatusOK, report)
}
