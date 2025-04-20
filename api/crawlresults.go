package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"projekt-splazh/pkg/crawlresults"
	"projekt-splazh/pkg/database"
	"projekt-splazh/utils"
	"strconv"
)

// CrawlResults handles operations for retrieving crawl performance metrics
func CrawlResults(w http.ResponseWriter, r *http.Request) {
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

	// Setup crawl results repository and service
	repo := crawlresults.NewRepository(conn)
	service := crawlresults.NewService(repo)

	// Only handle GET requests for now
	if r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get project ID from query parameters
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

	// Get performance metrics
	metrics, err := service.GetResults(r.Context(), projectID)
	if err != nil {
		http.Error(w, "Failed to get crawl results", http.StatusInternalServerError)
		fmt.Println(err)
		return
	}

	// Return the results as JSON
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(metrics); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
		fmt.Println(err)
		return
	}
} 