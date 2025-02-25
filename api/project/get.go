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

func GetProjects(w http.ResponseWriter, r *http.Request) {

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

	var projects []Project
	projects, err = getProjects(context.Background(), conn, usr.ID)
	if err != nil {
		fmt.Println(err)
	}

	jsonData, err := json.Marshal(projects)
	if err != nil {
		http.Error(w, fmt.Sprintf("Error encoding JSON: %v", err), http.StatusInternalServerError)
		return
	}
	w.Write(jsonData)
}

func getProjects(ctx context.Context, conn *pgx.Conn, userId string) ([]Project, error) {
	query := `SELECT * FROM projects where userId = @userId ORDER BY id ASC`
	args := pgx.NamedArgs{
		"userId": userId,
	}
	rows, err := conn.Query(ctx, query, args)
	if err != nil {
		return nil, fmt.Errorf("unable to get rows: %w", err)
	}
	projects := []Project{}
	for rows.Next() {
		var project Project
		err = rows.Scan(&project.Id, &project.UserId, &project.Url)
		if err != nil {
			return nil, fmt.Errorf("unable to scan row: %w", err)
		}
		projects = append(projects, project)
	}

	return projects, nil
}
