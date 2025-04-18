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
		INSERT INTO crawl_queue (project_id, time_start)
		VALUES (@projectID, NOW())
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
	// First check if there's an entry in the crawl_queue table
	queueQuery := `
		SELECT COUNT(*) FROM crawl_queue
		WHERE project_id = @projectID
	`
	queueArgs := pgx.NamedArgs{
		"projectID": projectID,
	}

	var queueCount int
	err := r.db.QueryRow(ctx, queueQuery, queueArgs).Scan(&queueCount)
	if err != nil {
		return "unknown", 0, fmt.Errorf("unable to check crawl queue: %w", err)
	}

	if queueCount > 0 {
		// If there's an entry in the crawl_queue table, status is queued
		return "queued", queueCount, nil
	}

	// No entry in crawl_queue, check for entries in crawl_result table
	resultQuery := `
		SELECT COUNT(*) FROM crawl_result
		WHERE project_id = @projectID
	`
	resultArgs := pgx.NamedArgs{
		"projectID": projectID,
	}

	var resultCount int
	err = r.db.QueryRow(ctx, resultQuery, resultArgs).Scan(&resultCount)
	if err != nil {
		return "unknown", 0, fmt.Errorf("unable to check crawl results: %w", err)
	}

	if resultCount > 0 {
		// If there are entries in the crawl_result table but none in crawl_queue, status is completed
		return "completed", resultCount, nil
	}

	// No entries in either table, status is not_started
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
