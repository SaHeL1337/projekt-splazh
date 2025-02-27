package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
)

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