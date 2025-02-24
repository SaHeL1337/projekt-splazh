package handler

import (
	"context"
	"fmt"
	"net/http"
	"os"
	utils "projekt-splazh/utils"

	"github.com/jackc/pgx/v5"
)

func Handler(w http.ResponseWriter, r *http.Request) {

	if r.Method == "OPTIONS" {
		utils.HandlePreFlight(w, r)
		return
	}

	usr, err := utils.AuthenticateAndSetHeaders(w, r)
	if err != nil {
		fmt.Println(err)
		return
	}
	if usr == nil {
		fmt.Println("User not found")
		return
	}

	fmt.Fprintf(w, `{"user_id": "%s", "user_banned": "%t"}`, usr.ID, usr.Banned)

	conn, err := pgx.Connect(context.Background(), os.Getenv("DATABASE_URL"))
	if err != nil {
		fmt.Fprintf(os.Stderr, "Unable to connect to database: %v\n", err)
		os.Exit(1)
	}
	defer conn.Close(context.Background())

	err = insertTokens(context.Background(), conn, usr.ID)
	if err != nil {
		fmt.Println(err)
	}

	tokens, err := getTokens(context.Background(), conn, usr.ID)
	if err != nil {
		fmt.Println(err)
	}
	fmt.Println(tokens)

	var name string
	var weight int64
	err = conn.QueryRow(context.Background(), "select name, weight from widgets where id=$1", 42).Scan(&name, &weight)
	if err != nil {
		fmt.Fprintf(os.Stderr, "QueryRow failed: %v\n", err)
		os.Exit(1)
	}

	fmt.Println(name, weight)

}

func getTokens(ctx context.Context, conn *pgx.Conn, userId string) (int, error) {
	query := `SELECT tokens FROM tokens WHERE userId = @userId`
	args := pgx.NamedArgs{
		"userId": userId,
	}
	var tokens int
	err := conn.QueryRow(ctx, query, args).Scan(&tokens)
	if err != nil {
		return 0, fmt.Errorf("unable to get tokens: %w", err)
	}

	return tokens, nil
}

func insertTokens(ctx context.Context, conn *pgx.Conn, userId string) error {
	query := `INSERT INTO tokens (userId, tokens) VALUES (@userId, @tokens)`
	args := pgx.NamedArgs{
		"userId": userId,
		"tokens": 300,
	}
	_, err := conn.Exec(ctx, query, args)
	if err != nil {
		return fmt.Errorf("unable to insert row: %w", err)
	}

	return nil
}
