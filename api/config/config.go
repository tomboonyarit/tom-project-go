package config

import (
	"log"
	"os"
	"strings"
)

// Config holds all application configuration loaded from environment / .env file.
type Config struct {
	Port        string
	DatabaseURL string
	JWTSecret   string
}

// Load reads .env if present, then os.Getenv for each required key with defaults.
func Load() *Config {
	loadDotEnv()

	cfg := &Config{
		Port:        getEnv("PORT", "8080"),
		DatabaseURL: getEnv("DATABASE_URL", ""),
		JWTSecret:   getEnv("JWT_SECRET", ""),
	}
	if cfg.DatabaseURL == "" {
		log.Fatal("DATABASE_URL is required")
	}
	if cfg.JWTSecret == "" {
		log.Fatal("JWT_SECRET is required")
	}
	return cfg
}

// loadDotEnv reads .env file lines (KEY=VALUE) and calls os.Setenv.
func loadDotEnv() {
	data, err := os.ReadFile(".env")
	if err != nil {
		// .env file is optional
		return
	}
	lines := strings.Split(string(data), "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		// Skip empty lines and comments
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}
		key := strings.TrimSpace(parts[0])
		val := strings.TrimSpace(parts[1])
		if key != "" {
			os.Setenv(key, val)
		}
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
