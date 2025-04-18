import os
import time
import logging
from datetime import datetime
from urllib.parse import urlparse
from dotenv import load_dotenv
from Webcrawler import Webcrawler, crawledPage
import psycopg2
from psycopg2 import sql

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("crawler.log"),
        logging.StreamHandler()
    ]
)
# Set higher log level specifically for urllib3 connection pool to reduce spam
logging.getLogger("urllib3.connectionpool").setLevel(logging.ERROR)

logger = logging.getLogger("crawler_service")

# Load environment variables
load_dotenv()

class CrawlerService:
    def __init__(self, max_depth=1, max_title_length=60):
        self.max_depth = max_depth
        self.max_title_length = max_title_length
        self.db_url = os.getenv("DATABASE_URL")
        if not self.db_url:
            raise ValueError("DATABASE_URL environment variable not set")
        
        # Initialize database connection
        self.conn = None
        self.connect_db()
        # Track URLs saved in the current session for a specific project
        self._saved_urls_this_session = set()

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
                # Clear the saved URLs set when starting a new job
                self._saved_urls_this_session.clear()
                logger.info(f"Cleared saved URL cache for new job {result[0]}")
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

    def save_crawl_result(self, project_id, crawled_page: crawledPage):
        """Upsert crawl results to database, preventing duplicates within the same session"""
        # Normalize URL before checking/saving (ensure consistency with Webcrawler normalization)
        normalized_url = crawled_page.url # Placeholder: Use consistent normalization
        
        session_key = (project_id, normalized_url)
        if session_key in self._saved_urls_this_session:
            logger.warning(f"Skipping duplicate save attempt for {normalized_url} in project {project_id} within this session.")
            return
            
        try:
            self.connect_db()
            cursor = self.conn.cursor()
            timestamp = datetime.now()
            
            # Base columns always present
            base_columns = ['project_id', 'url', 'time_crawled']
            base_values = [project_id, normalized_url, timestamp]
            
            # --- Data to potentially save/update --- 
            # TODO: Populate this dict based on actual data extracted by Webcrawler
            # This should mirror the columns in your crawl_result table you want to fill
            data_to_save = {
                 'html': crawled_page.html,
                 # 'status_code': getattr(crawled_page, 'status_code', None),
                 # 'load_time_seconds': getattr(crawled_page, 'load_time_seconds', None),
                 # 'title': getattr(crawled_page, 'title', None),
                 # 'meta_description': getattr(crawled_page, 'meta_description', None),
                 # 'headers': json.dumps(getattr(crawled_page, 'headers', None)), 
                 # 'image_alt_issues_count': getattr(crawled_page, 'image_alt_issues_count', None),
                 # etc...
             }
             
            # Filter out None values if necessary, depending on column constraints
            valid_data = {k: v for k, v in data_to_save.items() if v is not None} # Example: Filter None
            # valid_data = data_to_save # Or keep all

            # Prepare dynamic parts of the query
            insert_columns = base_columns + list(valid_data.keys())
            all_values = base_values + list(valid_data.values())
            
            columns_sql = sql.SQL(", ").join(map(sql.Identifier, insert_columns))
            values_placeholders_sql = sql.SQL(", ").join([sql.Placeholder()] * len(all_values))
            
            # Prepare the UPDATE SET part, excluding base columns like project_id, url
            update_assignments = []
            for key in valid_data.keys(): # Only update columns with actual data
                update_assignments.append(sql.SQL("{col} = EXCLUDED.{col}").format(col=sql.Identifier(key)))
            update_set_sql = sql.SQL(", ").join(update_assignments)

            # Construct the final UPSERT query using sql.SQL.format
            # Ensure the constraint name is correct
            upsert_query = sql.SQL("""
                INSERT INTO crawl_result ({columns})
                VALUES ({placeholders})
                ON CONFLICT (project_id, url) DO UPDATE SET {update_set}
            """).format(
                columns=columns_sql,
                placeholders=values_placeholders_sql,
                update_set=update_set_sql
            )
            
            # Execute upsert
            cursor.execute(upsert_query, all_values)
            
            # --- Handle Notifications --- 
            # Removed the delete statement to prevent overwriting notifications 
            # from previous visits to the same URL within a single session.
            # This might result in duplicate notifications appearing if a URL is processed multiple times.
            # cursor.execute(
            #     "DELETE FROM project_notifications WHERE project_id = %s AND url = %s",
            #     (project_id, normalized_url)
            # )
            for notification in crawled_page.projectNotifications:
                # Add ON CONFLICT DO NOTHING to gracefully handle duplicate notifications
                # Assumes project_notifications_unique_key is on (project_id, url, category, message)
                # If the constraint is different, adjust the ON CONFLICT target columns
                cursor.execute(
                    """
                    INSERT INTO project_notifications 
                    (project_id, url, category, message, timestamp)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (project_id, url, category, message) DO NOTHING
                    """,
                    (project_id, normalized_url, notification.category, notification.message, timestamp)
                )
            
            self.conn.commit()
            self._saved_urls_this_session.add(session_key)
            
        except psycopg2.Error as e: # Catch specific psycopg2 errors
            logger.error(f"Database error saving crawl result for {normalized_url}: {e}")
            if self.conn:
                self.conn.rollback()
        except Exception as e:
            logger.error(f"Unexpected error saving crawl result for {normalized_url}: {e}")
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
        crawler = None # Initialize crawler to None
        try:
            # Initialize webcrawler with improved functionality
            crawler = Webcrawler(job['url'], self.max_depth, self.max_title_length)
            
            # Set up a callback to save pages as they're crawled
            def save_page_callback(page: crawledPage):
                # Pass the entire crawledPage object
                self.save_crawl_result(job['project_id'], page)
            
            # Pass the callback to the crawler
            crawler.set_callback(save_page_callback)
            
            # Start crawling - this will now save pages as it goes
            crawler.crawl() # This blocks until crawl finishes
            
            # Update last_crawl timestamp in projects table after successful crawl
            self.update_project_last_crawl(job['project_id'])
            
            # Remove job from queue *after* successful processing and timestamp update
            self.remove_from_queue(job['queue_id'])
            
            logger.info(f"Completed crawl job for project {job['project_id']}")
            
        except Exception as e:
            logger.error(f"Error processing crawl job {job.get('queue_id', '?')} for project {job.get('project_id', '?')}: {e}", exc_info=True) # Log traceback
            # Optionally, update crawl status to 'error' in the database here
            # Don't remove from queue on error to allow potential retry or inspection
        finally:
             # Ensure crawler resources are released even if errors occur
            if crawler is not None: # Check if crawler was initialized
                try:
                    crawler.close()
                except Exception as close_err:
                    logger.error(f"Error closing crawler resources: {close_err}")
                    
    def update_project_last_crawl(self, project_id):
        """Update the last_crawl timestamp for the project"""
        try:
            self.connect_db()
            cursor = self.conn.cursor()
            timestamp = datetime.now()
            cursor.execute(
                "UPDATE projects SET last_crawl = %s WHERE id = %s",
                (timestamp, project_id)
            )
            self.conn.commit()
            logger.info(f"Updated last_crawl time for project {project_id}")
        except Exception as e:
            logger.error(f"Error updating last_crawl time for project {project_id}: {e}")
            if self.conn:
                self.conn.rollback()

    def run(self):
        """Main service loop"""
        logger.info("Starting crawler service")
        
        while True:
            job = None # Ensure job is defined
            try:
                # Get next job
                job = self.get_next_crawl_job()
                
                if job:
                    logger.info(f"Found job {job['queue_id']} for project {job['project_id']}")
                    self.process_crawl_job(job)
                else:
                    # logger.info("No jobs in queue, waiting...") # Reduce noise
                    pass # No job, just wait
                
                # Wait before checking again
                time.sleep(5)
                
            except psycopg2.OperationalError as db_err:
                 logger.error(f"Database operational error in main loop: {db_err}. Attempting reconnect...")
                 self.close() # Close existing broken connection
                 time.sleep(10) # Wait before trying to reconnect
                 try:
                      self.connect_db()
                 except Exception as reconn_err:
                      logger.error(f"Failed to reconnect to database: {reconn_err}. Retrying later.")
                      time.sleep(30) # Wait longer if reconnect fails
            except Exception as e:
                job_id = job['queue_id'] if job else 'N/A'
                proj_id = job['project_id'] if job else 'N/A'
                logger.error(f"Error in main loop (Job: {job_id}, Project: {proj_id}): {e}", exc_info=True) # Log traceback
                time.sleep(10) # Wait a bit longer after a general error

    def close(self):
        """Close database connection"""
        self._saved_urls_this_session.clear() # Clear cache on close
        if self.conn and not self.conn.closed:
            try:
                 self.conn.close()
                 logger.info("Closed database connection")
            except Exception as e:
                 logger.error(f"Error closing database connection: {e}")
        self.conn = None # Ensure conn is reset

if __name__ == "__main__":
    service = None # Ensure service is defined
    try:
        # Configure max depth and max title length - these could also be loaded from environment variables
        service = CrawlerService(max_depth=2, max_title_length=60) 
        service.run()
    except KeyboardInterrupt:
        logger.info("Service stopping due to user interrupt...")
    except Exception as e:
        logger.error(f"Critical service error: {e}", exc_info=True)
    finally:
        if service:
            logger.info("Closing service resources...")
            service.close()
        logger.info("Service shut down.") 