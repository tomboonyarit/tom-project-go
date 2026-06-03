package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"api/config"
	"api/db"
	"api/handler"
)

func main() {
	// ── Load configuration ──────────────────────────────────────────────
	cfg := config.Load()

	// ── Database connection ─────────────────────────────────────────────
	pool, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("database connection failed: %v", err)
	}
	defer pool.Close()

	// ── Run migrations ──────────────────────────────────────────────────
	if err := db.RunMigrations(pool); err != nil {
		log.Fatalf("migrations failed: %v", err)
	}

	// ── Initialise handlers ─────────────────────────────────────────────
	authHandler := handler.NewAuthHandler(pool, cfg.JWTSecret)
	productHandler := handler.NewProductHandler(pool)
	categoryHandler := handler.NewCategoryHandler(pool)
	orderHandler := handler.NewOrderHandler(pool)
	profileHandler := handler.NewProfileHandler(pool)
	reportHandler := handler.NewReportHandler(pool)

	// ── Router ──────────────────────────────────────────────────────────
	mux := http.NewServeMux()

	// Health check
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})

	// Auth (public)
	mux.HandleFunc("POST /api/auth/register", authHandler.Register)
	mux.HandleFunc("POST /api/auth/login", authHandler.Login)

	// Auth middleware wrapper
	authMW := handler.AuthMiddleware(cfg.JWTSecret)

	// Products (protected)
	mux.Handle("GET /api/products", authMW(http.HandlerFunc(productHandler.List)))
	mux.Handle("POST /api/products", authMW(http.HandlerFunc(productHandler.Create)))
	mux.Handle("PUT /api/products/{id}", authMW(http.HandlerFunc(productHandler.Update)))
	mux.Handle("DELETE /api/products/{id}", authMW(http.HandlerFunc(productHandler.Delete)))
	mux.Handle("POST /api/products/quick", authMW(http.HandlerFunc(productHandler.QuickCreate)))

	// Categories (protected)
	mux.Handle("GET /api/categories", authMW(http.HandlerFunc(categoryHandler.List)))
	mux.Handle("POST /api/categories", authMW(http.HandlerFunc(categoryHandler.Create)))
	mux.Handle("PUT /api/categories/{id}", authMW(http.HandlerFunc(categoryHandler.Update)))
	mux.Handle("DELETE /api/categories/{id}", authMW(http.HandlerFunc(categoryHandler.Delete)))

	// Orders (protected)
	mux.Handle("POST /api/orders", authMW(http.HandlerFunc(orderHandler.Create)))
	mux.Handle("GET /api/orders", authMW(http.HandlerFunc(orderHandler.List)))
	mux.Handle("GET /api/orders/{id}", authMW(http.HandlerFunc(orderHandler.GetByID)))
	mux.Handle("PUT /api/orders/{id}/status", authMW(http.HandlerFunc(orderHandler.UpdateStatus)))
	mux.Handle("PUT /api/orders/{id}/payment", authMW(http.HandlerFunc(orderHandler.UpdatePayment)))
	mux.Handle("PUT /api/orders/{id}/tags", authMW(http.HandlerFunc(orderHandler.UpdateTags)))

	// Profile (protected)
	mux.Handle("GET /api/profile", authMW(http.HandlerFunc(profileHandler.Get)))
	mux.Handle("PUT /api/profile", authMW(http.HandlerFunc(profileHandler.Update)))

	// QR Code (protected)
	qrHandler := handler.NewQRHandler(pool)
	mux.Handle("GET /api/qr/promptpay", authMW(http.HandlerFunc(qrHandler.Generate)))

	// Customer Tags (protected)
	tagHandler := handler.NewTagHandler(pool)
	mux.Handle("GET /api/tags", authMW(http.HandlerFunc(tagHandler.List)))
	mux.Handle("POST /api/tags", authMW(http.HandlerFunc(tagHandler.Create)))
	mux.Handle("DELETE /api/tags/{id}", authMW(http.HandlerFunc(tagHandler.Delete)))

	// Reports (protected)
	mux.Handle("GET /api/reports/daily", authMW(http.HandlerFunc(reportHandler.DailyReport)))
	mux.Handle("GET /api/reports/monthly", authMW(http.HandlerFunc(reportHandler.MonthlyReport)))

	// ── Global middleware (CORS → Logging) ──────────────────────────────
	var finalHandler http.Handler = mux
	finalHandler = handler.CORSMiddleware(finalHandler)
	finalHandler = handler.LoggingMiddleware(finalHandler)

	// ── Server ──────────────────────────────────────────────────────────
	server := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      finalHandler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	go func() {
		log.Printf("Talad Nod POS API starting on port %s", cfg.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server error: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("shutting down server...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("forced shutdown: %v", err)
	}
	log.Println("server stopped")
}
