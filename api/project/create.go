package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	utils "projekt-splazh/utils"

	"github.com/jackc/pgx/v5"
)

type Project struct {
	Id     int
	UserId string
	Url    string
}

func CreateProject(w http.ResponseWriter, r *http.Request) {

	if r.Method == "OPTIONS" {
		utils.HandlePreFlight(w, r)
		return
	}

	usr, err := utils.AuthenticateAndSetHeaders(w, r)
	if err != nil {
		fmt.Println(err)
		return
	}
	if usr == nil {
		fmt.Println("User not found")
		return
	}

	conn, err := pgx.Connect(context.Background(), os.Getenv("DATABASE_URL"))
	if err != nil {
		fmt.Fprintf(os.Stderr, "Unable to connect to database: %v\n", err)
		os.Exit(1)
	}
	defer conn.Close(context.Background())

	var project Project
	err = json.NewDecoder(r.Body).Decode(&project)
	if err != nil {
		fmt.Println(err)
	}

	err = insertProject(context.Background(), conn, usr.ID, project.Url)
	if err != nil {
		fmt.Println(err)
	}
	fmt.Fprintf(w, "{}")
}

func insertProject(ctx context.Context, conn *pgx.Conn, userId, url string) error {
	query := `INSERT INTO projects (userId, url) VALUES (@userId, @url)`
	args := pgx.NamedArgs{
		"userId": userId,
		"url":    url,
	}
	_, err := conn.Exec(ctx, query, args)
	if err != nil {
		return fmt.Errorf("unable to insert row: %w", err)
	}

	return nil
}
