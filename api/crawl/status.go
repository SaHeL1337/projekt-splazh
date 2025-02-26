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
)

type statusRequest struct {
	ProjectId int `json:"projectId"`
}

func StatusCrawl(w http.ResponseWriter, r *http.Request) {
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
	var req statusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		fmt.Println(err)
		return
	}

	// Get crawl status
	repo := repository.NewRepository(conn)
	service := crawlQueue.NewService(repo)

	status, pagesCrawled, err := service.GetStatus(context.Background(), req.ProjectId)
	if err != nil {
		http.Error(w, "Failed to get crawl status", http.StatusInternalServerError)
		fmt.Println(err)
		return
	}

	// Return status response
	w.Header().Set("Content-Type", "application/json")
	response := struct {
		Status      string `json:"status"`
		PagesCrawled int    `json:"pagesCrawled"`
	}{
		Status:      status,
		PagesCrawled: pagesCrawled,
	}
	json.NewEncoder(w).Encode(response)
}
