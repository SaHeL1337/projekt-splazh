package handler

import (
	"fmt"
	"net/http"
)

func Test(w http.ResponseWriter, r *http.Request) {
	w.Header().Add("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "Authorization")

	fmt.Fprintf(w, "{\"message\": \"Hello from test\"}")
}
