package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"projekt-splazh/pkg/database"
	"projekt-splazh/pkg/notifications"
	"projekt-splazh/pkg/notifications/repository"
	"projekt-splazh/utils"
	"strconv"
)

func GetNotifications(w http.ResponseWriter, r *http.Request) {
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

	// Get project ID from query params
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

	// Connect to database
	conn, err := database.ConnectDB()
	if err != nil {
		http.Error(w, "Database connection error", http.StatusInternalServerError)
		fmt.Println(err)
		return
	}
	defer conn.Close(context.Background())

	// Get notifications
	repo := repository.NewRepository(conn)
	service := notifications.NewService(repo)

	notificationsList, err := service.GetByProjectID(context.Background(), projectID)
	if err != nil {
		http.Error(w, "Failed to get notifications", http.StatusInternalServerError)
		fmt.Println(err)
		return
	}

	// Return notifications
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(notificationsList)
} 