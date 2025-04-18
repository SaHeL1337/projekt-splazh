from socket import CAN_RAW
from selenium import webdriver 
from selenium.webdriver.common.by import By
from selenium.webdriver.support.relative_locator import locate_with
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
import json
import queue
import logging
import time
from collections import deque
from urllib.parse import urlparse
import re
import os

class ProjectNotification:
    def __init__(self, category, message):
        self.category = category
        self.message = message

class crawledPage:
    def __init__(self, url, html, projectNotifications):
        self.url = url
        self.html = html
        self.projectNotifications = projectNotifications


class Webcrawler:
    def __init__(self, url, maxCrawlDepth=1, maxTitleLength=60):
        chrome_options = Options()
        chrome_options.add_argument('--disable-infobars')
        chrome_options.add_argument('--disable-gpu')
        chrome_options.add_argument('--disable-logging')
        chrome_options.add_argument('--disable-extensions')
        chrome_options.add_argument('--disable-notifications')
        chrome_options.add_argument('--disable-default-apps')
        chrome_options.add_argument('--window-size=1920,1080')
        chrome_options.add_argument('--headless=new')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_experimental_option('excludeSwitches', ['enable-automation'])
        chrome_options.add_experimental_option('useAutomationExtension', False)
        
        chromedriver_path = os.getenv("CHROMEDRIVER_PATH", "/usr/bin/chromedriver") 
        service = Service(executable_path=chromedriver_path)

        logging_prefs = {
            'performance': 'INFO', 
            'browser': 'INFO'
        }
        chrome_options.set_capability('goog:loggingPrefs', logging_prefs)

        self.url = url
        self.base_domain = self.get_base_domain(url)
        self.maxCrawlDepth = maxCrawlDepth
        self.maxTitleLength = maxTitleLength
        
        try:
            self.driver = webdriver.Chrome(service=service, options=chrome_options)
            logging.info("WebDriver initialized successfully.")
        except Exception as e:
            logging.error(f"Failed to initialize WebDriver: {e}", exc_info=True)
            try:
                browser_logs = service.get_log('browser') if service else []
                if browser_logs:
                    logging.error("Browser logs during startup failure:")
                    for entry in browser_logs:
                        logging.error(entry)
            except Exception as log_e:
                logging.error(f"Could not retrieve browser logs: {log_e}")
            raise
            
        self.linksVisited = set()
        self.rawPages = []
        self.callback = None
        
        self.ignored_extensions = [
            '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
            '.zip', '.rar', '.tar', '.gz', '.7z', '.exe', '.msi', '.apk',
            '.mp3', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.jpg', '.jpeg',
            '.png', '.gif', '.bmp', '.svg', '.ico', '.css', '.js'
        ]

    def get_base_domain(self, url):
        """Extract the base domain from a URL"""
        parsed = urlparse(url)
        return parsed.netloc

    def is_same_domain(self, url1, url2):
        """Check if two URLs belong to the same domain"""
        domain1 = self.get_base_domain(url1)
        domain2 = self.get_base_domain(url2)
        return domain1 == domain2
    
    def is_valid_url(self, url):
        """Check if URL is a valid website (not a file or other resource to ignore)"""
        # Check for ignored file extensions
        parsed_url = urlparse(url)
        path = parsed_url.path.lower()
        
        # Check if the URL ends with any ignored extension
        for ext in self.ignored_extensions:
            if path.endswith(ext):
                return False
        
        # Check for common non-website protocols
        if parsed_url.scheme not in ['http', 'https', '']:
            return False
            
        return True

    def set_callback(self, callback):
        """Set a callback function to be called after each page is crawled"""
        self.callback = callback

    def navigate_to_url(self, url):
        """Navigate to a URL and handle redirects with improved detection"""
        # First check if this is a valid URL to crawl
        if not self.is_valid_url(url):
            return {
                "redirected": False,
                "continue": False,
                "reason": "invalid_url_type"
            }
            
        self.driver.get(url)
        current_url = self.driver.current_url
        
        # Normalize URLs for comparison
        normalized_original = self.normalize_url(url)
        normalized_current = self.normalize_url(current_url)
        
        # Check if there was a significant redirect (not just normalization)
        if normalized_current != normalized_original:
            # Check if the redirect is to the same domain
            if self.is_same_domain(url, current_url):
                return {
                    "redirected": True,
                    "internal": True,
                    "target": current_url,
                    "continue": True
                }
            else:
                return {
                    "redirected": True,
                    "internal": False,
                    "target": current_url,
                    "continue": False
                }
        
        # No significant redirect
        return {
            "redirected": False,
            "continue": True
        }

    def normalize_url(self, url):
        """Normalize URL to reduce false positives in redirect detection and ensure consistent trailing slashes"""
        parsed = urlparse(url)
        
        # Convert to lowercase
        netloc = parsed.netloc.lower()
        
        # Remove default ports
        if netloc.endswith(':80') and parsed.scheme == 'http':
            netloc = netloc[:-3]
        elif netloc.endswith(':443') and parsed.scheme == 'https':
            netloc = netloc[:-4]
        
        # Normalize path (ensure trailing slash for all paths except the root path)
        path = parsed.path
        if path == '':
            path = '/'
        elif path != '/' and not path.endswith('/'):
            path = path + '/'
        
        # Reconstruct the normalized URL without query parameters or fragments
        normalized = f"{parsed.scheme}://{netloc}{path}"
        return normalized

    def scanPageForExternalResources(self, current_url):
        chromelog = self.driver.get_log('performance')
        projectNotifications = []
        for request in chromelog:
            parsedMessage = json.loads(request["message"])["message"]
            if (parsedMessage["method"] == "Network.requestWillBeSent"):
                url = parsedMessage["params"]["request"]["url"]
                if(not self.is_same_domain(current_url, url) and not url.startswith("data:image") 
                        and not url.startswith("blob:") and not url.startswith("data:text")):
                    #todo: add check if the url has www or http or https or other variants of the url   
                    projectNotifications.append(ProjectNotification("external_resource", url))
        
        # Create and return a crawledPage object
        return crawledPage(current_url, self.driver.page_source, projectNotifications)
    
    def getInternalLinks(self):
        internal_links = []
        hrefs = self.driver.find_elements(By.XPATH, "//a[@href]")
        for href in hrefs:
            link = href.get_attribute("href")
            if link:
                # Remove fragment identifier
                link = link.split("#")[0]
                # remove anything trailing ?
                link = link.split("?")[0]
                # Check if it's an internal link, valid URL type, and not already visited
                if (self.is_same_domain(self.url, link) and 
                    self.is_valid_url(link) and 
                    self.normalize_url(link) not in self.linksVisited):
                    internal_links.append(link)
        return internal_links

    def close(self):
        if hasattr(self, 'driver'):
            self.driver.quit()

    def __del__(self):
        try:
            self.close()
        except Exception as e:
            print(f"Error during cleanup: {e}")
    
    def scanForMissingAltText(self):
        """Check for images without alt text and create notifications for each instance"""
        projectNotifications = []
        images = self.driver.find_elements(By.TAG_NAME, "img")
        missing_alt_count = 0
        
        for i, img in enumerate(images):
            src = img.get_attribute("src") or "unknown source"
            alt = img.get_attribute("alt")
            
            if alt is None or alt.strip() == "":
                missing_alt_count += 1
                # Create a descriptive message that helps identify the image
                message = f"Image missing alt text: {src}"
                projectNotifications.append(ProjectNotification("accessibility", message))
        
        # If there are multiple missing alt texts, add a summary notification
        if missing_alt_count > 0:
            summary = f"Found {missing_alt_count} image(s) missing alt text on this page"
            projectNotifications.append(ProjectNotification("accessibility", summary))
            
        return projectNotifications

    def scanForTitleIssues(self):
        """Check for issues with the page title, such as length exceeding maximum"""
        projectNotifications = []
        
        try:
            title_element = self.driver.find_element(By.TAG_NAME, "title")
            title_text = title_element.get_attribute("textContent")
            
            if title_text:
                title_length = len(title_text)
                
                # Check if title exceeds maximum length
                if title_length > self.maxTitleLength:
                    message = f"Title length ({title_length} characters) exceeds recommended maximum of {self.maxTitleLength} characters: '{title_text}'"
                    projectNotifications.append(ProjectNotification("seo", message))
            else:
                # Missing title
                projectNotifications.append(ProjectNotification("seo", "Page is missing a title tag"))
                
        except Exception as e:
            # If there's an error finding the title, it might be missing
            projectNotifications.append(ProjectNotification("seo", "Error checking title tag"))
            print(f"Error checking title: {e}")
            
        return projectNotifications

    def crawl(self):
        # Start with the initial URL at depth 0
        current_depth = 0
        
        # Use a deque to process URLs level by level
        to_visit = deque([(self.url, current_depth)])
        
        # Process URLs by depth level
        while to_visit and current_depth <= self.maxCrawlDepth:
            # Get all URLs at the current depth
            current_level_urls = []
            while to_visit and to_visit[0][1] == current_depth:
                url, depth = to_visit.popleft()
                
                # Normalize the URL
                normalized_url = self.normalize_url(url)

                if normalized_url not in self.linksVisited:
                    current_level_urls.append(url)
                    self.linksVisited.add(normalized_url)
            
            # Process all URLs at the current depth
            for url in current_level_urls:
                try:
                    print(f"Crawling {url} at depth {current_depth}/{self.maxCrawlDepth}")
                    
                    # --- Attempt to clear performance log buffer before navigation ---
                    try:
                        # Calling get_log might clear the buffer for the next call
                        self.driver.get_log('performance') 
                    except Exception: 
                        # Ignore errors (e.g., log buffer not supported/empty)
                        pass 
                    # ------------------------------------------------------------------

                    # Navigate to URL and handle redirects
                    redirect_info = self.navigate_to_url(url)
                    
                    # If we should skip this page (external redirect or invalid URL type), continue to next URL
                    if not redirect_info["continue"]:
                        continue
                    
                    # Get the current URL (might be different if there was a redirect)
                    current_url = self.driver.current_url
                    
                    # Create notifications list
                    projectNotifications = []
                    
                    # Add redirect notification if needed
                    if redirect_info.get("redirected", False) and redirect_info.get("internal", False):
                        redirect_message = f"Page redirects to {redirect_info['target']}"
                        projectNotifications.append(ProjectNotification("redirect", redirect_message))
                    
                    # Scan for external resources
                    page = self.scanPageForExternalResources(current_url)
                    
                    # Scan for missing alt text on images and add accessibility notifications
                    missing_alt_notifications = self.scanForMissingAltText()
                    page.projectNotifications.extend(missing_alt_notifications)
                    
                    # Scan for title issues and add SEO notifications
                    title_notifications = self.scanForTitleIssues()
                    page.projectNotifications.extend(title_notifications)
                    
                    # Add any redirect notifications
                    page.projectNotifications.extend(projectNotifications)
                    
                    # Save the page
                    self.rawPages.append(page)
                    
                    # Call the callback if it exists
                    if self.callback:
                        self.callback(page)
                    
                    # Only collect new links if we haven't reached max depth
                    if current_depth < self.maxCrawlDepth:
                        # Get internal links and add them to the next depth level
                        internal_links = self.getInternalLinks()
                        for link in internal_links:
                            normalized_link = self.normalize_url(link)
                            if normalized_link not in self.linksVisited and not any(normalized_link == self.normalize_url(u) for u, _ in to_visit):
                                to_visit.append((link, current_depth + 1))
                
                except Exception as e:
                    print(f"Error crawling {url}: {e}")
            
            # Move to the next depth level
            if to_visit:
                current_depth = to_visit[0][1]
            else:
                break
                
        print(f"Finished crawling {self.url}. Visited {len(self.linksVisited)} pages.")