package repository

import (
	"context"

	"api/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type CartRepo struct {
	pool *pgxpool.Pool
}

func NewCartRepo(pool *pgxpool.Pool) *CartRepo {
	return &CartRepo{pool: pool}
}

// --- Cart CRUD ---

// GetOrCreate retrieves the customer's active cart or creates one.
func (r *CartRepo) GetOrCreate(ctx context.Context, customerID string) (*models.Cart, error) {
	cart := &models.Cart{}
	err := r.pool.QueryRow(ctx, `
		INSERT INTO carts (customer_id) VALUES ($1)
		ON CONFLICT (customer_id) DO UPDATE SET updated_at = NOW()
		RETURNING id, customer_id, created_at, updated_at
	`, customerID).Scan(
		&cart.ID, &cart.CustomerID, &cart.CreatedAt, &cart.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return cart, nil
}

// FindByCustomer retrieves the customer's cart.
func (r *CartRepo) FindByCustomer(ctx context.Context, customerID string) (*models.Cart, error) {
	cart := &models.Cart{}
	err := r.pool.QueryRow(ctx, `
		SELECT id, customer_id, created_at, updated_at
		FROM carts WHERE customer_id = $1
	`, customerID).Scan(
		&cart.ID, &cart.CustomerID, &cart.CreatedAt, &cart.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return cart, nil
}

// Clear removes all items from a cart.
func (r *CartRepo) Clear(ctx context.Context, cartID string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM cart_items WHERE cart_id = $1`, cartID)
	if err != nil {
		return err
	}
	_, err = r.pool.Exec(ctx, `UPDATE carts SET updated_at = NOW() WHERE id = $1`, cartID)
	return err
}

// --- Cart Item CRUD ---

type CartItemRepo struct {
	pool *pgxpool.Pool
}

func NewCartItemRepo(pool *pgxpool.Pool) *CartItemRepo {
	return &CartItemRepo{pool: pool}
}

func (r *CartItemRepo) Add(ctx context.Context, cartID string, input models.AddCartItemInput) (*models.CartItem, error) {
	item := &models.CartItem{}
	err := r.pool.QueryRow(ctx, `
		INSERT INTO cart_items (cart_id, product_id, quantity, notes) VALUES ($1, $2, $3, $4)
		ON CONFLICT (cart_id, product_id) DO UPDATE SET quantity = cart_items.quantity + $3, updated_at = NOW()
		RETURNING id, cart_id, product_id, quantity, notes, created_at, updated_at
	`, cartID, input.ProductID, input.Quantity, input.Notes).Scan(
		&item.ID, &item.CartID, &item.ProductID, &item.Quantity, &item.Notes,
		&item.CreatedAt, &item.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	// Update cart timestamp
	_, _ = r.pool.Exec(ctx, `UPDATE carts SET updated_at = NOW() WHERE id = $1`, cartID)

	return item, nil
}

func (r *CartItemRepo) ListByCart(ctx context.Context, cartID string) ([]models.CartItem, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, cart_id, product_id, quantity, notes, created_at, updated_at
		FROM cart_items WHERE cart_id = $1 ORDER BY created_at
	`, cartID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []models.CartItem
	for rows.Next() {
		var item models.CartItem
		if err := rows.Scan(&item.ID, &item.CartID, &item.ProductID, &item.Quantity,
			&item.Notes, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, nil
}

func (r *CartItemRepo) Update(ctx context.Context, itemID string, input models.UpdateCartItemInput) (*models.CartItem, error) {
	item := &models.CartItem{}
	err := r.pool.QueryRow(ctx, `
		UPDATE cart_items SET quantity=$1, notes=$2, updated_at=NOW()
		WHERE id=$3
		RETURNING id, cart_id, product_id, quantity, notes, created_at, updated_at
	`, input.Quantity, input.Notes, itemID).Scan(
		&item.ID, &item.CartID, &item.ProductID, &item.Quantity, &item.Notes,
		&item.CreatedAt, &item.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return item, nil
}

func (r *CartItemRepo) Delete(ctx context.Context, itemID string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM cart_items WHERE id = $1`, itemID)
	return err
}
