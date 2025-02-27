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
	"strconv"
)

// Project handles all project-related operations
func Project(w http.ResponseWriter, r *http.Request) {
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

	// Route based on HTTP method
	switch r.Method {
	case "GET":
		// Check if we're getting a specific project by ID
		projectIDParam := r.URL.Query().Get("projectId")
		if projectIDParam != "" {
			// Get project by ID from query parameter
			id, err := strconv.Atoi(projectIDParam)
			if err != nil {
				http.Error(w, "Invalid project ID", http.StatusBadRequest)
				fmt.Println(err)
				return
			}

			project, err := service.GetByID(r.Context(), id)
			if err != nil {
				http.Error(w, "Failed to retrieve project", http.StatusInternalServerError)
				fmt.Println(err)
				return
			}

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(project)
		} else {
			http.Error(w, "Invalid request", http.StatusBadRequest)
			return
		}

	case "POST":
		// Create a new project
		var req struct {
			URL string `json:"url"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			fmt.Println(err)
			return
		}

		if err := service.Create(r.Context(), usr.ID, req.URL); err != nil {
			http.Error(w, "Failed to create project", http.StatusInternalServerError)
			fmt.Println(err)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, "{}")

	case "PUT":
		// Update an existing project
		var req struct {
			ID  int    `json:"id"`
			URL string `json:"url"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			fmt.Println(err)
			return
		}

		if err := service.Update(r.Context(), req.ID, req.URL); err != nil {
			http.Error(w, "Failed to update project", http.StatusInternalServerError)
			fmt.Println(err)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, "{}")

	case "DELETE":
		// Delete a project
		var req struct {
			ID int `json:"id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			fmt.Println(err)
			return
		}

		if err := service.Delete(r.Context(), req.ID); err != nil {
			http.Error(w, "Failed to delete project", http.StatusInternalServerError)
			fmt.Println(err)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, "{}")

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
} 