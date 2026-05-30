package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"api/config"
	"api/db"
	"api/handler"
	"api/repository"
)

func main() {
	// Load configuration
	cfg := config.Load()

	// Connect to database
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	if err := db.Connect(ctx, cfg.DatabaseURL); err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Set JWT secret
	handler.SetJWTSecret(cfg.JWTSecret)

	// Initialize repositories
	userRepo := repository.NewUserRepo(db.Pool)
	marketRepo := repository.NewMarketRepo(db.Pool)
	boothRepo := repository.NewBoothRepo(db.Pool)
	categoryRepo := repository.NewCategoryRepo(db.Pool)
	productRepo := repository.NewProductRepo(db.Pool)
	orderRepo := repository.NewOrderRepo(db.Pool)
	orderItemRepo := repository.NewOrderItemRepo(db.Pool)
	orderHistRepo := repository.NewOrderHistoryRepo(db.Pool)
	cartRepo := repository.NewCartRepo(db.Pool)
	cartItemRepo := repository.NewCartItemRepo(db.Pool)

	// Initialize handlers
	authHandler := handler.NewAuthHandler(userRepo)
	userHandler := handler.NewUserHandler(userRepo)
	marketHandler := handler.NewMarketHandler(marketRepo)
	boothHandler := handler.NewBoothHandler(boothRepo)
	productHandler := handler.NewProductHandler(productRepo, categoryRepo)
	orderHandler := handler.NewOrderHandler(orderRepo, orderItemRepo, orderHistRepo)
	cartHandler := handler.NewCartHandler(cartRepo, cartItemRepo)
	vendorHandler := handler.NewVendorHandler(orderRepo, orderItemRepo, boothRepo, productRepo, userRepo, categoryRepo)
	adminHandler := handler.NewAdminHandler(userRepo, marketRepo, boothRepo, categoryRepo, orderRepo)

	// Setup HTTP server with routes
	mux := http.NewServeMux()

	// Health check
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		status := "ok"
		dbStatus := "connected"
		statusCode := http.StatusOK

		if err := db.HealthCheck(r.Context()); err != nil {
			status = "degraded"
			dbStatus = "disconnected"
			statusCode = http.StatusServiceUnavailable
		}

		w.WriteHeader(statusCode)
		json.NewEncoder(w).Encode(map[string]string{
			"status":   status,
			"database": dbStatus,
		})
	})

	// API Router — ALL /api/ routes go through CORS + logging middleware
	apiRouter := http.NewServeMux()

	// Public routes (no auth required)
	apiRouter.HandleFunc("POST /api/auth/register", authHandler.Register)
	apiRouter.HandleFunc("POST /api/auth/login", authHandler.Login)
	apiRouter.HandleFunc("GET /api/markets", marketHandler.List)
	apiRouter.HandleFunc("GET /api/markets/{id}", marketHandler.GetByID)
	apiRouter.HandleFunc("GET /api/markets/{marketId}/booths", boothHandler.ListByMarket)
	apiRouter.HandleFunc("GET /api/booths/{id}", boothHandler.GetByID)
	apiRouter.HandleFunc("GET /api/categories", productHandler.ListCategories)
	apiRouter.HandleFunc("GET /api/booths/{boothId}/products", productHandler.ListByBooth)
	apiRouter.HandleFunc("GET /api/products/{id}", productHandler.GetProduct)

	// Protected routes (auth required)
	apiRouter.HandleFunc("GET /api/users/me", userHandler.GetProfile)
	apiRouter.HandleFunc("PUT /api/users/me", userHandler.UpdateProfile)
	apiRouter.HandleFunc("POST /api/markets", marketHandler.Create)
	apiRouter.HandleFunc("PUT /api/markets/{id}", marketHandler.Update)
	apiRouter.HandleFunc("DELETE /api/markets/{id}", marketHandler.Delete)
	apiRouter.HandleFunc("POST /api/markets/{marketId}/booths", boothHandler.Create)
	apiRouter.HandleFunc("PUT /api/booths/{id}", boothHandler.Update)
	apiRouter.HandleFunc("DELETE /api/booths/{id}", boothHandler.Delete)
	apiRouter.HandleFunc("POST /api/booths/{boothId}/products", productHandler.CreateProduct)
	apiRouter.HandleFunc("PUT /api/products/{id}", productHandler.UpdateProduct)
	apiRouter.HandleFunc("DELETE /api/products/{id}", productHandler.DeleteProduct)
	apiRouter.HandleFunc("POST /api/orders", orderHandler.Create)
	apiRouter.HandleFunc("GET /api/orders", orderHandler.List)
	apiRouter.HandleFunc("GET /api/orders/{id}", orderHandler.GetByID)
	apiRouter.HandleFunc("PUT /api/orders/{id}/status", orderHandler.UpdateStatus)
	apiRouter.HandleFunc("PUT /api/orders/{id}/payment", orderHandler.UpdatePayment)
	apiRouter.HandleFunc("GET /api/cart", cartHandler.GetCart)
	apiRouter.HandleFunc("POST /api/cart/items", cartHandler.AddItem)
	apiRouter.HandleFunc("PUT /api/cart/items/{id}", cartHandler.UpdateItem)
	apiRouter.HandleFunc("DELETE /api/cart/items/{id}", cartHandler.RemoveItem)
	apiRouter.HandleFunc("DELETE /api/cart", cartHandler.ClearCart)

	// Vendor routes (protected)
	apiRouter.HandleFunc("POST /api/vendor/orders", vendorHandler.CreateOrder)
	apiRouter.HandleFunc("GET /api/vendor/orders", vendorHandler.ListOrders)
	apiRouter.HandleFunc("GET /api/vendor/orders/{id}", vendorHandler.GetOrder)
	apiRouter.HandleFunc("PUT /api/vendor/orders/{id}/status", vendorHandler.UpdateStatus)
	apiRouter.HandleFunc("GET /api/vendor/booths", vendorHandler.ListBooths)
	apiRouter.HandleFunc("GET /api/vendor/products", vendorHandler.SearchProducts)
	apiRouter.HandleFunc("GET /api/vendor/products/list", vendorHandler.ListVendorProducts)
	apiRouter.HandleFunc("GET /api/vendor/categories", vendorHandler.ListVendorCategories)
	apiRouter.HandleFunc("POST /api/vendor/categories", vendorHandler.CreateVendorCategory)
	apiRouter.HandleFunc("PUT /api/vendor/categories/{id}", vendorHandler.UpdateVendorCategory)
	apiRouter.HandleFunc("DELETE /api/vendor/categories/{id}", vendorHandler.DeleteVendorCategory)

	// Admin routes (protected, admin-only via AdminOnly wrapper)
	apiRouter.HandleFunc("GET /api/admin/dashboard", handler.AdminOnly(adminHandler.GetDashboard))
	apiRouter.HandleFunc("GET /api/admin/markets", handler.AdminOnly(adminHandler.ListMarkets))
	apiRouter.HandleFunc("POST /api/admin/markets", handler.AdminOnly(adminHandler.CreateMarket))
	apiRouter.HandleFunc("GET /api/admin/markets/{id}", handler.AdminOnly(adminHandler.GetMarket))
	apiRouter.HandleFunc("PUT /api/admin/markets/{id}", handler.AdminOnly(adminHandler.UpdateMarket))
	apiRouter.HandleFunc("DELETE /api/admin/markets/{id}", handler.AdminOnly(adminHandler.DeleteMarket))
	apiRouter.HandleFunc("GET /api/admin/booths", handler.AdminOnly(adminHandler.ListBooths))
	apiRouter.HandleFunc("PUT /api/admin/booths/{id}/status", handler.AdminOnly(adminHandler.UpdateBoothStatus))
	apiRouter.HandleFunc("GET /api/admin/users", handler.AdminOnly(adminHandler.ListUsers))
	apiRouter.HandleFunc("PUT /api/admin/users/{id}", handler.AdminOnly(adminHandler.UpdateUser))
	apiRouter.HandleFunc("POST /api/admin/categories", handler.AdminOnly(adminHandler.CreateCategory))
	apiRouter.HandleFunc("PUT /api/admin/categories/{id}", handler.AdminOnly(adminHandler.UpdateCategory))
	apiRouter.HandleFunc("DELETE /api/admin/categories/{id}", handler.AdminOnly(adminHandler.DeleteCategory))
	apiRouter.HandleFunc("GET /api/admin/reports/sales", handler.AdminOnly(adminHandler.GetSalesReport))

	// Wrap with middleware: CORS → Logging → Auth-check → apiRouter
	mux.Handle("/api/", handler.CORSMiddleware(handler.LoggingMiddleware(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// List of public path prefixes (GET only)
			publicGET := []string{
				"/api/markets", "/api/booths",
				"/api/categories", "/api/products",
			}
			// List of fully public paths (any method)
			publicAny := map[string]bool{
				"/api/auth/register": true,
				"/api/auth/login":    true,
			}

			path := r.URL.Path

			// Check if this is a fully public route
			if publicAny[path] {
				apiRouter.ServeHTTP(w, r)
				return
			}

			// Check if this is a public GET route
			if r.Method == "GET" {
				for _, prefix := range publicGET {
					if len(path) >= len(prefix) && path[:len(prefix)] == prefix {
						apiRouter.ServeHTTP(w, r)
						return
					}
				}
			}

			// All other routes require authentication
			handler.AuthMiddleware(apiRouter).ServeHTTP(w, r)
		}),
	)))

	server := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: mux,
	}

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		log.Printf("🚀 Server starting on :%s", cfg.Port)
		log.Printf("📋 API endpoints:")
		log.Printf("   POST /api/auth/register  - Register")
		log.Printf("   POST /api/auth/login     - Login")
		log.Printf("   GET  /api/markets        - List markets")
		log.Printf("   GET  /api/categories     - List categories")
		log.Printf("   GET  /health             - Health check")
		log.Printf("🔒 Protected endpoints available under /api/")

		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed: %v", err)
		}
	}()

	<-quit
	log.Println("Shutting down server...")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutdownCancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited gracefully")
}
