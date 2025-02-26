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
        self.maxCrawlDepth = maxCrawlDepth
        self.driver = webdriver.Chrome(options=chrome_options)
        self.linksVisited = set()
        self.rawPages = []  # Changed to list to maintain order
        self.callback = None  # Add callback attribute

    def set_callback(self, callback):
        """Set a callback function to be called after each page is crawled"""
        self.callback = callback

    def scanPageForExternalResources(self, current_url):
        chromelog = self.driver.get_log('performance')
        projectNotifications = []
        for request in chromelog:
            parsedMessage = json.loads(request["message"])["message"]
            if (parsedMessage["method"] == "Network.requestWillBeSent"):
                url = parsedMessage["params"]["request"]["url"]
                if((self.url not in url) and (url.startswith("data:image") == False)):
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
                # Check if it's an internal link and not already visited
                if self.url in link and link not in self.linksVisited:
                    internal_links.append(link)
        return internal_links

    def close(self):
        self.driver.quit()

    def __del__(self):
        self.close()
    
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
                if url not in self.linksVisited:
                    current_level_urls.append(url)
                    self.linksVisited.add(url)
            
            # Process all URLs at the current depth
            for url in current_level_urls:
                try:
                    print(f"Crawling {url} at depth {current_depth}/{self.maxCrawlDepth}")
                    self.driver.get(url)
                    
                    # Scan and save the page immediately
                    page = self.scanPageForExternalResources(url)
                    self.rawPages.append(page)
                    
                    # Call the callback if it exists
                    if self.callback:
                        self.callback(page)
                    
                    # Only collect new links if we haven't reached max depth
                    if current_depth < self.maxCrawlDepth:
                        # Get internal links and add them to the next depth level
                        internal_links = self.getInternalLinks()
                        for link in internal_links:
                            if link not in self.linksVisited and not any(link == u for u, _ in to_visit):
                                to_visit.append((link, current_depth + 1))
                
                except Exception as e:
                    print(f"Error crawling {url}: {e}")
            
            # Move to the next depth level
            if to_visit:
                current_depth = to_visit[0][1]
            else:
                break
                
        print(f"Finished crawling {self.url}. Visited {len(self.linksVisited)} pages.")