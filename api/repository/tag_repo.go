package repository

import (
	"context"

	"api/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

func TagList(pool *pgxpool.Pool, vendorID string) ([]models.CustomerTag, error) {
	rows, err := pool.Query(context.Background(),
		`SELECT id, vendor_id, name, sort_order, created_at FROM customer_tags WHERE vendor_id = $1 ORDER BY sort_order, name`,
		vendorID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tags []models.CustomerTag
	for rows.Next() {
		var t models.CustomerTag
		if err := rows.Scan(&t.ID, &t.VendorID, &t.Name, &t.SortOrder, &t.CreatedAt); err != nil {
			return nil, err
		}
		tags = append(tags, t)
	}
	if tags == nil {
		tags = []models.CustomerTag{}
	}
	return tags, nil
}

func TagCreate(pool *pgxpool.Pool, vendorID, name string) (*models.CustomerTag, error) {
	t := &models.CustomerTag{Name: name}
	err := pool.QueryRow(context.Background(),
		`INSERT INTO customer_tags (vendor_id, name) VALUES ($1, $2) RETURNING id, vendor_id, sort_order, created_at`,
		vendorID, name,
	).Scan(&t.ID, &t.VendorID, &t.SortOrder, &t.CreatedAt)
	if err != nil {
		return nil, err
	}
	return t, nil
}

func TagUpdate(pool *pgxpool.Pool, vendorID, id, name string, sortOrder int) (*models.CustomerTag, error) {
	t := &models.CustomerTag{}
	err := pool.QueryRow(context.Background(),
		`UPDATE customer_tags SET name = $1, sort_order = $2 WHERE id = $3 AND vendor_id = $4
		 RETURNING id, vendor_id, name, sort_order, created_at`,
		name, sortOrder, id, vendorID,
	).Scan(&t.ID, &t.VendorID, &t.Name, &t.SortOrder, &t.CreatedAt)
	if err != nil {
		return nil, err
	}
	return t, nil
}

func TagDelete(pool *pgxpool.Pool, vendorID, id string) error {
	_, err := pool.Exec(context.Background(), `DELETE FROM customer_tags WHERE id = $1 AND vendor_id = $2`, id, vendorID)
	return err
}
