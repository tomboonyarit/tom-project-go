package config

import (
	"bufio"
	"log"
	"os"
	"strings"
)

// Config holds application configuration loaded from environment variables.
type Config struct {
	Port        string
	DatabaseURL string
	JWTSecret   string
}

// Load reads configuration from environment variables with sensible defaults.
// It also attempts to load variables from a .env file if present.
func Load() *Config {
	loadDotEnv()

	return &Config{
		Port:        getEnv("PORT", "8080"),
		DatabaseURL: getEnv("DATABASE_URL", ""),
		JWTSecret:   getEnv("JWT_SECRET", "change-me-in-production"),
	}
}

// loadDotEnv reads key=value pairs from a .env file and sets them as
// environment variables (only if not already set).
func loadDotEnv() {
	file, err := os.Open(".env")
	if err != nil {
		// .env file is optional
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
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
		if key != "" && os.Getenv(key) == "" {
			os.Setenv(key, val)
			log.Printf("Loaded %s from .env", key)
		}
	}
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
