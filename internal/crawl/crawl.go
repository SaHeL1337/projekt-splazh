package crawlQueue

import (
	"context"
)

// Project represents a project entity
type Crawl_Queue struct {
	Id        int    `json:"id"`
	ProjectId string `json:"projectId"`
	Url       string `json:"url"`
}

// Repository defines the interface for project data operations
type Repository interface {
	Create(ctx context.Context, projectId int) error
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
func (s *Service) Create(ctx context.Context, projectId int) error {
	return s.repo.Create(ctx, projectId)
}
