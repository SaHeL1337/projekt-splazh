#!/bin/bash
set -e

echo "Starting webcrawler in Docker container..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL environment variable is not set"
    exit 1
fi

# Verify Chrome and ChromeDriver are installed correctly
echo "Checking Chrome installation..."
CHROME_VERSION=$(google-chrome --version)
echo "Chrome version: $CHROME_VERSION"

echo "Checking ChromeDriver installation..."
CHROMEDRIVER_VERSION=$(chromedriver --version)
echo "ChromeDriver version: $CHROMEDRIVER_VERSION"

# Check compatibility
CHROME_MAJOR_VERSION=$(echo "$CHROME_VERSION" | awk '{print $3}' | cut -d. -f1)
CHROMEDRIVER_MAJOR_VERSION=$(echo "$CHROMEDRIVER_VERSION" | grep -oP 'ChromeDriver \K[0-9]+' || echo "unknown")

echo "Chrome major version: $CHROME_MAJOR_VERSION"
echo "ChromeDriver major version: $CHROMEDRIVER_MAJOR_VERSION"

if [ "$CHROME_MAJOR_VERSION" != "$CHROMEDRIVER_MAJOR_VERSION" ]; then
    echo "WARNING: Chrome version ($CHROME_MAJOR_VERSION) and ChromeDriver version ($CHROMEDRIVER_MAJOR_VERSION) do not match!"
    echo "This may cause issues with the crawler."
fi

# Run the crawler
echo "Starting crawler..."
exec python main.py 