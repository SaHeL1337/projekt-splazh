package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"projekt-splazh/pkg/database"
	"projekt-splazh/pkg/project"
	"projekt-splazh/pkg/project/repository"
	"projekt-splazh/utils"
)

type projectRequest struct {
	URL string `json:"url"`
}

// CreateProject handles the creation of a new project
func CreateProject(w http.ResponseWriter, r *http.Request) {
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
	repo := repository.NewRepository(conn)
	service := project.NewService(repo)

	// Parse request body
	var req projectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		fmt.Println(err)
		return
	}

	// Create the project
	if err := service.Create(r.Context(), usr.ID, req.URL); err != nil {
		http.Error(w, "Failed to create project", http.StatusInternalServerError)
		fmt.Println(err)
		return
	}

	// Return success response
	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, "{}")
}
