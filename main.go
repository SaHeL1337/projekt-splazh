package main

import (
	"fmt"
	"net/http"

	handler "projekt-splazh/api"
	crawlHandler "projekt-splazh/api/crawl"
	projectHandler "projekt-splazh/api/project"
)

func main() {
	http.HandleFunc("/api/index", handler.Handler)
	http.HandleFunc("/api/test", handler.Test)

	http.HandleFunc("/api/project/create", projectHandler.CreateProject)
	http.HandleFunc("/api/project/delete", projectHandler.DeleteProject)
	http.HandleFunc("/api/project/get", projectHandler.GetProjects)
	http.HandleFunc("/api/project/update", projectHandler.UpdateProject)

	http.HandleFunc("/api/crawl/start", crawlHandler.StartCrawl)

	fmt.Println("Server starting on port 3333")
	err := http.ListenAndServe(":3333", nil)
	if err != nil {
		fmt.Println(err)
	}
}
