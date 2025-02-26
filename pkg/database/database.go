package database

import (
	"context"
	"fmt"
	"os"

	"github.com/jackc/pgx/v5"
)

// ConnectDB establishes a connection to the database
func ConnectDB() (*pgx.Conn, error) {
	conn, err := pgx.Connect(context.Background(), os.Getenv("DATABASE_URL"))
	if err != nil {
		return nil, fmt.Errorf("unable to connect to database: %w", err)
	}
	return conn, nil
}
