package handler

import (
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/clerk/clerk-sdk-go/v2/jwt"
	"github.com/clerk/clerk-sdk-go/v2/user"
)

func Handler(w http.ResponseWriter, r *http.Request) {
	fmt.Println(os.Getenv("CLERK_SECRET_KEY"))
	clerk.SetKey(os.Getenv("CLERK_SECRET_KEY"))
	w.Header().Add("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "Authorization")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Get the session JWT from the Authorization header
	sessionToken := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")

	// Verify the session
	claims, err := jwt.Verify(r.Context(), &jwt.VerifyParams{
		Token: sessionToken,
	})
	if err != nil {
		// handle the error
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte(`{"access": "unauthorized"}`))
		return
	}

	usr, err := user.Get(r.Context(), claims.Subject)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"access": "unauthorized"}`))
		return
	}
	fmt.Fprintf(w, `{"user_id": "%s", "user_banned": "%t"}`, usr.ID, usr.Banned)

}
