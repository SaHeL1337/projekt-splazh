package main

import (
	"fmt"
	"net/http"
)

func main() {
	http.HandleFunc("/", Handler)

	err := http.ListenAndServe(":3333", nil)
	if err != nil {
		fmt.Println(err)
	}
}

func Handler(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "<h1>Hello from Go there. now!</h1>")
}
