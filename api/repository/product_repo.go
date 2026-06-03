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
}

func ProductList(pool *pgxpool.Pool, filter ProductFilter) ([]models.Product, error) {
	where := []string{"1=1"}
	args := []interface{}{}
	i := 1

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
		SELECT p.id, p.category_id, COALESCE(c.name, '') as category_name,
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
		err := rows.Scan(&p.ID, &p.CategoryID, &p.CategoryName, &p.Name, &p.Price, &p.Unit,
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

func ProductGetByID(pool *pgxpool.Pool, id string) (*models.Product, error) {
	p := &models.Product{}
	err := pool.QueryRow(
		context.Background(),
		`SELECT p.id, p.category_id, COALESCE(c.name, '') as category_name,
		        p.name, p.price, p.unit, COALESCE(p.image_url, '') as image_url,
		        p.is_active, p.created_at, p.updated_at
		 FROM products p
		 LEFT JOIN categories c ON c.id = p.category_id
		 WHERE p.id = $1`,
		id,
	).Scan(&p.ID, &p.CategoryID, &p.CategoryName, &p.Name, &p.Price, &p.Unit,
		&p.ImageURL, &p.IsActive, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("get product by id: %w", err)
	}
	return p, nil
}

func ProductCreate(pool *pgxpool.Pool, p *models.Product) error {
	err := pool.QueryRow(
		context.Background(),
		`INSERT INTO products (category_id, name, price, unit, image_url, is_active)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, created_at, updated_at`,
		p.CategoryID, p.Name, p.Price, p.Unit, p.ImageURL, p.IsActive,
	).Scan(&p.ID, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return fmt.Errorf("create product: %w", err)
	}
	return nil
}

func ProductUpdate(pool *pgxpool.Pool, id string, fields map[string]interface{}) error {
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
	query := fmt.Sprintf("UPDATE products SET %s WHERE id = $%d", setClauses, i)
	_, err := pool.Exec(context.Background(), query, args...)
	if err != nil {
		return fmt.Errorf("update product: %w", err)
	}
	return nil
}

func ProductDelete(pool *pgxpool.Pool, id string) error {
	_, err := pool.Exec(context.Background(), `DELETE FROM products WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete product: %w", err)
	}
	return nil
}

func ProductQuickCreate(pool *pgxpool.Pool, name string, price int) (*models.Product, error) {
	p := &models.Product{
		Name:  name,
		Price: price,
		Unit:  "ชิ้น",
	}
	err := pool.QueryRow(
		context.Background(),
		`INSERT INTO products (name, price, unit) VALUES ($1, $2, $3)
		 RETURNING id, created_at, updated_at`,
		p.Name, p.Price, p.Unit,
	).Scan(&p.ID, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("quick create product: %w", err)
	}
	return p, nil
}
