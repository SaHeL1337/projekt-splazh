package notifications

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
)

// Move repository code directly into this package instead of a separate repository package

type Notification struct {
	ID        int       `json:"id"`
	ProjectID int       `json:"projectId"`
	URL       string    `json:"url"`
	Category  string    `json:"category"`
	Message   string    `json:"message"`
	Timestamp time.Time `json:"timestamp"`
}

type Repository struct {
	db *pgx.Conn
}

// NewRepository creates a new repository
func NewRepository(db *pgx.Conn) *Repository {
	return &Repository{
		db: db,
	}
}

func (r *Repository) GetByProjectID(ctx context.Context, projectID int) ([]Notification, error) {
	query := `
		SELECT id, project_id, url, category, message, timestamp 
		FROM project_notifications 
		WHERE project_id = @projectId
		ORDER BY timestamp DESC
	`
	args := pgx.NamedArgs{
		"projectId": projectID,
	}

	rows, err := r.db.Query(ctx, query, args)
	if err != nil {
		return nil, fmt.Errorf("unable to query notifications: %w", err)
	}
	defer rows.Close()

	var notifications []Notification
	for rows.Next() {
		var notification Notification
		if err := rows.Scan(
			&notification.ID,
			&notification.ProjectID,
			&notification.URL,
			&notification.Category,
			&notification.Message,
			&notification.Timestamp,
		); err != nil {
			return nil, fmt.Errorf("unable to scan notification: %w", err)
		}
		notifications = append(notifications, notification)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating notifications: %w", err)
	}

	return notifications, nil
}

// DeleteByProjectID deletes all notifications for a specific project
func (r *Repository) DeleteByProjectID(ctx context.Context, projectID int) error {
	query := `
		DELETE FROM project_notifications 
		WHERE project_id = @projectId
	`
	args := pgx.NamedArgs{
		"projectId": projectID,
	}

	_, err := r.db.Exec(ctx, query, args)
	if err != nil {
		return fmt.Errorf("unable to delete project notifications: %w", err)
	}

	return nil
}

// Service for notifications
type Service struct {
	repo *Repository
}

// NewService creates a new service
func NewService(repo *Repository) *Service {
	return &Service{
		repo: repo,
	}
}

// GetByProjectID gets notifications for a project
func (s *Service) GetByProjectID(ctx context.Context, projectID int) ([]Notification, error) {
	return s.repo.GetByProjectID(ctx, projectID)
}

// DeleteByProjectID deletes all notifications for a project
func (s *Service) DeleteByProjectID(ctx context.Context, projectID int) error {
	return s.repo.DeleteByProjectID(ctx, projectID)
}
