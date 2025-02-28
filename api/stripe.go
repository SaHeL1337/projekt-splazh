package handler

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"projekt-splazh/pkg/subscription"
	"time"

	"github.com/stripe/stripe-go/v81"
	"github.com/stripe/stripe-go/v81/webhook"
)

// Stripe handles webhook events from Stripe
func Stripe(w http.ResponseWriter, r *http.Request) {
	
	// Read the request body
	payload, err := ioutil.ReadAll(r.Body)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error reading request body: %v\n", err)
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	
	// For local development, allow skipping signature verification
	var event stripe.Event
	endpointSecret := os.Getenv("STRIPE_WEBHOOK_SECRET")
	
	if endpointSecret == "" {
		fmt.Println("Warning: STRIPE_WEBHOOK_SECRET not set, skipping signature verification")
		// Parse the event directly from the payload
		if err := json.Unmarshal(payload, &event); err != nil {
			fmt.Fprintf(os.Stderr, "Error parsing webhook JSON: %v\n", err)
			w.WriteHeader(http.StatusBadRequest)
			return
		}
	} else {
		// Verify the webhook signature
		event, err = webhook.ConstructEvent(payload, r.Header.Get("Stripe-Signature"), endpointSecret)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error verifying webhook signature: %v\n", err)
			w.WriteHeader(http.StatusBadRequest)
			return
		}
	}
	
	fmt.Printf("Processing event type: %s\n", event.Type)
	
	// Get subscription repository
	repo := subscription.NewRepository()
	if repo == nil {
		fmt.Fprintf(os.Stderr, "Error creating subscription repository\n")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	
	// Process the event based on its type
	var handled bool
	
	switch event.Type {
	case "checkout.session.completed":
		// User completed checkout - set to premium
		handled = handleCheckoutSessionCompleted(event, repo)
		
	case "customer.subscription.updated":
		// Subscription updated - check for cancel_at_period_end
		handled = handleSubscriptionUpdated(event, repo)
		
	case "customer.subscription.deleted":
		// Subscription canceled - set to free
		handled = handleSubscriptionCanceled(event, repo)
		
	default:
		// Ignore other events
		handled = true
	}
	
	if !handled {
		fmt.Printf("Failed to handle event %s\n", event.ID)
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	
	// Return a success response
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

// handleCheckoutSessionCompleted processes a checkout.session.completed event
// This is where we link the Stripe customer ID to our user and set them to premium
func handleCheckoutSessionCompleted(event stripe.Event, repo subscription.Repository) bool {
	var session stripe.CheckoutSession
	err := json.Unmarshal(event.Data.Raw, &session)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error parsing checkout session data: %v\n", err)
		return false
	}
	
	// Get user ID from client_reference_id
	userID := session.ClientReferenceID
	if userID == "" {
		fmt.Fprintf(os.Stderr, "Error: client_reference_id not found in checkout session\n")
		return false
	}
	
	// Get customer ID from the session
	customerID := session.Customer.ID
	if customerID == "" {
		fmt.Fprintf(os.Stderr, "Error: customer ID not found in checkout session\n")
		return false
	}
	
	
	// Set to premium with a far future expiration date
	// This will be updated if the subscription is canceled
	status := subscription.StatusPremium
	validUntil := time.Now().AddDate(10, 0, 0) // 10 years in the future
	
	// Update the subscription in the database
	return updateSubscription(repo, userID, status, validUntil, customerID)
}

// handleSubscriptionUpdated processes a customer.subscription.updated event
func handleSubscriptionUpdated(event stripe.Event, repo subscription.Repository) bool {
	var sub stripe.Subscription
	err := json.Unmarshal(event.Data.Raw, &sub)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error parsing subscription data: %v\n", err)
		return false
	}
	
	// Get customer ID from the subscription
	customerID := sub.Customer.ID
	if customerID == "" {
		fmt.Fprintf(os.Stderr, "Error: customer ID not found in subscription\n")
		return false
	}
	
	// Look up the user ID by customer ID
	userID, err := repo.GetUserIDByCustomerID(customerID)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error looking up user by customer ID: %v\n", err)
		return false
	}
	
	// Check subscription status
	if sub.Status == stripe.SubscriptionStatusActive {
		// Check if subscription is set to cancel at period end
		if sub.CancelAtPeriodEnd {
			// Subscription will be canceled at the end of the current period
			// Keep premium status until then
			validUntil := time.Unix(sub.CurrentPeriodEnd, 0)
			
			
			// Update the subscription in the database
			return updateSubscription(repo, userID, subscription.StatusPremium, validUntil, customerID)
		} else {
			// Active subscription with no cancellation - could be a resubscription or regular renewal
			// Check if we need to update the valid_until date
			existingSub, err := repo.GetByUserID(userID)
			if err != nil {
				fmt.Fprintf(os.Stderr, "Error getting subscription for user %s: %v\n", userID, err)
				return false
			}
			
			// If the subscription was previously set to expire soon (within 30 days)
			// or if it was set to free, this is likely a resubscription
			thirtyDaysFromNow := time.Now().AddDate(0, 0, 30)
			if existingSub.Status == subscription.StatusFree || existingSub.ValidUntil.Before(thirtyDaysFromNow) {
		
				// Set to premium with a far future expiration date
				validUntil := time.Now().AddDate(10, 0, 0) // 10 years in the future
				return updateSubscription(repo, userID, subscription.StatusPremium, validUntil, customerID)
			}
		}
	} else if sub.Status == stripe.SubscriptionStatusTrialing {
		// Handle trial subscription
		validUntil := time.Unix(sub.TrialEnd, 0)
		
		// If trial is set to cancel at period end, use the trial end date
		// Otherwise, set a far future date (will be updated if canceled)
		if sub.CancelAtPeriodEnd {
			return updateSubscription(repo, userID, subscription.StatusPremium, validUntil, customerID)
		} else {
			// Trial that will convert to paid - set far future date
			farFuture := time.Now().AddDate(10, 0, 0)
			return updateSubscription(repo, userID, subscription.StatusPremium, farFuture, customerID)
		}
	} else if sub.Status == stripe.SubscriptionStatusIncomplete || 
	          sub.Status == stripe.SubscriptionStatusIncompleteExpired ||
	          sub.Status == stripe.SubscriptionStatusPastDue ||
	          sub.Status == stripe.SubscriptionStatusUnpaid {
		return updateSubscription(repo, userID, subscription.StatusFree, time.Now(), customerID)
	}
	
	// No changes needed for other cases
	return true
}

