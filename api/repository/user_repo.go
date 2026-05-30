package repository

import (
	"context"
	"fmt"
	"time"

	"api/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type UserRepo struct {
	pool *pgxpool.Pool
}

func NewUserRepo(pool *pgxpool.Pool) *UserRepo {
	return &UserRepo{pool: pool}
}

// Create inserts a new user and returns the created user.
func (r *UserRepo) Create(ctx context.Context, input models.CreateUserInput, passwordHash string) (*models.User, error) {
	user := &models.User{}
	err := r.pool.QueryRow(ctx, `
		INSERT INTO users (email, password_hash, name, phone, role, avatar_url, address)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, email, password_hash, name, phone, role, avatar_url, address, default_booth_id, is_active, created_at, updated_at
	`, input.Email, passwordHash, input.Name, input.Phone, input.Role, input.AvatarURL, input.Address).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.Name, &user.Phone,
		&user.Role, &user.AvatarURL, &user.Address, &user.DefaultBoothID, &user.IsActive,
		&user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return user, nil
}

// FindByID retrieves a user by their ID.
func (r *UserRepo) FindByID(ctx context.Context, id string) (*models.User, error) {
	user := &models.User{}
	err := r.pool.QueryRow(ctx, `
		SELECT id, email, password_hash, name, phone, role, avatar_url, address, default_booth_id, is_active, created_at, updated_at
		FROM users WHERE id = $1
	`, id).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.Name, &user.Phone,
		&user.Role, &user.AvatarURL, &user.Address, &user.DefaultBoothID, &user.IsActive,
		&user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return user, nil
}

// FindByEmail retrieves a user by their email.
func (r *UserRepo) FindByEmail(ctx context.Context, email string) (*models.User, error) {
	user := &models.User{}
	err := r.pool.QueryRow(ctx, `
		SELECT id, email, password_hash, name, phone, role, avatar_url, address, default_booth_id, is_active, created_at, updated_at
		FROM users WHERE email = $1
	`, email).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.Name, &user.Phone,
		&user.Role, &user.AvatarURL, &user.Address, &user.DefaultBoothID, &user.IsActive,
		&user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return user, nil
}

// List retrieves users with pagination.
func (r *UserRepo) List(ctx context.Context, params models.PaginationParams, role *models.UserRole) ([]models.User, int, error) {
	whereClause := ""
	args := []interface{}{}
	argIdx := 1

	if role != nil {
		whereClause = " WHERE role = $" + string(rune('0'+argIdx))
		args = append(args, *role)
		argIdx++
	}

	var total int
	countQuery := "SELECT COUNT(*) FROM users" + whereClause
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	if total == 0 {
		return []models.User{}, 0, nil
	}

	query := "SELECT id, email, password_hash, name, phone, role, avatar_url, address, default_booth_id, is_active, created_at, updated_at FROM users" +
		whereClause + " ORDER BY created_at DESC LIMIT $" + string(rune('0'+argIdx)) + " OFFSET $" + string(rune('0'+argIdx+1))
	args = append(args, params.Limit(), params.Offset())

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var u models.User
		if err := rows.Scan(&u.ID, &u.Email, &u.PasswordHash, &u.Name, &u.Phone,
			&u.Role, &u.AvatarURL, &u.Address, &u.DefaultBoothID, &u.IsActive, &u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, 0, err
		}
		users = append(users, u)
	}
	return users, total, nil
}

// Update modifies an existing user's profile fields.
func (r *UserRepo) Update(ctx context.Context, id string, input models.UpdateUserInput) (*models.User, error) {
	user, err := r.FindByID(ctx, id)
	if err != nil || user == nil {
		return user, err
	}

	if input.Name != nil {
		user.Name = *input.Name
	}
	if input.Phone != nil {
		user.Phone = input.Phone
	}
	if input.AvatarURL != nil {
		user.AvatarURL = input.AvatarURL
	}
	if input.Address != nil {
		user.Address = input.Address
	}
	if input.DefaultBoothID != nil {
		user.DefaultBoothID = input.DefaultBoothID
	}
	user.UpdatedAt = time.Now()

	_, err = r.pool.Exec(ctx, `
		UPDATE users SET name=$1, phone=$2, avatar_url=$3, address=$4, default_booth_id=$5, updated_at=$6
		WHERE id=$7
	`, user.Name, user.Phone, user.AvatarURL, user.Address, user.DefaultBoothID, user.UpdatedAt, id)
	if err != nil {
		return nil, err
	}

	return user, nil
}

// Delete soft-deletes a user (sets is_active = false).
func (r *UserRepo) Delete(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `UPDATE users SET is_active=false, updated_at=NOW() WHERE id=$1`, id)
	return err
}

// ListAll lists all users with filters for admin.
// Filters: role, is_active, search (by name/email), pagination.
func (r *UserRepo) ListAll(ctx context.Context, params models.PaginationParams, role *models.UserRole, isActive *bool, search string) ([]models.User, int, error) {
	whereClause := " WHERE 1=1"
	args := []interface{}{}
	argIdx := 1

	if role != nil {
		whereClause += " AND role = $" + fmt.Sprintf("%d", argIdx)
		args = append(args, *role)
		argIdx++
	}
	if isActive != nil {
		whereClause += " AND is_active = $" + fmt.Sprintf("%d", argIdx)
		args = append(args, *isActive)
		argIdx++
	}
	if search != "" {
		whereClause += " AND (name ILIKE '%' || $" + fmt.Sprintf("%d", argIdx) + " || '%' OR email ILIKE '%' || $" + fmt.Sprintf("%d", argIdx) + " || '%')"
		args = append(args, search)
		argIdx++
	}

	var total int
	countQuery := "SELECT COUNT(*) FROM users" + whereClause
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	if total == 0 {
		return []models.User{}, 0, nil
	}

	limitIdx := argIdx
	offsetIdx := argIdx + 1
	query := `SELECT id, email, password_hash, name, phone, role, avatar_url, address, default_booth_id, is_active, created_at, updated_at FROM users` +
		whereClause + ` ORDER BY created_at DESC LIMIT $` + fmt.Sprintf("%d", limitIdx) + ` OFFSET $` + fmt.Sprintf("%d", offsetIdx)
	args = append(args, params.Limit(), params.Offset())

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var u models.User
		if err := rows.Scan(&u.ID, &u.Email, &u.PasswordHash, &u.Name, &u.Phone,
			&u.Role, &u.AvatarURL, &u.Address, &u.DefaultBoothID, &u.IsActive, &u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, 0, err
		}
		users = append(users, u)
	}
	return users, total, nil
}

// AdminUpdate allows an admin to update user fields: name, phone, role, is_active.
func (r *UserRepo) AdminUpdate(ctx context.Context, id string, input models.AdminUpdateUserInput) (*models.User, error) {
	user, err := r.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, nil
	}

	if input.Name != nil {
		user.Name = *input.Name
	}
	if input.Phone != nil {
		user.Phone = input.Phone
	}
	if input.Role != nil {
		user.Role = *input.Role
	}
	if input.IsActive != nil {
		user.IsActive = *input.IsActive
	}
	user.UpdatedAt = time.Now()

	_, err = r.pool.Exec(ctx, `
		UPDATE users SET name=$1, phone=$2, role=$3, is_active=$4, updated_at=$5
		WHERE id=$6
	`, user.Name, user.Phone, user.Role, user.IsActive, user.UpdatedAt, id)
	if err != nil {
		return nil, err
	}

	return user, nil
}
