package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	crawlQueue "projekt-splazh/pkg/crawl"
	"projekt-splazh/pkg/crawl/repository"
	"projekt-splazh/pkg/database"
	"projekt-splazh/utils"
	"strconv"
)

// Crawl handles all crawl-related operations
func Crawl(w http.ResponseWriter, r *http.Request) {
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

	// Setup crawl repository and service
	repo := repository.NewRepository(conn)
	service := crawlQueue.NewService(repo)

	// Route based on HTTP method
	switch r.Method {
	case "GET":
		// Get crawl status
		projectIDStr := r.URL.Query().Get("projectId")
		if projectIDStr == "" {
			http.Error(w, "Missing project ID", http.StatusBadRequest)
			return
		}
 
		projectID, err := strconv.Atoi(projectIDStr)
		if err != nil {
			http.Error(w, "Invalid project ID", http.StatusBadRequest)
			fmt.Println(err)
			return
		}

		status, pagesCrawled, err := service.GetStatus(r.Context(), projectID)
		if err != nil {
			http.Error(w, "Failed to get crawl status", http.StatusInternalServerError)
			fmt.Println(err)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		response := struct {
			Status       string `json:"status"`
			PagesCrawled int    `json:"pagesCrawled"`
		}{
			Status:       status,
			PagesCrawled: pagesCrawled,
		}
		json.NewEncoder(w).Encode(response)

	case "POST":
		// Queue a new crawl
		var req struct {
			ProjectId int `json:"projectId"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			fmt.Println(err)
			return
		}

		if err := service.Create(r.Context(), req.ProjectId); err != nil {
			http.Error(w, "Failed to add to crawl queue", http.StatusInternalServerError)
			fmt.Println(err)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, "{}")

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
} 