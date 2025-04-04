#!/bin/bash
set -e

echo "Building and running webcrawler..."

# Build the Docker image
docker build -t webcrawler .

# Run the container
docker run -e DATABASE_URL="${DATABASE_URL}" webcrawler 