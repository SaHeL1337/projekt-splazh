# New Webcrawler Features

This document describes the new features added to the webcrawler. Each feature scans the current page for specific issues and creates notifications with specific types that are displayed in the dashboard.

## Added Features

### 1. URL Response Codes (4xx/5xx)
- **Detection**: Monitors HTTP response codes for all resources loaded on the page
- **Notification Types**: 
  - `error_4xx`: Client errors (400-499)
  - `error_5xx`: Server errors (500-599)
- **Severity**: Critical
- **Actionable**: Yes

### 2. Broken Links
- **Detection**: Checks all links on the page to see if they resolve properly
- **Notification Type**: `broken_link`
- **Severity**: Warning
- **Actionable**: Yes

### 3. Large Image Files
- **Detection**: Identifies image files larger than 500KB
- **Notification Type**: `large_image`
- **Severity**: Warning
- **Actionable**: Yes

### 4. Noindex/Nofollow Directives
- **Detection**: Checks meta tags and HTTP headers for robots directives
- **Notification Types**:
  - `noindex`: When a page has a noindex directive
  - `nofollow`: When a page has a nofollow directive
- **Severity**: Warning
- **Actionable**: Yes

### 5. H1 Tag Issues
- **Detection**: Checks for absence of H1 tags or multiple H1 tags
- **Notification Types**:
  - `h1_missing`: No H1 tag found on the page
  - `multiple_h1`: More than one H1 tag found on the page
- **Severity**: Warning
- **Actionable**: Yes

### 6. HTTP (not HTTPS)
- **Detection**: Identifies pages using HTTP instead of HTTPS
- **Notification Type**: `no_https`
- **Severity**: Critical
- **Actionable**: Yes

## Implementation Details

### Backend Changes
- Added new scanner functions to `Webcrawler.py`
- Added handling for new notification types
- Added the `requests` library to requirements.txt for broken link checking

### Frontend Changes
- Updated `ProjectNotifications.tsx` to include new notification types with appropriate:
  - Colors
  - Icons
  - Descriptions
  - Severity levels
  - Actionable flags
  - Suggested actions
- Updated `Dashboard.tsx` to include color mappings for new notification types

## Usage
No changes are required to use these new features. They are automatically run during crawling, and notifications will appear in the dashboard interface when issues are detected. 