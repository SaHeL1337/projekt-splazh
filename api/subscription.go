package handler

import (
	"encoding/json"
	"fmt"
	"net/http"

	"projekt-splazh/pkg/subscription"
	"projekt-splazh/utils"
)

// Subscription handles subscription-related requests
func Subscription(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" {
		utils.HandlePreFlight(w, r)
		return
	}
	
	// Only allow GET method
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Authenticate user - updated to match crawl.go
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

	// Get subscription repository
	repo := subscription.NewRepository()

	switch r.Method {
	case "GET":
		// Get subscription status
		sub, err := repo.GetByUserID(usr.ID) 
		if err != nil {
			// If subscription not found, create a trial subscription
			if err == subscription.ErrSubscriptionNotFound {
				sub, err = repo.CreateTrialSubscription(usr.ID) 
				if err != nil {
					http.Error(w, "Failed to create trial subscription", http.StatusInternalServerError)
					return
				}
			} else {
				http.Error(w, "Failed to get subscription", http.StatusInternalServerError)
				return
			}
		}
		// Return subscription data as JSON
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(sub)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}

	
} 