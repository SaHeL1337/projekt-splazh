package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	crawlQueue "projekt-splazh/internal/crawl"
	"projekt-splazh/internal/crawl/repository"
	"projekt-splazh/internal/database"
	"projekt-splazh/utils"
)

type crawlRequest struct {
	ProjectId int    `json:"projectId"`
	Url       string `json:"url"`
}

// StartCrawl handles starting a crawl for a project
func StartCrawl(w http.ResponseWriter, r *http.Request) {
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

	// Parse request body
	var req crawlRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		fmt.Println(err)
		return
	}

	// Add project to crawl queue
	repo := repository.NewRepository(conn)
	service := crawlQueue.NewService(repo)

	if err := service.Create(context.Background(), req.ProjectId); err != nil {
		http.Error(w, "Failed to add to crawl queue", http.StatusInternalServerError)
		fmt.Println(err)
		return
	}

	// Return success response
	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, "{}")
}
