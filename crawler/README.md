# Webcrawler Docker Container

This directory contains a Dockerized version of the webcrawler that can run headlessly in a container environment.

## Prerequisites

- Docker installed on your system
- Docker Compose (optional, but recommended)

## Configuration

The crawler requires a PostgreSQL database connection. You need to provide the database connection string via the `DATABASE_URL` environment variable.

## Building and Running with Docker

### Option 1: Using Docker directly

1. Build the Docker image:
   ```bash
   docker build -t webcrawler .
   ```

2. Run the container:
   ```bash
   docker run -e DATABASE_URL="your_database_url" webcrawler
   ```

### Option 2: Using Docker Compose (Recommended)

1. Create a `.env` file in this directory with your database URL:
   ```
   DATABASE_URL=postgres://username:password@hostname:port/database?sslmode=require
   ```

2. Build and run with Docker Compose:
   ```bash
   docker-compose up --build
   ```

3. To run in the background:
   ```bash
   docker-compose up -d
   ```

4. To stop the container:
   ```bash
   docker-compose down
   ```

## Logs

The crawler logs are stored in `crawler.log`, which is mounted as a volume so you can view the logs from your host machine.

## Troubleshooting

### Chrome/Selenium Issues

If you encounter issues with Chrome or Selenium, check the following:

1. **ChromeDriver Version**: The Dockerfile is configured to automatically detect the Chrome version and download a matching ChromeDriver. If you see errors like:
   
   ```
   session not created: This version of ChromeDriver only supports Chrome version X
   Current browser version is Y
   ```
   
   This means there's a version mismatch. You can:
   
   - Rebuild the Docker image to get the latest matching ChromeDriver
   - Manually specify a compatible ChromeDriver version in the Dockerfile

2. The container has enough memory allocated (at least 2GB recommended)

3. Check the logs for any specific error messages

### Database Connection Issues

If you have database connection problems:

1. Verify your `DATABASE_URL` is correct
2. Ensure your database is accessible from the container
3. Check if your database requires SSL connections

## Advanced Configuration

You can modify the `docker-entrypoint.sh` script or the `Dockerfile` to customize the crawler's behavior or add additional dependencies as needed.

## Common Errors and Solutions

### Error: "session not created: This version of ChromeDriver only supports Chrome version X"

This error occurs when the ChromeDriver version doesn't match the installed Chrome version. The current Dockerfile attempts to automatically download the correct ChromeDriver version, but if this fails:

1. Check the Chrome version in the container:
   ```bash
   docker run --rm webcrawler google-chrome --version
   ```

2. Manually update the Dockerfile to download the specific matching ChromeDriver version:
   ```dockerfile
   # Example for Chrome 133
   RUN wget -q -O /tmp/chromedriver_linux64.zip "https://storage.googleapis.com/chrome-for-testing-public/133.0.6943.0/linux64/chromedriver-linux64.zip" \
       && unzip /tmp/chromedriver_linux64.zip -d /tmp/ \
       && mv /tmp/chromedriver-linux64/chromedriver /usr/local/bin/chromedriver \
       && chmod +x /usr/local/bin/chromedriver
   ```

3. Rebuild the image:
   ```bash
   docker build -t webcrawler .
   ```

### Error: "AttributeError: 'Webcrawler' object has no attribute 'driver'"

This error occurs when the Webcrawler's `__del__` method tries to access the `driver` attribute that wasn't successfully initialized. This has been fixed in the latest version of the code by adding proper error handling. 