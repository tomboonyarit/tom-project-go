package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("DATABASE_URL is not set")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		log.Fatalf("Failed to create connection pool: %v", err)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}

	// Get all tables
	rows, err := pool.Query(ctx, `
		SELECT table_name 
		FROM information_schema.tables 
		WHERE table_schema = 'public' 
		ORDER BY table_name
	`)
	if err != nil {
		log.Fatalf("Failed to query tables: %v", err)
	}
	defer rows.Close()

	fmt.Println("📋 Tables in database:")
	for rows.Next() {
		var tableName string
		if err := rows.Scan(&tableName); err != nil {
			log.Fatalf("Failed to scan: %v", err)
		}
		fmt.Printf("  ✅ %s\n", tableName)
	}

	// Check enum types
	enumRows, err := pool.Query(ctx, `
		SELECT t.typname
		FROM pg_type t
		JOIN pg_enum e ON t.oid = e.enumtypid
		WHERE t.typname IN ('user_role', 'market_status', 'booth_status', 'order_status', 'payment_status', 'payment_method')
		GROUP BY t.typname
		ORDER BY t.typname
	`)
	if err != nil {
		log.Fatalf("Failed to query enums: %v", err)
	}
	defer enumRows.Close()

	fmt.Println("\n📋 Enum types:")
	for enumRows.Next() {
		var enumName string
		if err := enumRows.Scan(&enumName); err != nil {
			log.Fatalf("Failed to scan: %v", err)
		}
		fmt.Printf("  ✅ %s\n", enumName)
	}

	fmt.Println("\n✅ Verification complete!")
}
