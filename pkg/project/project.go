package project

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
)

// Project represents a project entity
type Project struct {
	ID        int       `json:"id"`
	UserID    string    `json:"userid"`
	URL       string    `json:"url"`
}

// Repository handles database operations for projects
type Repository struct {
	db *pgx.Conn
}

// NewRepository creates a new project repository
func NewRepository(db *pgx.Conn) *Repository {
	return &Repository{
		db: db,
	}
}

// GetByID retrieves a project by ID
func (r *Repository) GetByID(ctx context.Context, id int) (*Project, error) {
	query := `
		SELECT id, user_id, url 
		FROM projects 
		WHERE id = @id
	`
	args := pgx.NamedArgs{
		"id": id,
	}

	var project Project
	err := r.db.QueryRow(ctx, query, args).Scan(
		&project.ID,
		&project.UserID,
		&project.URL,
	)
	if err != nil {
		return nil, fmt.Errorf("unable to get project: %w", err)
	}

	return &project, nil
}

// GetByUserID retrieves all projects for a user
func (r *Repository) GetByUserID(ctx context.Context, userID string) ([]Project, error) {
	query := `
		SELECT id, user_id, url
		FROM projects 
		WHERE user_id = @userID
		ORDER BY id DESC
	`
	args := pgx.NamedArgs{
		"userID": userID,
	}

	rows, err := r.db.Query(ctx, query, args)
	if err != nil {
		return nil, fmt.Errorf("unable to query projects: %w", err)
	}
	defer rows.Close()

	var projects []Project
	for rows.Next() {
		var project Project
		if err := rows.Scan(
			&project.ID,
			&project.UserID,
			&project.URL,
		); err != nil {
			return nil, fmt.Errorf("unable to scan project: %w", err)
		}
		projects = append(projects, project)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating projects: %w", err)
	}

	return projects, nil
}

// Create adds a new project
func (r *Repository) Create(ctx context.Context, userID string, url string) error {
	query := `
		INSERT INTO projects (user_id, url)
		VALUES (@userID, @url)
	`
	args := pgx.NamedArgs{
		"userID": userID,
		"url":    url,
	}

	_, err := r.db.Exec(ctx, query, args)
	if err != nil {
		return fmt.Errorf("unable to create project: %w", err)
	}

	return nil
}

// Update modifies an existing project
func (r *Repository) Update(ctx context.Context, id int, url string) error {
	query := `
		UPDATE projects
		SET url = @url
		WHERE id = @id
	`
	args := pgx.NamedArgs{
		"id":  id,
		"url": url,
	}

	_, err := r.db.Exec(ctx, query, args)
	if err != nil {
		return fmt.Errorf("unable to update project: %w", err)
	}

	return nil
}

// Delete removes a project
func (r *Repository) Delete(ctx context.Context, id int) error {
	query := `
		DELETE FROM projects
		WHERE id = @id
	`
	args := pgx.NamedArgs{
		"id": id,
	}

	_, err := r.db.Exec(ctx, query, args)
	if err != nil {
		return fmt.Errorf("unable to delete project: %w", err)
	}

	return nil
}

// Service handles business logic for projects
type Service struct {
	repo *Repository
}

// NewService creates a new project service
func NewService(repo *Repository) *Service {
	return &Service{
		repo: repo,
	}
}

// GetByID retrieves a project by ID
func (s *Service) GetByID(ctx context.Context, id int) (*Project, error) {
	return s.repo.GetByID(ctx, id)
}

// GetByUserID retrieves all projects for a user
func (s *Service) GetByUserID(ctx context.Context, userID string) ([]Project, error) {
	return s.repo.GetByUserID(ctx, userID)
}

// Create adds a new project
func (s *Service) Create(ctx context.Context, userID string, url string) error {
	return s.repo.Create(ctx, userID, url)
}

// Update modifies an existing project
func (s *Service) Update(ctx context.Context, id int, url string) error {
	return s.repo.Update(ctx, id, url)
}

// Delete removes a project
func (s *Service) Delete(ctx context.Context, id int) error {
	return s.repo.Delete(ctx, id)
}
