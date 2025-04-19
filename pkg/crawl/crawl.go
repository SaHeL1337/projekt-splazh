package crawl

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"projekt-splazh/pkg/notifications"
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
	// First, delete any existing crawl results for this project
	deleteQuery := `
		DELETE FROM crawl_result
		WHERE project_id = @projectID
	`
	deleteArgs := pgx.NamedArgs{
		"projectID": projectID,
	}

	_, err := r.db.Exec(ctx, deleteQuery, deleteArgs)
	if err != nil {
		return fmt.Errorf("unable to clean previous crawl results: %w", err)
	}

	// Delete existing notifications for this project
	notificationRepo := notifications.NewRepository(r.db)
	notificationService := notifications.NewService(notificationRepo)
	err = notificationService.DeleteByProjectID(ctx, projectID)
	if err != nil {
		return fmt.Errorf("unable to clean previous notifications: %w", err)
	}

	// Then add the new crawl job to the queue
	insertQuery := `
		INSERT INTO crawl_queue (project_id, time_start)
		VALUES (@projectID, NOW())
	`
	insertArgs := pgx.NamedArgs{
		"projectID": projectID,
	}

	_, err = r.db.Exec(ctx, insertQuery, insertArgs)
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

	// Check for entries in crawl_result table
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

	// Determine status based on queue and result counts
	if queueCount > 0 {
		if resultCount == 0 {
			// Entry in crawl_queue, but none in crawl_results
			return "queued", 0, nil
		} else {
			// Entry in crawl_queue, at least one entry in crawl_results
			return "in progress", resultCount, nil
		}
	} else {
		if resultCount > 0 {
			// No entry in crawl_queue, at least one entry in crawl_results
			return "completed", resultCount, nil
		} else {
			// No entries in either table
			return "not_started", 0, nil
		}
	}
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
