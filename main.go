package main

import (
	"fmt"
	"net/http"

	handler "projekt-splazh/api"
)

func main() {

	// New RESTful endpoints
	http.HandleFunc("/api/project", handler.Project) // For GET with ID
	http.HandleFunc("/api/projects", handler.Projects)
	http.HandleFunc("/api/crawl", handler.Crawl)
	http.HandleFunc("/api/notifications", handler.Notifications)

	fmt.Println("Server starting on port 3333")
	err := http.ListenAndServe(":3333", nil)
	if err != nil {
		fmt.Println(err)
	}
}
