package crawlQueue

import (
	"context"
)

// Crawl_Queue represents a crawl job entity
type Crawl_Queue struct {
	Id        int    `json:"id"`
	ProjectId string `json:"projectId"`
	Url       string `json:"url"`
}

// Repository defines the interface for crawl job data operations
type Repository interface {
	Create(ctx context.Context, projectId int) error
	GetStatus(ctx context.Context, projectId int) (string, int, error)
}

// Service handles business logic for crawl jobs
type Service struct {
	repo Repository
}

// NewService creates a new crawl job service
func NewService(repo Repository) *Service {
	return &Service{
		repo: repo,
	}
}

// Create creates a new crawl job
func (s *Service) Create(ctx context.Context, projectId int) error {
	return s.repo.Create(ctx, projectId)
}

// GetStatus retrieves the status of a crawl job
func (s *Service) GetStatus(ctx context.Context, projectId int) (string, int, error) {
	return s.repo.GetStatus(ctx, projectId)
}
