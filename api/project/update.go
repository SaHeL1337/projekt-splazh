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

func UpdateProject(w http.ResponseWriter, r *http.Request) {

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

	err = updateProject(context.Background(), conn, usr.ID, project.Url, project.Id)
	if err != nil {
		fmt.Println(err)
	}
	fmt.Fprintf(w, "{}")
}

func updateProject(ctx context.Context, conn *pgx.Conn, userId, url string, projectId int) error {
	query := `UPDATE projects SET url = @url WHERE userid = @userId AND id = @projectId`
	args := pgx.NamedArgs{
		"userId":    userId,
		"url":       url,
		"projectId": projectId,
	}
	_, err := conn.Exec(ctx, query, args)
	if err != nil {
		return fmt.Errorf("unable to update project: %w", err)
	}

	return nil
}
