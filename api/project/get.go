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

// GetProjects handles retrieving all projects for a user
func GetProjects(w http.ResponseWriter, r *http.Request) {
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

	// Get all projects for the user
	projects, err := service.GetByUserID(r.Context(), usr.ID)
	if err != nil {
		http.Error(w, "Failed to retrieve projects", http.StatusInternalServerError)
		fmt.Println(err)
		return
	}

	// Return projects as JSON
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(projects); err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		fmt.Println(err)
		return
	}
}
