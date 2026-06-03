package repository

import (
	"context"
	"fmt"
	"strings"

	"api/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

type ProductFilter struct {
	Search     string
	CategoryID *string
	VendorID   string
}

func ProductList(pool *pgxpool.Pool, filter ProductFilter) ([]models.Product, error) {
	where := []string{"p.vendor_id = $1"}
	args := []interface{}{filter.VendorID}
	i := 2

	if filter.Search != "" {
		where = append(where, fmt.Sprintf("p.name ILIKE $%d", i))
		args = append(args, "%"+filter.Search+"%")
		i++
	}
	if filter.CategoryID != nil && *filter.CategoryID != "" {
		where = append(where, fmt.Sprintf("p.category_id = $%d", i))
		args = append(args, *filter.CategoryID)
		i++
	}

	query := fmt.Sprintf(`
		SELECT p.id, p.vendor_id, p.category_id, COALESCE(c.name, '') as category_name,
		       p.name, p.price, p.unit, COALESCE(p.image_url, '') as image_url,
		       p.is_active, p.created_at, p.updated_at
		FROM products p
		LEFT JOIN categories c ON c.id = p.category_id
		WHERE %s
		ORDER BY p.created_at DESC`, strings.Join(where, " AND "))

	rows, err := pool.Query(context.Background(), query, args...)
	if err != nil {
		return nil, fmt.Errorf("list products: %w", err)
	}
	defer rows.Close()

	var products []models.Product
	for rows.Next() {
		var p models.Product
		err := rows.Scan(&p.ID, &p.VendorID, &p.CategoryID, &p.CategoryName, &p.Name, &p.Price, &p.Unit,
			&p.ImageURL, &p.IsActive, &p.CreatedAt, &p.UpdatedAt)
		if err != nil {
			return nil, fmt.Errorf("scan product: %w", err)
		}
		products = append(products, p)
	}
	if products == nil {
		products = []models.Product{}
	}
	return products, nil
}

func ProductGetByID(pool *pgxpool.Pool, vendorID, id string) (*models.Product, error) {
	p := &models.Product{}
	err := pool.QueryRow(
		context.Background(),
		`SELECT p.id, p.vendor_id, p.category_id, COALESCE(c.name, '') as category_name,
		        p.name, p.price, p.unit, COALESCE(p.image_url, '') as image_url,
		        p.is_active, p.created_at, p.updated_at
		 FROM products p
		 LEFT JOIN categories c ON c.id = p.category_id
		 WHERE p.id = $1 AND p.vendor_id = $2`,
		id, vendorID,
	).Scan(&p.ID, &p.VendorID, &p.CategoryID, &p.CategoryName, &p.Name, &p.Price, &p.Unit,
		&p.ImageURL, &p.IsActive, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("get product by id: %w", err)
	}
	return p, nil
}

func ProductCreate(pool *pgxpool.Pool, vendorID string, p *models.Product) error {
	p.VendorID = vendorID
	err := pool.QueryRow(
		context.Background(),
		`INSERT INTO products (vendor_id, category_id, name, price, unit, image_url, is_active)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING id, created_at, updated_at`,
		vendorID, p.CategoryID, p.Name, p.Price, p.Unit, p.ImageURL, p.IsActive,
	).Scan(&p.ID, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return fmt.Errorf("create product: %w", err)
	}
	// Fetch category_name if category_id is set
	if p.CategoryID != nil && *p.CategoryID != "" {
		_ = pool.QueryRow(context.Background(),
			`SELECT name FROM categories WHERE id = $1 AND vendor_id = $2`,
			*p.CategoryID, vendorID,
		).Scan(&p.CategoryName)
	}
	return nil
}

func ProductUpdate(pool *pgxpool.Pool, vendorID, id string, fields map[string]interface{}) error {
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
	args = append(args, id, vendorID)
	query := fmt.Sprintf("UPDATE products SET %s WHERE id = $%d AND vendor_id = $%d", setClauses, i, i+1)
	_, err := pool.Exec(context.Background(), query, args...)
	if err != nil {
		return fmt.Errorf("update product: %w", err)
	}
	return nil
}

func ProductDelete(pool *pgxpool.Pool, vendorID, id string) error {
	_, err := pool.Exec(context.Background(), `DELETE FROM products WHERE id = $1 AND vendor_id = $2`, id, vendorID)
	if err != nil {
		return fmt.Errorf("delete product: %w", err)
	}
	return nil
}

func ProductQuickCreate(pool *pgxpool.Pool, vendorID, name string, price int) (*models.Product, error) {
	p := &models.Product{
		VendorID: vendorID,
		Name:     name,
		Price:    price,
		Unit:     "ชิ้น",
	}
	err := pool.QueryRow(
		context.Background(),
		`INSERT INTO products (vendor_id, name, price, unit) VALUES ($1, $2, $3, $4)
		 RETURNING id, created_at, updated_at`,
		vendorID, p.Name, p.Price, p.Unit,
	).Scan(&p.ID, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("quick create product: %w", err)
	}
	return p, nil
}
