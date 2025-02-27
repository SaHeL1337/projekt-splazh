package utils

import (
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/clerk/clerk-sdk-go/v2/jwt"
	"github.com/clerk/clerk-sdk-go/v2/user"
)

/*
This middleware function is used to authenticate the user and set the necessary headers for the response.
It takes the response writer and the request as arguments and returns a user object and an error.
We need to do it this way because vercel does not support middleware. It only accepts the standard
http.HandleFunc() function. This function is used in the handler functions to authenticate the user.
*/
func AuthenticateAndSetHeaders(w http.ResponseWriter, r *http.Request) (*clerk.User, error) {

	clerkSecret := os.Getenv("CLERK_SECRET_KEY")

	if clerkSecret == "" {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"access": "unauthorized"}`))
		return nil, fmt.Errorf("clerk secret key not found")
	}

	clerk.SetKey(clerkSecret)
	setHeaders(w)

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
		return nil, err
	}

	usr, err := user.Get(r.Context(), claims.Subject)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"access": "unauthorized"}`))
		return nil, err
	}
	return usr, nil
}

func HandlePreFlight(w http.ResponseWriter, r *http.Request) {
	setHeaders(w)
	w.WriteHeader(http.StatusOK)
}

func setHeaders(w http.ResponseWriter) {
	// This function is used to set the headers for the response.
	// It is used in the handler functions to set the necessary headers for the response.
	w.Header().Add("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "Authorization")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
}