// handleSubscriptionCanceled processes a customer.subscription.deleted event
func handleSubscriptionCanceled(event stripe.Event, repo subscription.Repository) bool {
	var sub stripe.Subscription
	err := json.Unmarshal(event.Data.Raw, &sub)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error parsing subscription data: %v\n", err)
		return false
	}
	
	// Get customer ID from the subscription
	customerID := sub.Customer.ID
	if customerID == "" {
		fmt.Fprintf(os.Stderr, "Error: customer ID not found in subscription\n")
		return false
	}
	
	// Look up the user ID by customer ID
	userID, err := repo.GetUserIDByCustomerID(customerID)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error looking up user by customer ID: %v\n", err)
		return false
	}
	
	// Set status to free
	status := subscription.StatusFree
	validUntil := time.Now() // Immediately expire
	
	// Update the subscription in the database
	return updateSubscription(repo, userID, status, validUntil, customerID)
}

// updateSubscription updates a subscription with customer ID
func updateSubscription(repo subscription.Repository, userID string, status subscription.Status, validUntil time.Time, customerID string) bool {
	// Get existing subscription - we assume it exists
	existingSub, err := repo.GetByUserID(userID)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error getting subscription for user %s: %v\n", userID, err)
		return false
	}
	
	// Update existing subscription
	existingSub.Status = status
	existingSub.ValidUntil = validUntil
	existingSub.CustomerID = customerID
	err = repo.UpdateSubscription(existingSub)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error updating subscription: %v\n", err)
		return false
	}
	
	return true
}