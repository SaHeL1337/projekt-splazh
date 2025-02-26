# Projekt Splazh

A modern web application with a sleek dashboard interface, built with React and Ant Design.
See here: https://projekt-splazh.vercel.app

## Overview

Projekt Splazh is a web application that provides a clean and intuitive user interface for managing projects, reports, and user data. The application features a responsive layout with a collapsible sidebar menu for navigation.

## Features

- **Responsive Layout**: Adapts to different screen sizes with collapsible sidebar
- **Navigation System**: Easy navigation between different sections of the application
- **Dashboard**: Central hub for monitoring key information
- **Reports Section**: For viewing and managing reports
- **Projects Section**: For tracking and managing projects

## Technology Stack

- **Frontend Framework**: React
- **UI Components**: Ant Design
- **Routing**: React Router
- **Backend**: Go functions

## Getting Started

### Prerequisites

- Node.js (version 14.x or higher recommended)
- npm or yarn package manager

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/your-username/projekt-splazh.git
   cd projekt-splazh
   ```

2. Install dependencies:
   ```
   npm install
   # or
   yarn install
   ```

3. Start the development server:
   ```
   npm run dev
   # or
   yarn dev
   ```

4. Open your browser and navigate to `http://localhost:5173`
5. Run the go dev server:
```
go run main.go
```

6. Run the crawler:
```
cd crawler
python -m venv env
source env/bin/activate
pip install -r requirements.txt
python Webcrawler.py
```



## Project Structure

```
projekt-splazh/
├── api/                  # Go Backend
├── app/
│   ├── components/
│   │   └── Menu.tsx      # Sidebar navigation component
│   └── ...               # Other app components
├── public/               # Static assets
└── ...                   # Configuration files
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

