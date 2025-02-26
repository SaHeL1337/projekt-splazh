import os
import time
import logging
from datetime import datetime
from urllib.parse import urlparse
from dotenv import load_dotenv
from Webcrawler import Webcrawler
import psycopg2
# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("crawler.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("crawler_service")

# Load environment variables
load_dotenv()

class CrawlerService:
    def __init__(self, max_depth=1):
        self.max_depth = max_depth
        self.db_url = os.getenv("DATABASE_URL")
        if not self.db_url:
            raise ValueError("DATABASE_URL environment variable not set")
        
        # Initialize database connection
        self.conn = None
        self.connect_db()

    def connect_db(self):
        """Establish database connection"""
        try:
            if self.conn is None or self.conn.closed:
                self.conn = psycopg2.connect(self.db_url)
                self.conn.autocommit = False 
                logger.info("Connected to database")
        except Exception as e:
            logger.error(f"Database connection error: {e}")
            raise

    def get_next_crawl_job(self):
        """Get the next crawl job from the queue"""
        try:
            self.connect_db()
            cursor = self.conn.cursor()
            
            # Get the next job with the earliest time_start
            query = """
            SELECT cq.id, cq.project_id, p.url 
            FROM crawl_queue cq
            JOIN projects p ON cq.project_id = p.id
            ORDER BY cq.time_start ASC
            LIMIT 1
            """
            
            cursor.execute(query)
            result = cursor.fetchone()
            cursor.close()
            
            if result:
                return {
                    "queue_id": result[0],
                    "project_id": result[1],
                    "url": result[2]
                }
            return None
            
        except Exception as e:
            logger.error(f"Error getting next crawl job: {e}")
            if self.conn:
                self.conn.rollback()
            return None

    def save_crawl_result(self, project_id, url, html, projectNotifications):
        """Save crawl results to database"""
        try:
            self.connect_db()
            cursor = self.conn.cursor()
            
            # Begin transaction
            timestamp = datetime.now()
            
            # Insert crawl result
            cursor.execute(
                """
                INSERT INTO crawl_result (project_id, url, html, time_crawled)
                VALUES (%s, %s, %s, %s)
                """,
                (project_id, url, html, timestamp)
            )
            
            for notification in projectNotifications:
                cursor.execute(
                    """
                    INSERT INTO project_notifications 
                    (project_id, url, category, message, timestamp)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (
                        project_id, 
                        url, 
                        notification.category,
                        notification.message,
                        timestamp
                    )
                )
            
            # Commit transaction
            self.conn.commit()
            logger.info(f"Saved crawl result for {url}")
            
        except Exception as e:
            logger.error(f"Error saving crawl result: {e}")
            if self.conn:
                self.conn.rollback()

    def remove_from_queue(self, queue_id):
        """Remove processed job from queue"""
        try:
            self.connect_db()
            cursor = self.conn.cursor()
            
            cursor.execute(
                "DELETE FROM crawl_queue WHERE id = %s",
                (queue_id,)
            )
            
            self.conn.commit()
            logger.info(f"Removed job {queue_id} from queue")
            
        except Exception as e:
            logger.error(f"Error removing job from queue: {e}")
            if self.conn:
                self.conn.rollback()


    def process_crawl_job(self, job):
        """Process a crawl job"""
        logger.info(f"Processing crawl job for project {job['project_id']}, URL: {job['url']}")
        
        try:
            
            # Initialize webcrawler with improved functionality
            crawler = Webcrawler(job['url'], self.max_depth)
            
            # Set up a callback to save pages as they're crawled
            def save_page_callback(crawled_page):
                self.save_crawl_result(
                    job['project_id'],
                    crawled_page.url,
                    crawled_page.html,
                    crawled_page.projectNotifications
                )
            
            # Pass the callback to the crawler
            crawler.set_callback(save_page_callback)
            
            # Start crawling - this will now save pages as it goes
            crawler.crawl()
            
            # Remove job from queue
            self.remove_from_queue(job['queue_id'])
            
            logger.info(f"Completed crawl job for project {job['project_id']}")
            
        except Exception as e:
            logger.error(f"Error processing crawl job: {e}")
            # Don't remove from queue on error to allow retry

    def run(self):
        """Main service loop"""
        logger.info("Starting crawler service")
        
        
        while True:
            try:
                # Get next job
                job = self.get_next_crawl_job()
                
                if job:
                    logger.info(f"Found job for project {job['project_id']}")
                    self.process_crawl_job(job)
                else:
                    logger.info("No jobs in queue, waiting...")
                
                # Wait before checking again
                time.sleep(5)
                
            except Exception as e:
                logger.error(f"Error in main loop: {e}")
                time.sleep(5)  # Wait before retrying

    def close(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()
            logger.info("Closed database connection")

if __name__ == "__main__":
    try:
        service = CrawlerService(max_depth=2)
        service.run()
    except KeyboardInterrupt:
        logger.info("Service stopped by user")
    except Exception as e:
        logger.error(f"Service error: {e}")
    finally:
        if 'service' in locals():
            service.close() 