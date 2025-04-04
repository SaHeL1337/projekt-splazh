source .env
docker build -t webcrawler crawler
docker run -e DATABASE_URL=${DATABASE_URL} webcrawler