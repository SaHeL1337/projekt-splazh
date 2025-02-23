package handler

import (
	"net/http"

	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/clerk/clerk-sdk-go/v2/user"
)

func Handler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims, ok := clerk.SessionClaimsFromContext(ctx)
	if !ok {
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte(`{"access": "unauthorized"}`))
		return
	}

	usr, err := user.Get(ctx, claims.Subject)
	if err != nil {
		panic(err)
	}
	if usr == nil {
		w.Write([]byte("User does not exist"))
		return
	}

	w.Write([]byte("Hello " + *usr.FirstName))
}
