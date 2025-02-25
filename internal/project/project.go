package project

import (
	"context"
)

// Project represents a project entity
type Project struct {
	ID     int    `json:"id"`
	UserID string `json:"userId"`
	URL    string `json:"url"`
}

// Repository defines the interface for project data operations
type Repository interface {
	Create(ctx context.Context, userID, url string) error
	Update(ctx context.Context, id int, url string) error
	Delete(ctx context.Context, id int) error
	GetByID(ctx context.Context, id int) (*Project, error)
	GetByUserID(ctx context.Context, userID string) ([]*Project, error)
}

// Service handles business logic for projects
type Service struct {
	repo Repository
}

// NewService creates a new project service
func NewService(repo Repository) *Service {
	return &Service{
		repo: repo,
	}
}

// Create creates a new project
func (s *Service) Create(ctx context.Context, userID, url string) error {
	return s.repo.Create(ctx, userID, url)
}

// Update updates an existing project
func (s *Service) Update(ctx context.Context, id int, url string) error {
	return s.repo.Update(ctx, id, url)
}

// Delete removes a project
func (s *Service) Delete(ctx context.Context, id int) error {
	return s.repo.Delete(ctx, id)
}

// GetByID retrieves a project by ID
func (s *Service) GetByID(ctx context.Context, id int) (*Project, error) {
	return s.repo.GetByID(ctx, id)
}

// GetByUserID retrieves all projects for a user
func (s *Service) GetByUserID(ctx context.Context, userID string) ([]*Project, error) {
	return s.repo.GetByUserID(ctx, userID)
}
