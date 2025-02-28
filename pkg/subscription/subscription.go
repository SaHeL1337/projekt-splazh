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
	// StatusTrial represents a trial subscription
	StatusTrial Status = "trial"
	// StatusPremium represents a premium subscription
	StatusPremium Status = "premium"
)

// Subscription represents a user subscription
type Subscription struct {
	UserID     string    `json:"user_id"`
	Status     Status    `json:"status"`
	ValidUntil time.Time `json:"valid_until"`
}

// ErrSubscriptionNotFound is returned when a subscription is not found
var ErrSubscriptionNotFound = errors.New("subscription not found")

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
	query := `SELECT user_id, status, valid_until FROM subscription WHERE user_id = $1`
	
	var sub Subscription
	var statusStr string
	err := r.db.QueryRow(ctx, query, userID).Scan(&sub.UserID, &statusStr, &sub.ValidUntil)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrSubscriptionNotFound
		}
		return nil, err
	}
	
	sub.Status = Status(statusStr)
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
	
	query := `UPDATE subscription SET status = $1, valid_until = $2 WHERE user_id = $3`
	_, err := r.db.Exec(ctx, query, string(sub.Status), sub.ValidUntil, sub.UserID)
	return err
} 