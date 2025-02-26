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
	// First, delete previous crawl results for this project
	deleteResultsQuery := `DELETE FROM crawl_result WHERE project_id = @projectId`
	deleteNotificationsQuery := `DELETE FROM project_notifications WHERE project_id = @projectId`
	
	args := pgx.NamedArgs{
		"projectId": projectId,
	}
	
	// Delete previous crawl results
	_, err := r.db.Exec(ctx, deleteResultsQuery, args)
	if err != nil {
		return fmt.Errorf("unable to delete previous crawl results: %w", err)
	}
	
	// Delete previous project notifications
	_, err = r.db.Exec(ctx, deleteNotificationsQuery, args)
	if err != nil {
		return fmt.Errorf("unable to delete previous project notifications: %w", err)
	}
	
	// Now insert into crawl queue
	insertQuery := `INSERT INTO crawl_queue (project_id) VALUES (@projectId::integer)`
	_, err = r.db.Exec(ctx, insertQuery, args)
	if err != nil {
		return fmt.Errorf("unable to insert project: %w", err)
	}
	
	return nil
}

func (r *Repository) GetStatus(ctx context.Context, projectId int) (string, int, error) {
	// Check if project is in queue
	queueQuery := `SELECT COUNT(*) FROM crawl_queue WHERE project_id = @projectId`
	queueArgs := pgx.NamedArgs{
		"projectId": projectId,
	}
	
	var queueCount int
	err := r.db.QueryRow(ctx, queueQuery, queueArgs).Scan(&queueCount)
	if err != nil {
		return "", 0, fmt.Errorf("unable to get crawl queue status: %w", err)
	}

	// Get count of crawled pages
	resultQuery := `SELECT COUNT(*) FROM crawl_result WHERE project_id = @projectId`
	resultArgs := pgx.NamedArgs{
		"projectId": projectId,
	}
	
	var pagesCrawled int
	err = r.db.QueryRow(ctx, resultQuery, resultArgs).Scan(&pagesCrawled)
	if err != nil {
		return "", 0, fmt.Errorf("unable to get crawled pages count: %w", err)
	}

	if queueCount > 0 {
		return "queued", pagesCrawled, nil
	}
	return "completed", pagesCrawled, nil
}
