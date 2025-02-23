package main

import (
	"fmt"
	"net/http"

	handler "projekt-splazh/api"
)

func main() {
	http.HandleFunc("/api/index", handler.Handler)
	http.HandleFunc("/api/test", handler.Test)

	err := http.ListenAndServe(":3333", nil)
	if err != nil {
		fmt.Println(err)
	}
}
