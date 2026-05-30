package db

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Pool is the global database connection pool.
var Pool *pgxpool.Pool

// Connect initializes the database connection pool with the given PostgreSQL URL.
// It pings the database to verify connectivity and configures pool settings.
func Connect(ctx context.Context, databaseURL string) error {
	if databaseURL == "" {
		return fmt.Errorf("DATABASE_URL is not set")
	}

	poolConfig, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return fmt.Errorf("failed to parse database URL: %w", err)
	}

	// Connection pool settings
	poolConfig.MaxConns = 20
	poolConfig.MinConns = 2
	poolConfig.MaxConnLifetime = 30 * time.Minute
	poolConfig.MaxConnIdleTime = 5 * time.Minute
	poolConfig.HealthCheckPeriod = 1 * time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, poolConfig)
	if err != nil {
		return fmt.Errorf("failed to create connection pool: %w", err)
	}

	// Verify connectivity
	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if err := pool.Ping(pingCtx); err != nil {
		pool.Close()
		return fmt.Errorf("failed to ping database: %w", err)
	}

	Pool = pool
	log.Println("Database connected successfully")
	return nil
}

// Close gracefully shuts down the connection pool.
func Close() {
	if Pool != nil {
		Pool.Close()
		log.Println("Database connection pool closed")
	}
}

// HealthCheck verifies the database is still reachable.
func HealthCheck(ctx context.Context) error {
	if Pool == nil {
		return fmt.Errorf("database pool is nil")
	}
	return Pool.Ping(ctx)
}
