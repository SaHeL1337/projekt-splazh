package notifications

import (
	"context"
	"projekt-splazh/pkg/notifications/repository"
)

// Repository defines the interface for notification data operations
type Repository interface {
	GetByProjectID(ctx context.Context, projectID int) ([]repository.Notification, error)
}

// Service handles business logic for notifications
type Service struct {
	repo Repository
}

// NewService creates a new notification service
func NewService(repo Repository) *Service {
	return &Service{
		repo: repo,
	}
}

// GetByProjectID retrieves all notifications for a project
func (s *Service) GetByProjectID(ctx context.Context, projectID int) ([]repository.Notification, error) {
	return s.repo.GetByProjectID(ctx, projectID)
}
