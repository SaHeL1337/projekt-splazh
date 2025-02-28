package subscription

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"projekt-splazh/pkg/database"
)

// Status represents subscription status
type Status string

const (
	// StatusFree represents a free subscription
	StatusFree Status = "free"
	// StatusPremium represents a premium subscription
	StatusPremium Status = "premium"
)

// Subscription represents a user subscription
type Subscription struct {
	UserID     string    `json:"user_id"`
	Status     Status    `json:"status"`
	ValidUntil time.Time `json:"valid_until"`
	CustomerID string    `json:"customer_id,omitempty"` // Stripe customer ID
}

// ErrSubscriptionNotFound is returned when a subscription is not found
var ErrSubscriptionNotFound = errors.New("subscription not found")

// ErrCustomerNotFound is returned when a customer ID is not found
var ErrCustomerNotFound = errors.New("customer not found")

// Config holds configuration for subscription service
type Config struct {
	TrialDurationDays int
}

// DefaultConfig returns the default configuration
func DefaultConfig() Config {
	return Config{
		TrialDurationDays: 7, // Default trial period is 7 days
	}
}

// Repository handles subscription data operations
type Repository interface {
	GetByUserID(userID string) (*Subscription, error)
	CreateTrialSubscription(userID string) (*Subscription, error)
	UpdateSubscription(sub *Subscription) error
	StoreCustomerID(userID string, customerID string) error
	GetUserIDByCustomerID(customerID string) (string, error)
}

type repository struct {
	db     *pgx.Conn
	config Config
}

// NewRepository creates a new subscription repository
func NewRepository() Repository {
	conn, err := database.ConnectDB()
	if err != nil {
		// Since we can't return an error from this function, we'll log it
		fmt.Println("Failed to connect to database:", err)
		return nil
	}
	
	return &repository{
		db:     conn,
		config: DefaultConfig(),
	}
}

// GetByUserID retrieves a subscription by user ID
func (r *repository) GetByUserID(userID string) (*Subscription, error) {
	ctx := context.Background()
	query := `SELECT user_id, status, valid_until, customer_id FROM subscription WHERE user_id = $1`
	
	var sub Subscription
	var statusStr string
	var customerID *string // Use pointer to handle NULL values
	
	err := r.db.QueryRow(ctx, query, userID).Scan(&sub.UserID, &statusStr, &sub.ValidUntil, &customerID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrSubscriptionNotFound
		}
		return nil, err
	}
	
	sub.Status = Status(statusStr)
	if customerID != nil {
		sub.CustomerID = *customerID
	}
	
	// Check if premium subscription has expired
	if sub.Status == StatusPremium && time.Now().After(sub.ValidUntil) {
		// Subscription has expired, update to free tier
		fmt.Printf("Subscription for user %s has expired, downgrading to free tier\n", userID)
		sub.Status = StatusFree
		
		// Update in database
		updateQuery := `UPDATE subscription SET status = $1 WHERE user_id = $2`
		_, err = r.db.Exec(ctx, updateQuery, string(sub.Status), sub.UserID)
		if err != nil {
			fmt.Printf("Warning: Failed to update expired subscription status in database: %v\n", err)
			// Continue anyway, we'll return the correct status to the caller
		}
	}
	
	return &sub, nil
}

// CreateTrialSubscription creates a new trial subscription
func (r *repository) CreateTrialSubscription(userID string) (*Subscription, error) {
	ctx := context.Background()
	
	// Create a new subscription with trial status
	sub := &Subscription{
		UserID:     userID,
		Status:     StatusFree,
		ValidUntil: time.Now().AddDate(0, 0, r.config.TrialDurationDays),
	}
	
	// Insert into database
	query := `INSERT INTO subscription (user_id, status, valid_until) VALUES ($1, $2, $3)`
	_, err := r.db.Exec(ctx, query, sub.UserID, string(sub.Status), sub.ValidUntil)
	if err != nil {
		return nil, err
	}
	
	return sub, nil
}

// UpdateSubscription updates an existing subscription
func (r *repository) UpdateSubscription(sub *Subscription) error {
	ctx := context.Background()
	
	query := `UPDATE subscription SET status = $1, valid_until = $2, customer_id = $3 WHERE user_id = $4`
	_, err := r.db.Exec(ctx, query, string(sub.Status), sub.ValidUntil, sub.CustomerID, sub.UserID)
	return err
}

// StoreCustomerID stores the Stripe customer ID for a user
func (r *repository) StoreCustomerID(userID string, customerID string) error {
	ctx := context.Background()
	
	// Check if subscription exists
	_, err := r.GetByUserID(userID)
	if err != nil {
		if err == ErrSubscriptionNotFound {
			// Create a new subscription with the customer ID
			query := `INSERT INTO subscription (user_id, status, valid_until, customer_id) 
                      VALUES ($1, $2, $3, $4)`
			_, err := r.db.Exec(ctx, query, userID, string(StatusFree), 
                         time.Now().AddDate(0, 0, r.config.TrialDurationDays), customerID)
			return err
		}
		return err
	}
	
	// Update existing subscription with customer ID
	query := `UPDATE subscription SET customer_id = $1 WHERE user_id = $2`
	_, err = r.db.Exec(ctx, query, customerID, userID)
	return err
}

// GetUserIDByCustomerID looks up a user ID by Stripe customer ID
func (r *repository) GetUserIDByCustomerID(customerID string) (string, error) {
	ctx := context.Background()
	
	query := `SELECT user_id FROM subscription WHERE customer_id = $1`
	var userID string
	
	err := r.db.QueryRow(ctx, query, customerID).Scan(&userID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return "", ErrCustomerNotFound
		}
		return "", err
	}
	
	return userID, nil
} 