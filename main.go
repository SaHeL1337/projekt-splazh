package main

import (
	"fmt"
	"net/http"

	handler "projekt-splazh/api"
)

func main() {

	http.HandleFunc("/api/project", handler.Project) 
	http.HandleFunc("/api/projects", handler.Projects)
	http.HandleFunc("/api/crawl", handler.Crawl)
	http.HandleFunc("/api/notifications", handler.Notifications)
	http.HandleFunc("/api/subscription", handler.Subscription)
	http.HandleFunc("/api/stripe", handler.Stripe)

	fmt.Println("Server starting on port 3333")
	err := http.ListenAndServe(":3333", nil)
	if err != nil {
		fmt.Println(err)
	}
}
