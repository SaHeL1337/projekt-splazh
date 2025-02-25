package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"projekt-splazh/internal/database"
	"projekt-splazh/internal/project"
	"projekt-splazh/internal/project/postgres"
	"projekt-splazh/utils"
)

type deleteRequest struct {
	ID int `json:"id"`
}

// DeleteProject handles deleting a project
func DeleteProject(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" {
		utils.HandlePreFlight(w, r)
		return
	}

	usr, err := utils.AuthenticateAndSetHeaders(w, r)
	if err != nil {
		http.Error(w, "Authentication error", http.StatusUnauthorized)
		fmt.Println(err)
		return
	}
	if usr == nil {
		http.Error(w, "User not found", http.StatusUnauthorized)
		fmt.Println("User not found")
		return
	}

	// Connect to database
	conn, err := database.ConnectDB()
	if err != nil {
		http.Error(w, "Database connection error", http.StatusInternalServerError)
		fmt.Println(err)
		return
	}
	defer conn.Close(context.Background())

	// Setup project repository and service
	repo := postgres.NewRepository(conn)
	service := project.NewService(repo)

	// Parse request body
	var req deleteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		fmt.Println(err)
		return
	}

	// Delete the project
	if err := service.Delete(r.Context(), req.ID); err != nil {
		http.Error(w, "Failed to delete project", http.StatusInternalServerError)
		fmt.Println(err)
		return
	}

	// Return success response
	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, "{}")
}
