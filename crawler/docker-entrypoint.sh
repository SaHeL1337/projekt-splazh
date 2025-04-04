#!/bin/bash
set -e

echo "Starting webcrawler in Docker container..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL environment variable is not set"
    exit 1
fi

# Verify Chromium and ChromeDriver are installed correctly
echo "Checking Chromium installation..."
CHROMIUM_VERSION=$(chromium --version)
echo "Chromium version: $CHROMIUM_VERSION"

echo "Checking ChromeDriver installation..."
CHROMEDRIVER_VERSION=$(chromedriver --version)
echo "ChromeDriver version: $CHROMEDRIVER_VERSION"

# Start Xvfb for headless browser support
echo "Starting Xvfb virtual display..."
Xvfb :99 -screen 0 1280x1024x24 -ac &
export DISPLAY=:99
sleep 1

# Run the crawler
echo "Starting crawler..."
exec python main.py 