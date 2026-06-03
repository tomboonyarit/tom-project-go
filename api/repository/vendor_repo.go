package repository

import (
	"context"
	"fmt"

	"api/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

func VendorCreate(pool *pgxpool.Pool, v *models.Vendor) error {
	err := pool.QueryRow(
		context.Background(),
		`INSERT INTO vendors (phone, pin_hash, name, booth_name, promptpay_id)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, created_at, updated_at`,
		v.Phone, v.PinHash, v.Name, v.BoothName, v.PromptpayID,
	).Scan(&v.ID, &v.CreatedAt, &v.UpdatedAt)
	if err != nil {
		return fmt.Errorf("create vendor: %w", err)
	}
	return nil
}

func VendorFindByPhone(pool *pgxpool.Pool, phone string) (*models.Vendor, error) {
	v := &models.Vendor{}
	err := pool.QueryRow(
		context.Background(),
		`SELECT id, phone, pin_hash, name, booth_name, promptpay_id, created_at, updated_at
		 FROM vendors WHERE phone = $1`,
		phone,
	).Scan(&v.ID, &v.Phone, &v.PinHash, &v.Name, &v.BoothName, &v.PromptpayID, &v.CreatedAt, &v.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("find vendor by phone: %w", err)
	}
	return v, nil
}

func VendorGetByID(pool *pgxpool.Pool, id string) (*models.Vendor, error) {
	v := &models.Vendor{}
	err := pool.QueryRow(
		context.Background(),
		`SELECT id, phone, pin_hash, name, booth_name, promptpay_id, created_at, updated_at
		 FROM vendors WHERE id = $1`,
		id,
	).Scan(&v.ID, &v.Phone, &v.PinHash, &v.Name, &v.BoothName, &v.PromptpayID, &v.CreatedAt, &v.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("find vendor by id: %w", err)
	}
	return v, nil
}

func VendorUpdate(pool *pgxpool.Pool, id string, fields map[string]interface{}) error {
	if len(fields) == 0 {
		return nil
	}
	setClauses := ""
	args := []interface{}{}
	i := 1
	for col, val := range fields {
		if setClauses != "" {
			setClauses += ", "
		}
		setClauses += fmt.Sprintf("%s = $%d", col, i)
		args = append(args, val)
		i++
	}
	args = append(args, id)
	query := fmt.Sprintf("UPDATE vendors SET %s WHERE id = $%d", setClauses, i)
	_, err := pool.Exec(context.Background(), query, args...)
	if err != nil {
		return fmt.Errorf("update vendor: %w", err)
	}
	return nil
}
