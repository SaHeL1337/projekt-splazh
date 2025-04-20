package crawlresults

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
)

// PageMetrics represents performance metrics for a crawled page
type PageMetrics struct {
	URL        string  `json:"url"`
	TTFB       float64 `json:"ttfb"`
	RenderTime float64 `json:"renderTime"`
}

// Repository handles database operations for crawl results
type Repository struct {
	db *pgx.Conn
}

// NewRepository creates a new crawl results repository
func NewRepository(db *pgx.Conn) *Repository {
	return &Repository{
		db: db,
	}
}

// GetResults retrieves the performance metrics for a project's crawled pages
func (r *Repository) GetResults(ctx context.Context, projectID int) ([]PageMetrics, error) {
	query := `
		SELECT url, ttfb_ms, render_time_ms
		FROM crawl_result
		WHERE project_id = @projectID
		ORDER BY render_time_ms DESC
	`
	args := pgx.NamedArgs{
		"projectID": projectID,
	}

	rows, err := r.db.Query(ctx, query, args)
	if err != nil {
		return nil, fmt.Errorf("unable to query crawl results: %w", err)
	}
	defer rows.Close()

	var results []PageMetrics
	for rows.Next() {
		var metric PageMetrics
		var ttfb, renderTime *float64 // Use pointers to handle NULL values

		if err := rows.Scan(&metric.URL, &ttfb, &renderTime); err != nil {
			return nil, fmt.Errorf("error scanning crawl result: %w", err)
		}

		// Handle NULL values
		if ttfb != nil {
			metric.TTFB = *ttfb
		}
		if renderTime != nil {
			metric.RenderTime = *renderTime
		}

		results = append(results, metric)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating crawl results: %w", err)
	}

	return results, nil
}

// Service handles business logic for crawl results operations
type Service struct {
	repo *Repository
}

// NewService creates a new crawl results service
func NewService(repo *Repository) *Service {
	return &Service{
		repo: repo,
	}
}

// GetResults retrieves the performance metrics for a project's crawled pages
func (s *Service) GetResults(ctx context.Context, projectID int) ([]PageMetrics, error) {
	return s.repo.GetResults(ctx, projectID)
} 