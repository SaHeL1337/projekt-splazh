package crawl

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
)

// Crawl_Queue represents a crawl job entity
type Crawl_Queue struct {
	Id        int    `json:"id"`
	ProjectId string `json:"projectId"`
	Url       string `json:"url"`
}

// Repository handles database operations for crawl jobs
type Repository struct {
	db *pgx.Conn
}

// NewRepository creates a new crawl repository
func NewRepository(db *pgx.Conn) *Repository {
	return &Repository{
		db: db,
	}
}

// Create adds a new crawl job to the queue
func (r *Repository) Create(ctx context.Context, projectID int) error {
	query := `
		INSERT INTO crawl_queue (project_id, status, created_at)
		VALUES (@projectID, 'pending', NOW())
	`
	args := pgx.NamedArgs{
		"projectID": projectID,
	}

	_, err := r.db.Exec(ctx, query, args)
	if err != nil {
		return fmt.Errorf("unable to create crawl job: %w", err)
	}

	return nil
}

// GetStatus retrieves the status of a crawl job for a project
func (r *Repository) GetStatus(ctx context.Context, projectID int) (string, int, error) {
	// First check if there's an active crawl job
	queueQuery := `
		SELECT status FROM crawl_queue
		WHERE project_id = @projectID
		ORDER BY created_at DESC
		LIMIT 1
	`
	queueArgs := pgx.NamedArgs{
		"projectID": projectID,
	}

	var status string
	err := r.db.QueryRow(ctx, queueQuery, queueArgs).Scan(&status)
	if err == nil {
		// Found an active job
		return status, 0, nil
	}

	// No active job, check for completed crawls
	countQuery := `
		SELECT COUNT(*) FROM crawl_result
		WHERE project_id = @projectID
	`
	countArgs := pgx.NamedArgs{
		"projectID": projectID,
	}

	var count int
	err = r.db.QueryRow(ctx, countQuery, countArgs).Scan(&count)
	if err != nil {
		return "unknown", 0, fmt.Errorf("unable to get crawl status: %w", err)
	}

	if count > 0 {
		return "completed", count, nil
	}

	return "not_started", 0, nil
}

// Service handles business logic for crawl operations
type Service struct {
	repo *Repository
}

// NewService creates a new crawl service
func NewService(repo *Repository) *Service {
	return &Service{
		repo: repo,
	}
}

// Create adds a new crawl job to the queue
func (s *Service) Create(ctx context.Context, projectID int) error {
	return s.repo.Create(ctx, projectID)
}

// GetStatus retrieves the status of a crawl job for a project
func (s *Service) GetStatus(ctx context.Context, projectID int) (string, int, error) {
	return s.repo.GetStatus(ctx, projectID)
}
