package repository

import (
	"context"

	"api/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

func TagList(pool *pgxpool.Pool) ([]models.CustomerTag, error) {
	rows, err := pool.Query(context.Background(),
		`SELECT id, name, sort_order, created_at FROM customer_tags ORDER BY sort_order, name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tags []models.CustomerTag
	for rows.Next() {
		var t models.CustomerTag
		if err := rows.Scan(&t.ID, &t.Name, &t.SortOrder, &t.CreatedAt); err != nil {
			return nil, err
		}
		tags = append(tags, t)
	}
	if tags == nil {
		tags = []models.CustomerTag{}
	}
	return tags, nil
}

func TagCreate(pool *pgxpool.Pool, name string) (*models.CustomerTag, error) {
	t := &models.CustomerTag{Name: name}
	err := pool.QueryRow(context.Background(),
		`INSERT INTO customer_tags (name) VALUES ($1) RETURNING id, sort_order, created_at`,
		name).Scan(&t.ID, &t.SortOrder, &t.CreatedAt)
	if err != nil {
		return nil, err
	}
	return t, nil
}

func TagDelete(pool *pgxpool.Pool, id string) error {
	_, err := pool.Exec(context.Background(), `DELETE FROM customer_tags WHERE id = $1`, id)
	return err
}
