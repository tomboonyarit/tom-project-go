package db

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Connect creates a new pgxpool connection pool.
func Connect(databaseURL string) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("parse database url: %w", err)
	}

	pool, err := pgxpool.NewWithConfig(context.Background(), cfg)
	if err != nil {
		return nil, fmt.Errorf("create connection pool: %w", err)
	}

	if err := pool.Ping(context.Background()); err != nil {
		return nil, fmt.Errorf("ping database: %w", err)
	}

	return pool, nil
}

// RunMigrations reads all *.sql files from db/migrations/ sorted by name
// and executes each against the pool inside a transaction.
func RunMigrations(pool *pgxpool.Pool) error {
	entries, err := os.ReadDir("db/migrations")
	if err != nil {
		return fmt.Errorf("read migrations dir: %w", err)
	}

	var files []string
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".sql") {
			files = append(files, e.Name())
		}
	}
	sort.Strings(files)

	for _, f := range files {
		path := filepath.Join("db/migrations", f)
		sql, err := os.ReadFile(path)
		if err != nil {
			return fmt.Errorf("read migration %s: %w", f, err)
		}

		_, err = pool.Exec(context.Background(), string(sql))
		if err != nil {
			return fmt.Errorf("exec migration %s: %w", f, err)
		}
		fmt.Printf("migration applied: %s\n", f)
	}
	return nil
}
