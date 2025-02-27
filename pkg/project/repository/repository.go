package repository

import (
	"context"
	"fmt"
	"projekt-splazh/pkg/project"

	"github.com/jackc/pgx/v5"
)

// Repository implements project.Repository using PostgreSQL
type Repository struct {
	db *pgx.Conn
}

// NewRepository creates a new PostgreSQL project repository
func NewRepository(db *pgx.Conn) *Repository {
	return &Repository{
		db: db,
	}
}

// Create inserts a new project into the database
func (r *Repository) Create(ctx context.Context, userId, url string) error {
	query := `INSERT INTO projects (user_id, url) VALUES (@userId, @url)`
	args := pgx.NamedArgs{
		"userId": userId,
		"url":    url,
	}
	_, err := r.db.Exec(ctx, query, args)
	if err != nil {
		return fmt.Errorf("unable to insert project: %w", err)
	}
	return nil
}

// Update modifies an existing project
func (r *Repository) Update(ctx context.Context, id int, url string) error {
	query := `UPDATE projects SET url = @url WHERE id = @id`
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

// Delete removes a project from the database
func (r *Repository) Delete(ctx context.Context, id int) error {
	// Delete from related tables first
	deleteQueries := []string{
		`DELETE FROM crawl_queue WHERE project_id = @id`,
		`DELETE FROM crawl_result WHERE project_id = @id`,
		`DELETE FROM project_notifications WHERE project_id = @id`,
		`DELETE FROM projects WHERE id = @id`,
	}
	
	args := pgx.NamedArgs{
		"id": id,
	}
	
	for _, query := range deleteQueries {
		_, err := r.db.Exec(ctx, query, args)
		if err != nil {
			return fmt.Errorf("unable to delete project data: %w", err)
		}
	}
	
	return nil
}

// GetByID retrieves a project by its ID
func (r *Repository) GetByID(ctx context.Context, id int) (*project.Project, error) {
	query := `SELECT id, user_id, url FROM projects WHERE id = @id`
	args := pgx.NamedArgs{
		"id": id,
	}

	var p project.Project
	err := r.db.QueryRow(ctx, query, args).Scan(&p.Id, &p.UserId, &p.Url)
	if err != nil {
		return nil, fmt.Errorf("unable to get project: %w", err)
	}

	return &p, nil
}

// GetByUserID retrieves all projects for a user
func (r *Repository) GetByUserID(ctx context.Context, userId string) ([]*project.Project, error) {
	query := `SELECT id, user_id, url FROM projects WHERE user_id = @userId ORDER BY id`
	args := pgx.NamedArgs{
		"userId": userId,
	}

	rows, err := r.db.Query(ctx, query, args)
	if err != nil {
		return nil, fmt.Errorf("unable to query projects: %w", err)
	}
	defer rows.Close()

	projects := []*project.Project{}
	for rows.Next() {
		var p project.Project
		if err := rows.Scan(&p.Id, &p.UserId, &p.Url); err != nil {
			return nil, fmt.Errorf("unable to scan project row: %w", err)
		}
		projects = append(projects, &p)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating project rows: %w", err)
	}

	return projects, nil
}
