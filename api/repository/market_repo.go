package repository

import (
	"context"
	"fmt"
	"time"

	"api/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type MarketRepo struct {
	pool *pgxpool.Pool
}

func NewMarketRepo(pool *pgxpool.Pool) *MarketRepo {
	return &MarketRepo{pool: pool}
}

// --- Market CRUD ---

func (r *MarketRepo) Create(ctx context.Context, input models.CreateMarketInput, createdBy string) (*models.Market, error) {
	m := &models.Market{}
	err := r.pool.QueryRow(ctx, `
		INSERT INTO markets (name, description, location, address, latitude, longitude, market_date, start_time, end_time, status, banner_url, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING id, name, description, location, address, latitude, longitude, market_date, start_time, end_time, status, banner_url, created_by, created_at, updated_at
	`, input.Name, input.Description, input.Location, input.Address,
		input.Latitude, input.Longitude, input.MarketDate, input.StartTime, input.EndTime,
		input.Status, input.BannerURL, createdBy).Scan(
		&m.ID, &m.Name, &m.Description, &m.Location, &m.Address,
		&m.Latitude, &m.Longitude, &m.MarketDate, &m.StartTime, &m.EndTime,
		&m.Status, &m.BannerURL, &m.CreatedBy, &m.CreatedAt, &m.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return m, nil
}

func (r *MarketRepo) FindByID(ctx context.Context, id string) (*models.Market, error) {
	m := &models.Market{}
	err := r.pool.QueryRow(ctx, `
		SELECT id, name, description, location, address, latitude, longitude,
		       market_date, start_time, end_time, status, banner_url, created_by, created_at, updated_at
		FROM markets WHERE id = $1
	`, id).Scan(
		&m.ID, &m.Name, &m.Description, &m.Location, &m.Address,
		&m.Latitude, &m.Longitude, &m.MarketDate, &m.StartTime, &m.EndTime,
		&m.Status, &m.BannerURL, &m.CreatedBy, &m.CreatedAt, &m.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return m, nil
}

func (r *MarketRepo) List(ctx context.Context, params models.PaginationParams, status *models.MarketStatus) ([]models.Market, int, error) {
	whereClause := ""
	args := []interface{}{}

	if status != nil {
		whereClause = " WHERE status = $1"
		args = append(args, *status)
	}

	var total int
	if err := r.pool.QueryRow(ctx, "SELECT COUNT(*) FROM markets"+whereClause, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	if total == 0 {
		return []models.Market{}, 0, nil
	}

	limitIdx := 2
	offsetIdx := 3
	if status == nil {
		limitIdx = 1
		offsetIdx = 2
	}
	query := fmt.Sprintf(`SELECT id, name, description, location, address, latitude, longitude,
	                  market_date, start_time, end_time, status, banner_url, created_by, created_at, updated_at
	           FROM markets%s ORDER BY market_date DESC LIMIT $%d OFFSET $%d`, whereClause, limitIdx, offsetIdx)
	args = append(args, params.Limit(), params.Offset())

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var markets []models.Market
	for rows.Next() {
		var m models.Market
		if err := rows.Scan(&m.ID, &m.Name, &m.Description, &m.Location, &m.Address,
			&m.Latitude, &m.Longitude, &m.MarketDate, &m.StartTime, &m.EndTime,
			&m.Status, &m.BannerURL, &m.CreatedBy, &m.CreatedAt, &m.UpdatedAt); err != nil {
			return nil, 0, err
		}
		markets = append(markets, m)
	}
	return markets, total, nil
}

func (r *MarketRepo) Update(ctx context.Context, id string, input models.UpdateMarketInput) (*models.Market, error) {
	m, err := r.FindByID(ctx, id)
	if err != nil || m == nil {
		return m, err
	}

	if input.Name != nil {
		m.Name = *input.Name
	}
	if input.Description != nil {
		m.Description = input.Description
	}
	if input.Location != nil {
		m.Location = *input.Location
	}
	if input.Address != nil {
		m.Address = input.Address
	}
	if input.Latitude != nil {
		m.Latitude = input.Latitude
	}
	if input.Longitude != nil {
		m.Longitude = input.Longitude
	}
	if input.MarketDate != nil {
		parsed, _ := time.Parse("2006-01-02", *input.MarketDate)
		m.MarketDate = parsed
	}
	if input.StartTime != nil {
		m.StartTime = input.StartTime
	}
	if input.EndTime != nil {
		m.EndTime = input.EndTime
	}
	if input.Status != nil {
		m.Status = *input.Status
	}
	if input.BannerURL != nil {
		m.BannerURL = input.BannerURL
	}
	m.UpdatedAt = time.Now()

	_, err = r.pool.Exec(ctx, `
		UPDATE markets SET name=$1, description=$2, location=$3, address=$4,
		   latitude=$5, longitude=$6, market_date=$7, start_time=$8, end_time=$9,
		   status=$10, banner_url=$11, updated_at=$12
		WHERE id=$13
	`, m.Name, m.Description, m.Location, m.Address,
		m.Latitude, m.Longitude, m.MarketDate, m.StartTime, m.EndTime,
		m.Status, m.BannerURL, m.UpdatedAt, id)
	if err != nil {
		return nil, err
	}
	return m, nil
}

func (r *MarketRepo) Delete(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM markets WHERE id=$1`, id)
	return err
}

// --- Booth CRUD ---

type BoothRepo struct {
	pool *pgxpool.Pool
}

func NewBoothRepo(pool *pgxpool.Pool) *BoothRepo {
	return &BoothRepo{pool: pool}
}

func (r *BoothRepo) Create(ctx context.Context, input models.CreateBoothInput, vendorID string) (*models.Booth, error) {
	b := &models.Booth{}
	err := r.pool.QueryRow(ctx, `
		INSERT INTO booths (market_id, vendor_id, booth_name, booth_number, zone, description, logo_url)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, market_id, vendor_id, booth_name, booth_number, zone, description, logo_url, status, created_at, updated_at
	`, input.MarketID, vendorID, input.BoothName, input.BoothNumber,
		input.Zone, input.Description, input.LogoURL).Scan(
		&b.ID, &b.MarketID, &b.VendorID, &b.BoothName, &b.BoothNumber,
		&b.Zone, &b.Description, &b.LogoURL, &b.Status, &b.CreatedAt, &b.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return b, nil
}

func (r *BoothRepo) FindByID(ctx context.Context, id string) (*models.Booth, error) {
	b := &models.Booth{}
	err := r.pool.QueryRow(ctx, `
		SELECT id, market_id, vendor_id, booth_name, booth_number, zone, description, logo_url, status, created_at, updated_at
		FROM booths WHERE id = $1
	`, id).Scan(
		&b.ID, &b.MarketID, &b.VendorID, &b.BoothName, &b.BoothNumber,
		&b.Zone, &b.Description, &b.LogoURL, &b.Status, &b.CreatedAt, &b.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return b, nil
}

func (r *BoothRepo) ListByMarket(ctx context.Context, marketID string, status *models.BoothStatus) ([]models.Booth, error) {
	query := `SELECT id, market_id, vendor_id, booth_name, booth_number, zone, description, logo_url, status, created_at, updated_at
	           FROM booths WHERE market_id = $1`
	args := []interface{}{marketID}

	if status != nil {
		query += " AND status = $2"
		args = append(args, *status)
	}
	query += " ORDER BY booth_name"

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var booths []models.Booth
	for rows.Next() {
		var b models.Booth
		if err := rows.Scan(&b.ID, &b.MarketID, &b.VendorID, &b.BoothName, &b.BoothNumber,
			&b.Zone, &b.Description, &b.LogoURL, &b.Status, &b.CreatedAt, &b.UpdatedAt); err != nil {
			return nil, err
		}
		booths = append(booths, b)
	}
	return booths, nil
}

func (r *BoothRepo) ListByVendor(ctx context.Context, vendorID string) ([]models.Booth, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, market_id, vendor_id, booth_name, booth_number, zone, description, logo_url, status, created_at, updated_at
		FROM booths WHERE vendor_id = $1 ORDER BY created_at DESC
	`, vendorID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var booths []models.Booth
	for rows.Next() {
		var b models.Booth
		if err := rows.Scan(&b.ID, &b.MarketID, &b.VendorID, &b.BoothName, &b.BoothNumber,
			&b.Zone, &b.Description, &b.LogoURL, &b.Status, &b.CreatedAt, &b.UpdatedAt); err != nil {
			return nil, err
		}
		booths = append(booths, b)
	}
	if booths == nil {
		booths = []models.Booth{}
	}
	return booths, nil
}

func (r *BoothRepo) Update(ctx context.Context, id string, input models.UpdateBoothInput) (*models.Booth, error) {
	b, err := r.FindByID(ctx, id)
	if err != nil || b == nil {
		return b, err
	}

	if input.BoothName != nil {
		b.BoothName = *input.BoothName
	}
	if input.BoothNumber != nil {
		b.BoothNumber = input.BoothNumber
	}
	if input.Zone != nil {
		b.Zone = input.Zone
	}
	if input.Description != nil {
		b.Description = input.Description
	}
	if input.LogoURL != nil {
		b.LogoURL = input.LogoURL
	}
	if input.Status != nil {
		b.Status = *input.Status
	}
	b.UpdatedAt = time.Now()

	_, err = r.pool.Exec(ctx, `
		UPDATE booths SET booth_name=$1, booth_number=$2, zone=$3,
		   description=$4, logo_url=$5, status=$6, updated_at=$7
		WHERE id=$8
	`, b.BoothName, b.BoothNumber, b.Zone, b.Description, b.LogoURL, b.Status, b.UpdatedAt, id)
	if err != nil {
		return nil, err
	}
	return b, nil
}

func (r *BoothRepo) Delete(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM booths WHERE id=$1`, id)
	return err
}

// ListAllBooths lists all booths with filters for admin.
// Filters: market_id, vendor_id, status, search (by booth_name), pagination.
func (r *BoothRepo) ListAllBooths(ctx context.Context, params models.PaginationParams, marketID *string, vendorID *string, status *models.BoothStatus, search string) ([]models.Booth, int, error) {
	whereClause := " WHERE 1=1"
	args := []interface{}{}
	argIdx := 1

	if marketID != nil {
		whereClause += " AND market_id = $" + fmt.Sprintf("%d", argIdx)
		args = append(args, *marketID)
		argIdx++
	}
	if vendorID != nil {
		whereClause += " AND vendor_id = $" + fmt.Sprintf("%d", argIdx)
		args = append(args, *vendorID)
		argIdx++
	}
	if status != nil {
		whereClause += " AND status = $" + fmt.Sprintf("%d", argIdx)
		args = append(args, *status)
		argIdx++
	}
	if search != "" {
		whereClause += " AND booth_name ILIKE '%' || $" + fmt.Sprintf("%d", argIdx) + " || '%'"
		args = append(args, search)
		argIdx++
	}

	var total int
	countQuery := "SELECT COUNT(*) FROM booths" + whereClause
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	if total == 0 {
		return []models.Booth{}, 0, nil
	}

	limitIdx := argIdx
	offsetIdx := argIdx + 1
	query := `SELECT id, market_id, vendor_id, booth_name, booth_number, zone, description, logo_url, status, created_at, updated_at FROM booths` +
		whereClause + ` ORDER BY created_at DESC LIMIT $` + fmt.Sprintf("%d", limitIdx) + ` OFFSET $` + fmt.Sprintf("%d", offsetIdx)
	args = append(args, params.Limit(), params.Offset())

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var booths []models.Booth
	for rows.Next() {
		var b models.Booth
		if err := rows.Scan(&b.ID, &b.MarketID, &b.VendorID, &b.BoothName, &b.BoothNumber,
			&b.Zone, &b.Description, &b.LogoURL, &b.Status, &b.CreatedAt, &b.UpdatedAt); err != nil {
			return nil, 0, err
		}
		booths = append(booths, b)
	}
	return booths, total, nil
}

// UpdateStatus updates the status of a booth (approve, reject, close).
func (r *BoothRepo) UpdateStatus(ctx context.Context, id string, status models.BoothStatus) (*models.Booth, error) {
	b, err := r.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if b == nil {
		return nil, nil
	}

	b.Status = status
	b.UpdatedAt = time.Now()

	_, err = r.pool.Exec(ctx, `
		UPDATE booths SET status=$1, updated_at=$2 WHERE id=$3
	`, b.Status, b.UpdatedAt, id)
	if err != nil {
		return nil, err
	}

	return b, nil
}
