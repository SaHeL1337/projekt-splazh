from socket import CAN_RAW
from selenium import webdriver 
from selenium.webdriver.common.by import By
from selenium.webdriver.support.relative_locator import locate_with
from selenium.webdriver.chrome.options import Options
import json
import queue
import logging
import time
from collections import deque
from urllib.parse import urlparse

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
    def __init__(self, url, maxCrawlDepth=1):
        chrome_options = Options()
        chrome_options.add_argument('--disable-infobars')
        chrome_options.add_argument('--disable-gpu')
        chrome_options.add_argument('--disable-logging')
        chrome_options.add_argument('--disable-extensions')
        chrome_options.add_argument('--disable-notifications')
        chrome_options.add_argument('--disable-default-apps')
        chrome_options.add_argument('--window-size=1920,1080')
        chrome_options.add_argument('--headless')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_experimental_option('excludeSwitches', ['enable-automation'])
        chrome_options.add_experimental_option('useAutomationExtension', False)
        cloud_options = {}
        cloud_options['browser'] = "ALL"
        cloud_options['performance'] = "INFO"
        chrome_options.set_capability('goog:loggingPrefs', cloud_options)

        self.url = url
        self.base_domain = self.get_base_domain(url)
        self.maxCrawlDepth = maxCrawlDepth
        self.driver = webdriver.Chrome(options=chrome_options)
        self.linksVisited = set()
        self.rawPages = []  # Changed to list to maintain order
        self.callback = None  # Add callback attribute

    def get_base_domain(self, url):
        """Extract the base domain from a URL"""
        parsed = urlparse(url)
        return parsed.netloc

    def is_same_domain(self, url1, url2):
        """Check if two URLs belong to the same domain"""
        domain1 = self.get_base_domain(url1)
        domain2 = self.get_base_domain(url2)
        return domain1 == domain2

    def set_callback(self, callback):
        """Set a callback function to be called after each page is crawled"""
        self.callback = callback

    def navigate_to_url(self, url):
        """Navigate to a URL and handle redirects with improved detection"""
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
        """Normalize URL to reduce false positives in redirect detection"""
        parsed = urlparse(url)
        
        # Convert to lowercase
        netloc = parsed.netloc.lower()
        
        # Remove default ports
        if netloc.endswith(':80') and parsed.scheme == 'http':
            netloc = netloc[:-3]
        elif netloc.endswith(':443') and parsed.scheme == 'https':
            netloc = netloc[:-4]
        
        # Normalize path (remove trailing slash for root path)
        path = parsed.path
        if path == '/':
            print(f"Normalizing {url} to {parsed.scheme}://{netloc}")
            path = ''
        
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
                # Check if it's an internal link and not already visited
                if self.is_same_domain(self.url, link) and self.normalize_url(link) not in self.linksVisited:
                    print(f"Adding {self.normalize_url(link)} to internal links")
                    internal_links.append(self.normalize_url(link))
        return internal_links

    def close(self):
        self.driver.quit()

    def __del__(self):
        self.close()
    
    def crawl(self):
        # Start with the initial URL at depth 0
        current_depth = 0
        
        # Use a deque to process URLs level by level
        to_visit = deque([(self.normalize_url(self.url), current_depth)])
        
        # Process URLs by depth level
        while to_visit and current_depth <= self.maxCrawlDepth:
            # Get all URLs at the current depth
            current_level_urls = []
            while to_visit and to_visit[0][1] == current_depth:
                url, depth = to_visit.popleft()

                if self.normalize_url(url) not in self.linksVisited:
                    current_level_urls.append(url)
                    self.linksVisited.add(self.normalize_url(url))
            
            # Process all URLs at the current depth
            for url in current_level_urls:
                try:
                    print(f"Crawling {url} at depth {current_depth}/{self.maxCrawlDepth}")
                    
                    # Navigate to URL and handle redirects
                    redirect_info = self.navigate_to_url(url)
                    
                    # If we should skip this page (external redirect), continue to next URL
                    if not redirect_info["continue"]:
                        print(f"Skipping {url} - redirects to external domain: {redirect_info['target']}")
                        continue
                    
                    # Get the current URL (might be different if there was a redirect)
                    current_url = self.driver.current_url
                    
                    # Create notifications list
                    projectNotifications = []
                    
                    # Add redirect notification if needed
                    if redirect_info["redirected"] and redirect_info["internal"]:
                        redirect_message = f"Page redirects to {redirect_info['target']}"
                        projectNotifications.append(ProjectNotification("redirect", redirect_message))
                    
                    # Scan for external resources
                    page = self.scanPageForExternalResources(current_url)
                    
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
                            if self.normalize_url(link) not in self.linksVisited and not any(self.normalize_url(link) == u for u, _ in to_visit):
                                to_visit.append((self.normalize_url(link), current_depth + 1))
                
                except Exception as e:
                    print(f"Error crawling {url}: {e}")
            
            # Move to the next depth level
            if to_visit:
                current_depth = to_visit[0][1]
            else:
                break
                
        print(f"Finished crawling {self.url}. Visited {len(self.linksVisited)} pages.")