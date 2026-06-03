package repository

import (
	"context"
	"fmt"

	"api/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

func CategoryList(pool *pgxpool.Pool, vendorID string) ([]models.Category, error) {
	rows, err := pool.Query(
		context.Background(),
		`SELECT c.id, c.vendor_id, c.name, c.sort_order, c.created_at,
		        COUNT(p.id) AS product_count
		 FROM categories c
		 LEFT JOIN products p ON p.category_id = c.id AND p.vendor_id = $1
		 WHERE c.vendor_id = $1
		 GROUP BY c.id, c.vendor_id, c.name, c.sort_order, c.created_at
		 ORDER BY c.sort_order ASC, c.name ASC`,
		vendorID,
	)
	if err != nil {
		return nil, fmt.Errorf("list categories: %w", err)
	}
	defer rows.Close()

	var cats []models.Category
	for rows.Next() {
		var c models.Category
		err := rows.Scan(&c.ID, &c.VendorID, &c.Name, &c.SortOrder, &c.CreatedAt, &c.ProductCount)
		if err != nil {
			return nil, fmt.Errorf("scan category: %w", err)
		}
		cats = append(cats, c)
	}
	if cats == nil {
		cats = []models.Category{}
	}
	return cats, nil
}

func CategoryCreate(pool *pgxpool.Pool, vendorID, name string, sortOrder int) (*models.Category, error) {
	c := &models.Category{}
	err := pool.QueryRow(
		context.Background(),
		`INSERT INTO categories (vendor_id, name, sort_order) VALUES ($1, $2, $3)
		 RETURNING id, vendor_id, name, sort_order, created_at`,
		vendorID, name, sortOrder,
	).Scan(&c.ID, &c.VendorID, &c.Name, &c.SortOrder, &c.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("create category: %w", err)
	}
	return c, nil
}

func CategoryUpdate(pool *pgxpool.Pool, vendorID, id string, name string, sortOrder int) error {
	_, err := pool.Exec(
		context.Background(),
		`UPDATE categories SET name = $1, sort_order = $2 WHERE id = $3 AND vendor_id = $4`,
		name, sortOrder, id, vendorID,
	)
	if err != nil {
		return fmt.Errorf("update category: %w", err)
	}
	return nil
}

func CategoryDelete(pool *pgxpool.Pool, vendorID, id string) error {
	_, err := pool.Exec(
		context.Background(),
		`UPDATE products SET category_id = NULL WHERE category_id = $1 AND vendor_id = $2`,
		id, vendorID,
	)
	if err != nil {
		return fmt.Errorf("unset product categories: %w", err)
	}

	_, err = pool.Exec(
		context.Background(),
		`DELETE FROM categories WHERE id = $1 AND vendor_id = $2`,
		id, vendorID,
	)
	if err != nil {
		return fmt.Errorf("delete category: %w", err)
	}
	return nil
}
