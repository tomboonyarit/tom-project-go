package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"api/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type CategoryRepo struct {
	pool *pgxpool.Pool
}

func NewCategoryRepo(pool *pgxpool.Pool) *CategoryRepo {
	return &CategoryRepo{pool: pool}
}

// --- Category CRUD ---

func (r *CategoryRepo) Create(ctx context.Context, input models.CreateCategoryInput) (*models.Category, error) {
	c := &models.Category{}
	sortOrder := 0
	if input.SortOrder != nil {
		sortOrder = *input.SortOrder
	}
	err := r.pool.QueryRow(ctx, `
		INSERT INTO categories (name, slug, description, image_url, parent_id, sort_order, vendor_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, name, slug, description, image_url, parent_id, sort_order, is_active, vendor_id, created_at
	`, input.Name, input.Slug, input.Description, input.ImageURL, input.ParentID, sortOrder, input.VendorID).Scan(
		&c.ID, &c.Name, &c.Slug, &c.Description, &c.ImageURL,
		&c.ParentID, &c.SortOrder, &c.IsActive, &c.VendorID, &c.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return c, nil
}

func (r *CategoryRepo) FindByID(ctx context.Context, id string) (*models.Category, error) {
	c := &models.Category{}
	err := r.pool.QueryRow(ctx, `
		SELECT id, name, slug, description, image_url, parent_id, sort_order, is_active, vendor_id, created_at
		FROM categories WHERE id = $1
	`, id).Scan(
		&c.ID, &c.Name, &c.Slug, &c.Description, &c.ImageURL,
		&c.ParentID, &c.SortOrder, &c.IsActive, &c.VendorID, &c.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return c, nil
}

func (r *CategoryRepo) FindBySlug(ctx context.Context, slug string) (*models.Category, error) {
	c := &models.Category{}
	err := r.pool.QueryRow(ctx, `
		SELECT id, name, slug, description, image_url, parent_id, sort_order, is_active, vendor_id, created_at
		FROM categories WHERE slug = $1
	`, slug).Scan(
		&c.ID, &c.Name, &c.Slug, &c.Description, &c.ImageURL,
		&c.ParentID, &c.SortOrder, &c.IsActive, &c.VendorID, &c.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return c, nil
}

func (r *CategoryRepo) Update(ctx context.Context, id string, input models.UpdateCategoryInput) (*models.Category, error) {
	c, err := r.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if c == nil {
		return nil, nil
	}

	if input.Name != nil {
		c.Name = *input.Name
	}
	if input.Slug != nil {
		c.Slug = *input.Slug
	}
	if input.Description != nil {
		c.Description = input.Description
	}
	if input.ImageURL != nil {
		c.ImageURL = input.ImageURL
	}
	if input.ParentID != nil {
		c.ParentID = input.ParentID
	}
	if input.SortOrder != nil {
		c.SortOrder = *input.SortOrder
	}
	if input.IsActive != nil {
		c.IsActive = *input.IsActive
	}

	_, err = r.pool.Exec(ctx, `
		UPDATE categories SET name=$1, slug=$2, description=$3, image_url=$4,
		   parent_id=$5, sort_order=$6, is_active=$7
		WHERE id=$8
	`, c.Name, c.Slug, c.Description, c.ImageURL, c.ParentID, c.SortOrder, c.IsActive, id)
	if err != nil {
		return nil, err
	}

	return c, nil
}

func (r *CategoryRepo) Delete(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM categories WHERE id=$1`, id)
	return err
}

func (r *CategoryRepo) List(ctx context.Context, activeOnly bool, vendorID *string) ([]models.Category, error) {
	query := `SELECT id, name, slug, description, image_url, parent_id, sort_order, is_active, vendor_id, created_at
	           FROM categories`
	args := []interface{}{}
	argIdx := 0

	if activeOnly && vendorID != nil {
		argIdx++
		query += fmt.Sprintf(" WHERE is_active = true AND (vendor_id = $%d OR vendor_id IS NULL)", argIdx)
		args = append(args, *vendorID)
	} else if activeOnly {
		query += " WHERE is_active = true"
	} else if vendorID != nil {
		argIdx++
		query += fmt.Sprintf(" WHERE (vendor_id = $%d OR vendor_id IS NULL)", argIdx)
		args = append(args, *vendorID)
	}
	query += " ORDER BY sort_order, name"

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var categories []models.Category
	for rows.Next() {
		var c models.Category
		if err := rows.Scan(&c.ID, &c.Name, &c.Slug, &c.Description, &c.ImageURL,
			&c.ParentID, &c.SortOrder, &c.IsActive, &c.VendorID, &c.CreatedAt); err != nil {
			return nil, err
		}
		categories = append(categories, c)
	}
	return categories, nil
}

// --- Product CRUD ---

type ProductRepo struct {
	pool *pgxpool.Pool
}

func NewProductRepo(pool *pgxpool.Pool) *ProductRepo {
	return &ProductRepo{pool: pool}
}

func (r *ProductRepo) Create(ctx context.Context, input models.CreateProductInput, vendorID string) (*models.Product, error) {
	p := &models.Product{}
	unit := "ชิ้น"
	if input.Unit != nil {
		unit = *input.Unit
	}
	isAvailable := true
	if input.IsAvailable != nil {
		isAvailable = *input.IsAvailable
	}
	isFeatured := false
	if input.IsFeatured != nil {
		isFeatured = *input.IsFeatured
	}

	imageURLs := []byte("[]")
	if len(input.ImageURLs) > 0 {
		data, _ := json.Marshal(input.ImageURLs)
		imageURLs = data
	}

	err := r.pool.QueryRow(ctx, `
		INSERT INTO products (booth_id, vendor_id, category_id, name, description, price, sale_price, image_urls, stock_quantity, unit, is_available, is_featured)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING id, booth_id, vendor_id, category_id, name, description, price, sale_price, image_urls, stock_quantity, unit, is_available, is_featured, created_at, updated_at
	`, input.BoothID, vendorID, input.CategoryID, input.Name, input.Description,
		input.Price, input.SalePrice, imageURLs, input.StockQuantity, unit,
		isAvailable, isFeatured).Scan(
		&p.ID, &p.BoothID, &p.VendorID, &p.CategoryID, &p.Name, &p.Description,
		&p.Price, &p.SalePrice, &p.ImageURLs, &p.StockQuantity, &p.Unit,
		&p.IsAvailable, &p.IsFeatured, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return p, nil
}

func (r *ProductRepo) FindByID(ctx context.Context, id string) (*models.Product, error) {
	p := &models.Product{}
	err := r.pool.QueryRow(ctx, `
		SELECT id, booth_id, vendor_id, category_id, name, description, price, sale_price,
		       image_urls, stock_quantity, unit, is_available, is_featured, created_at, updated_at
		FROM products WHERE id = $1
	`, id).Scan(
		&p.ID, &p.BoothID, &p.VendorID, &p.CategoryID, &p.Name, &p.Description,
		&p.Price, &p.SalePrice, &p.ImageURLs, &p.StockQuantity, &p.Unit,
		&p.IsAvailable, &p.IsFeatured, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return p, nil
}

func (r *ProductRepo) ListByBooth(ctx context.Context, boothID string, params models.PaginationParams, availableOnly bool) ([]models.Product, int, error) {
	whereClause := " WHERE booth_id = $1"
	args := []interface{}{boothID}

	if availableOnly {
		whereClause += " AND is_available = true"
	}

	var total int
	if err := r.pool.QueryRow(ctx, "SELECT COUNT(*) FROM products"+whereClause, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	if total == 0 {
		return []models.Product{}, 0, nil
	}

	query := `SELECT id, booth_id, vendor_id, category_id, name, description, price, sale_price,
	                  image_urls, stock_quantity, unit, is_available, is_featured, created_at, updated_at
	           FROM products` + whereClause + ` ORDER BY is_featured DESC, name ASC LIMIT $2 OFFSET $3`
	args = append(args, params.Limit(), params.Offset())

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var products []models.Product
	for rows.Next() {
		var p models.Product
		if err := rows.Scan(&p.ID, &p.BoothID, &p.VendorID, &p.CategoryID, &p.Name, &p.Description,
			&p.Price, &p.SalePrice, &p.ImageURLs, &p.StockQuantity, &p.Unit,
			&p.IsAvailable, &p.IsFeatured, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, 0, err
		}
		products = append(products, p)
	}
	return products, total, nil
}

func (r *ProductRepo) ListByCategory(ctx context.Context, categoryID string, params models.PaginationParams) ([]models.Product, int, error) {
	args := []interface{}{categoryID}
	whereClause := " WHERE category_id = $1 AND is_available = true"

	var total int
	if err := r.pool.QueryRow(ctx, "SELECT COUNT(*) FROM products"+whereClause, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	if total == 0 {
		return []models.Product{}, 0, nil
	}

	query := `SELECT id, booth_id, vendor_id, category_id, name, description, price, sale_price,
	                  image_urls, stock_quantity, unit, is_available, is_featured, created_at, updated_at
	           FROM products` + whereClause + ` ORDER BY is_featured DESC, created_at DESC LIMIT $2 OFFSET $3`
	args = append(args, params.Limit(), params.Offset())

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var products []models.Product
	for rows.Next() {
		var p models.Product
		if err := rows.Scan(&p.ID, &p.BoothID, &p.VendorID, &p.CategoryID, &p.Name, &p.Description,
			&p.Price, &p.SalePrice, &p.ImageURLs, &p.StockQuantity, &p.Unit,
			&p.IsAvailable, &p.IsFeatured, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, 0, err
		}
		products = append(products, p)
	}
	return products, total, nil
}

// SearchByBooth searches products by name or price within a specific booth.
func (r *ProductRepo) SearchByBooth(ctx context.Context, boothID string, query string, limit int) ([]models.Product, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, booth_id, vendor_id, category_id, name, description, price, sale_price,
		       image_urls, stock_quantity, unit, is_available, is_featured, created_at, updated_at
		FROM products
		WHERE booth_id = $1 AND is_available = true
		  AND (name ILIKE '%' || $2 || '%' OR CAST(price AS TEXT) ILIKE '%' || $2 || '%')
		ORDER BY is_featured DESC, name ASC
		LIMIT $3
	`, boothID, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var products []models.Product
	for rows.Next() {
		var p models.Product
		if err := rows.Scan(&p.ID, &p.BoothID, &p.VendorID, &p.CategoryID, &p.Name, &p.Description,
			&p.Price, &p.SalePrice, &p.ImageURLs, &p.StockQuantity, &p.Unit,
			&p.IsAvailable, &p.IsFeatured, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		products = append(products, p)
	}
	return products, nil
}

func (r *ProductRepo) Update(ctx context.Context, id string, input models.UpdateProductInput) (*models.Product, error) {
	p, err := r.FindByID(ctx, id)
	if err != nil || p == nil {
		return p, err
	}

	if input.Name != nil {
		p.Name = *input.Name
	}
	if input.Description != nil {
		p.Description = input.Description
	}
	if input.Price != nil {
		p.Price = *input.Price
	}
	if input.SalePrice != nil {
		p.SalePrice = input.SalePrice
	}
	if input.CategoryID != nil {
		p.CategoryID = input.CategoryID
	}
	if len(input.ImageURLs) > 0 {
		data, _ := json.Marshal(input.ImageURLs)
		p.ImageURLs = data
	}
	if input.StockQuantity != nil {
		p.StockQuantity = input.StockQuantity
	}
	if input.Unit != nil {
		p.Unit = *input.Unit
	}
	if input.IsAvailable != nil {
		p.IsAvailable = *input.IsAvailable
	}
	if input.IsFeatured != nil {
		p.IsFeatured = *input.IsFeatured
	}

	_, err = r.pool.Exec(ctx, `
		UPDATE products SET name=$1, description=$2, price=$3, sale_price=$4,
		   category_id=$5, image_urls=$6, stock_quantity=$7, unit=$8,
		   is_available=$9, is_featured=$10, updated_at=NOW()
		WHERE id=$11
	`, p.Name, p.Description, p.Price, p.SalePrice,
		p.CategoryID, p.ImageURLs, p.StockQuantity, p.Unit,
		p.IsAvailable, p.IsFeatured, id)
	if err != nil {
		return nil, err
	}
	p.UpdatedAt = time.Now()
	return p, nil
}

func (r *ProductRepo) Delete(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM products WHERE id=$1`, id)
	return err
}
