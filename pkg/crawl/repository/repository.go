package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
)

type Repository struct {
	db *pgx.Conn
}

// NewRepository creates a new repository
func NewRepository(db *pgx.Conn) *Repository {
	return &Repository{
		db: db,
	}
}

func (r *Repository) Create(ctx context.Context, projectId int) error {
	query := `INSERT INTO crawl_queue (project_id) VALUES (@projectId::integer)`
	args := pgx.NamedArgs{
		"projectId": projectId,
	}
	_, err := r.db.Exec(ctx, query, args)

	if err != nil {
		return fmt.Errorf("unable to insert project: %w", err)
	}
	return nil
}

func (r *Repository) GetStatus(ctx context.Context, projectId int) (string, error) {
	query := `SELECT COUNT(*) FROM crawl_queue WHERE project_id = @projectId`
	args := pgx.NamedArgs{
		"projectId": projectId,
	}
	
	var count int
	err := r.db.QueryRow(ctx, query, args).Scan(&count)
	if err != nil {
		return "", fmt.Errorf("unable to get crawl status: %w", err)
	}

	if count > 0 {
		return "queued", nil
	}
	return "completed", nil
}
