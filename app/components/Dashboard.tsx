import React, { useState, useEffect, useMemo } from 'react';
import { Card, Row, Col, Statistic, Descriptions, Divider, Button, message, Space, Typography, Tag, Spin, Alert, Input, Empty, notification, Progress, Badge, List, Tooltip, Table } from 'antd';
import { FetchWithAuth } from '../services/api';
import { useAuth } from '@clerk/clerk-react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    CheckCircleOutlined,
    SyncOutlined,
    CloseCircleOutlined,
    ClockCircleOutlined,
    WarningOutlined,
    InfoCircleOutlined,
    LinkOutlined,
    CalendarOutlined,
    FileTextOutlined,
    SearchOutlined,
    ReloadOutlined,
    ArrowLeftOutlined,
    HeartOutlined,
    CheckCircleFilled,
    ExclamationCircleFilled,
    InfoCircleFilled,
    ExclamationCircleOutlined,
    ThunderboltOutlined,
    RocketOutlined
} from '@ant-design/icons';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

// Add custom styles for the circular progress bar
const progressBarStyle = `
  .center-progress-text .CircularProgressbar-text {
    dominant-baseline: middle;
    text-anchor: middle;
    transform: translateY(2px);
  }
`;

const { Title, Paragraph, Text } = Typography;

interface Project {
  id: number;
  userId: string;
  url: string;
  lastcrawl?: string;
}

interface CrawlStatus {
  status: string | null;
  pagesCrawled: number | null;
}

interface Notification {
  id: number;
  projectId: number;
  url: string;
  category: string;
  message: string;
  timestamp: string;
}

interface NotificationCategory {
  category: string;
  count: number;
  color: string;
}

// Interface for the pie chart datum type
interface PieChartDatum {
  category: string;
  count: number;
  color: string;
  [key: string]: any; // For any other properties that might be added by the chart
}

interface HealthMetrics {
  score: number;
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  criticalIssues: number;
  warningIssues: number;
  infoIssues: number;
  color: string;
}

// New interfaces for load time metrics
interface PageLoadTime {
  url: string;
  ttfb: number; // milliseconds
  renderTime: number; // milliseconds
  timestamp: string;
}

interface LoadTimeMetricsProps {
  loadTimes: PageLoadTime[];
  loading: boolean;
}

interface LoadTimePerformance {
  category: string;
  count: number;
  color: string;
}

const getStatusTag = (status: string | null | undefined) => {
  status = status?.toLowerCase() || 'unknown';
  switch (status) {
    case 'completed':
      return <Tag icon={<CheckCircleOutlined />} color="success">Completed</Tag>;
    case 'crawling':
    case 'in progress':
      return <Tag icon={<SyncOutlined spin />} color="processing">Crawling</Tag>;
    case 'queued':
      return <Tag icon={<ClockCircleOutlined />} color="blue">Queued</Tag>;
    case 'error':
      return <Tag icon={<CloseCircleOutlined />} color="error">Error</Tag>;
    case 'idle':
    case 'never':
    case 'not crawled':
    case 'not_started':
    case 'unknown':
      return <Tag icon={<ClockCircleOutlined />} color="default">Not Crawled</Tag>;
    default:
      return <Tag color="default">{status}</Tag>;
  }
};

const getCategoryColor = (category: string): string => {
  switch (category.toLowerCase()) {
    case 'redirect': return '#1890ff'; // blue
    case 'external_resource': return '#722ed1'; // purple
    case 'crawl_error': return '#f5222d'; // red
    case 'accessibility': return '#13c2c2'; // cyan
    case 'seo': return '#52c41a'; // green
    case 'error_4xx': return '#f5222d'; // red
    case 'error_5xx': return '#f5222d'; // red
    case 'broken_link': return '#f5222d'; // red
    case 'large_image': return '#fa8c16'; // orange
    case 'noindex': return '#faad14'; // gold
    case 'nofollow': return '#faad14'; // gold
    case 'h1_missing': return '#fa8c16'; // orange
    case 'multiple_h1': return '#fa8c16'; // orange
    case 'no_https': return '#f5222d'; // red
    default: return '#d9d9d9'; // grey
  }
};

interface DashboardData {
  id: number;
  URL: string;
  last_crawl: string;
  status: string;
  notifications: Notification[];
  crawl_in_progress: boolean;
  pages_crawled: number;
}

interface NotificationCount {
  type: string;
  count: number;
  color: string;
}

const calculateHealthScore = (notifications: Notification[], pagesCrawled: number): HealthMetrics => {
  // If no pages were crawled or there are no notifications, return a "no data" state
  if (pagesCrawled === 0 || !notifications || notifications.length === 0) {
    return {
      score: 0,
      status: 'excellent',
      criticalIssues: 0,
      warningIssues: 0,
      infoIssues: 0,
      color: '#52c41a' // green
    };
  }

  // Group notifications by URL to prevent the same issue on the same page from being counted multiple times
  const uniqueIssues = new Map<string, Set<string>>();
  
  notifications.forEach(notification => {
    // Create a unique key for each issue type on each URL
    const key = `${notification.url}-${notification.category}`;
    
    if (!uniqueIssues.has(key)) {
      uniqueIssues.set(key, new Set());
    }
    
    // Add the specific message to the set for this URL-category pair
    uniqueIssues.get(key)?.add(notification.message);
  });
  
  // Count issues by severity
  let criticalCount = 0;
  let warningCount = 0;
  let infoCount = 0;

  // Count unique issues by severity
  uniqueIssues.forEach((messages, key) => {
    const category = key.split('-')[1]; // Extract category from the key
    const severity = getCategorySeverity(category);
    
    // Only count each unique issue once per URL-category pair
    if (severity === 'critical') criticalCount += Math.min(messages.size, 1);
    else if (severity === 'warning') warningCount += Math.min(messages.size, 1);
    else if (severity === 'info') infoCount += Math.min(messages.size, 1);
  });

  // Apply caps to each issue type to prevent excessive penalties
  const maxCriticalIssues = 3; // Cap critical issues at 3
  const maxWarningIssues = 5;  // Cap warning issues at 5
  const maxInfoIssues = 10;    // Cap info issues at 10
  
  const countedCriticalIssues = Math.min(criticalCount, maxCriticalIssues);
  const countedWarningIssues = Math.min(warningCount, maxWarningIssues);
  const countedInfoIssues = Math.min(infoCount, maxInfoIssues);
  
  // Calculate a weighted score (100 points max) with reduced deductions
  const criticalDeduction = countedCriticalIssues * 10; // Reduced from 15 to 10 points per critical issue
  const warningDeduction = countedWarningIssues * 3;    // Reduced from 5 to 3 points per warning
  const infoDeduction = countedInfoIssues * 0.5;        // Reduced from 1 to 0.5 point per info item

  // Calculate the final score
  let score = 100 - (criticalDeduction + warningDeduction + infoDeduction);
  
  // Ensure score is between 0 and 100
  score = Math.max(0, Math.min(100, score));
  
  // Determine status based on score
  let status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  let color: string;
  
  if (score >= 90) {
    status = 'excellent';
    color = '#52c41a'; // green
  } else if (score >= 75) {
    status = 'good';
    color = '#1890ff'; // blue
  } else if (score >= 50) {
    status = 'fair';
    color = '#faad14'; // gold
  } else if (score >= 25) {
    status = 'poor';
    color = '#fa8c16'; // orange
  } else {
    status = 'critical';
    color = '#f5222d'; // red
  }
  
  return {
    score,
    status,
    criticalIssues: criticalCount,
    warningIssues: warningCount,
    infoIssues: infoCount,
    color
  };
};

const getCategorySeverity = (category: string): 'critical' | 'warning' | 'info' | 'success' => {
  // Map categories to severities based on the categoryMetadata in ProjectNotifications
  const severityMap: Record<string, 'critical' | 'warning' | 'info' | 'success'> = {
    'redirect': 'info',
    'external_resource': 'info',
    'crawl_error': 'critical',
    'accessibility': 'warning',
    'seo': 'warning',
    'title_length': 'warning',
    'performance': 'warning',
    'security': 'critical',
    'error_4xx': 'critical',
    'error_5xx': 'critical',
    'broken_link': 'warning',
    'large_image': 'warning',
    'noindex': 'warning',
    'nofollow': 'warning',
    'h1_missing': 'warning',
    'multiple_h1': 'warning',
    'no_https': 'critical'
  };
  
  return severityMap[category.toLowerCase()] || 'info';
};

const HealthDisplay = ({ health, pagesCrawled }: { health: HealthMetrics, pagesCrawled: number }) => {
  const { score, status, criticalIssues, warningIssues, infoIssues, color } = health;
  
  // When no pages have been crawled or score is 0, display "No Data"
  if (pagesCrawled === 0 || score === 0) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex flex-col items-center justify-center w-full">
            <div className="text-3xl font-bold text-gray-400">No Data</div>
            <p className="text-gray-500 mt-2">Waiting for crawl to complete</p>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-gray-400">0</div>
            <div className="text-gray-500">Critical</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-gray-400">0</div>
            <div className="text-gray-500">Warning</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-gray-400">0</div>
            <div className="text-gray-500">Info</div>
          </div>
        </div>
      </div>
    );
  }
  
  // Round the score to remove decimal places for cleaner display
  const roundedScore = Math.round(score);
  
  return (
    <div>
      <style>{progressBarStyle}</style>
      <div className="flex items-center mb-6">
        <div style={{ width: '140px', height: '140px' }}>
          <CircularProgressbar
            value={score}
            text={`${roundedScore}`}
            styles={buildStyles({
              textSize: '28px',
              pathColor: color,
              textColor: color,
              trailColor: '#f5f5f5',
            })}
            className="center-progress-text"
          />
        </div>
        <div className="ml-8">
          <h3 className="text-3xl font-bold capitalize" style={{ color }}>
            {status}
          </h3>
          <p className="text-gray-500">Overall health score</p>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-red-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-red-500">{criticalIssues}</div>
          <div className="text-gray-500">Critical</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-yellow-500">{warningIssues}</div>
          <div className="text-gray-500">Warning</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-500">{infoIssues}</div>
          <div className="text-gray-500">Info</div>
        </div>
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const { getToken } = useAuth();
  const { id } = useParams<{ id?: string }>();
  const [loading, setLoading] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [crawlStatus, setCrawlStatus] = useState<CrawlStatus>({
    status: null,
    pagesCrawled: null
  });
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationCategories, setNotificationCategories] = useState<NotificationCategory[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [healthMetrics, setHealthMetrics] = useState<HealthMetrics>({
    score: 100,
    status: 'excellent',
    criticalIssues: 0,
    warningIssues: 0,
    infoIssues: 0,
    color: '#52c41a'
  });
  const navigate = useNavigate();

  // New state for load time metrics
  const [loadTimes, setLoadTimes] = useState<PageLoadTime[]>([]);
  const [loadingLoadTimes, setLoadingLoadTimes] = useState<boolean>(true);

  // Separate fetch function for status polling
  const pollCrawlStatus = async () => {
    if (!id) return;
    try {
      const token = await getToken();
      const response = await FetchWithAuth(`/api/crawl?projectId=${id}`, token, {
        method: "GET"
      });
      
      const previousStatus = crawlStatus.status;
      const newStatus = response.status || 'idle';
      
      // Only update state if there's a change to avoid unnecessary re-renders
      if (previousStatus !== newStatus || crawlStatus.pagesCrawled !== response.pagesCrawled) {
        setCrawlStatus({
          status: newStatus,
          pagesCrawled: response.pagesCrawled ?? 0
        });
        
        // Only refresh notifications when status changes from crawling/queued to completed
        if (
          (previousStatus === 'crawling' || previousStatus === 'in progress') && 
          newStatus === 'completed'
        ) {
          fetchNotifications(id);
        }
      }
    } catch (error) {
      console.error("Failed to poll crawl status:", error);
    }
  };

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    const loadInitialData = async () => {
        if (id) {
            setLoadingDetails(true);
            setProject(null);
            setCrawlStatus({ status: null, pagesCrawled: null });

            // Fetch project details and initial crawl status concurrently
            const results = await Promise.allSettled([
                fetchProjectDetails(id),
                fetchCrawlStatus(id),
                fetchNotifications(id)
            ]);

            setLoadingDetails(false);
            intervalId = setInterval(pollCrawlStatus, 1000);
        } else {
            setLoadingDetails(false);
            setProject(null);
            setCrawlStatus({ status: null, pagesCrawled: null });
        }
    };

    loadInitialData();

    return () => {
        if (intervalId) {
            clearInterval(intervalId);
        }
    };
  }, [id, getToken]); 

  useEffect(() => {
    if (notifications.length > 0) {
      // Aggregate notifications by category
      const categoryCounts: Record<string, number> = {};
      
      notifications.forEach(notification => {
        const category = notification.category;
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      });
      
      // Convert to array format for pie chart
      const categoryData: NotificationCategory[] = Object.entries(categoryCounts).map(([category, count]) => ({
        category: category.replace('_', ' '),
        count,
        color: getCategoryColor(category)
      }));
      
      setNotificationCategories(categoryData);
      
      // Calculate health metrics
      const health = calculateHealthScore(notifications, crawlStatus.pagesCrawled ?? 0);
      setHealthMetrics(health);
    } else {
      setNotificationCategories([]);
      setHealthMetrics({
        score: 0,
        status: 'excellent',
        criticalIssues: 0,
        warningIssues: 0,
        infoIssues: 0,
        color: '#52c41a'
      });
    }
  }, [notifications, crawlStatus.pagesCrawled]);

  const fetchProjectDetails = async (projectId: string) => {
    try {
      const token = await getToken();
      const response = await FetchWithAuth(`/api/project?projectId=${projectId}`, token, {
        method: "GET",
      });
      setProject(response);
    } catch (error) {
      console.error("Failed to get project details:", error);
      setProject(null);
    }
  };

  const fetchCrawlStatus = async (projectId: string) => {
    try {
      const token = await getToken();
      const response = await FetchWithAuth(`/api/crawl?projectId=${projectId}`, token, {
        method: "GET"
      });
      setCrawlStatus({
        status: response.status || 'idle',
        pagesCrawled: response.pagesCrawled ?? 0
      });
    } catch (error) {
      console.error("Failed to get crawl status:", error);
      setCrawlStatus({ status: 'error', pagesCrawled: 0 });
    }
  };

  const fetchNotifications = async (projectId: string): Promise<any> => {
    setLoadingNotifications(true);
    try {
      const token = await getToken();
      const data = await FetchWithAuth(`/api/notifications?projectId=${projectId}`, token, {});
      setNotifications(Array.isArray(data) ? data : []);
      return data;
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
      setNotifications([]);
      throw err;
    } finally {
      setLoadingNotifications(false);
    }
  };

  const queueCrawl = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const token = await getToken();
      await FetchWithAuth('/api/crawl', token, {
        method: "POST",
        body: JSON.stringify({ projectId: Number(id) }),
      });
      setCrawlStatus(prev => ({...prev, status: 'queued'}));
      
      // Clear notifications, categories, and load times when starting a new crawl
      setNotifications([]);
      setNotificationCategories([]);
      setLoadTimes([]);
      setHealthMetrics({
        score: 0,
        status: 'excellent',
        criticalIssues: 0,
        warningIssues: 0,
        infoIssues: 0,
        color: '#52c41a'
      });
      
      message.success('Crawl queued!');
      
      setTimeout(pollCrawlStatus, 1500);
    } catch (error) {
      console.error("Failed to queue crawl:", error);
      message.error('Failed to queue crawl.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate notification counts by type
  const getNotificationsByType = (): NotificationCount[] => {
    if (!dashboardData?.notifications || dashboardData.notifications.length === 0) {
      return [];
    }
    
    const counts: Record<string, number> = {};
    dashboardData.notifications.forEach(notification => {
      if (counts[notification.category]) {
        counts[notification.category]++;
      } else {
        counts[notification.category] = 1;
      }
    });

    // Define colors for each notification type
    const typeColors: Record<string, string> = {
      'redirect': '#1890ff', // blue
      'external_resource': '#722ed1', // purple
      'crawl_error': '#f5222d', // red
      'accessibility': '#13c2c2', // cyan
      'seo': '#52c41a', // green
      'error': '#ff4d4f',
      'warning': '#faad14',
      'info': '#1890ff',
      'success': '#52c41a'
    };

    return Object.keys(counts).map(type => ({
      type,
      count: counts[type],
      color: typeColors[type.toLowerCase()] || '#8c8c8c'
    }));
  };

  const notificationsByType = getNotificationsByType();
  
  // Calculate total notifications
  const totalNotifications = notificationsByType.reduce((sum, item) => sum + item.count, 0);

  // Helper function to check if a crawl is in progress
  const isCrawlInProgress = () => {
    const status = crawlStatus.status?.toLowerCase();
    return status === 'queued' || status === 'crawling' || status === 'in progress';
  };

  // Add to useEffect to load data
  useEffect(() => {
    // Fetch real load time data from API
    const fetchLoadTimes = async () => {
      setLoadingLoadTimes(true);
      try {
        if (!id) {
          setLoadingLoadTimes(false);
          return;
        }
        
        const token = await getToken();
        const data = await FetchWithAuth(`/api/crawl/results?projectId=${id}`, token, {
          method: "GET"
        });
        
        if (!data || !Array.isArray(data)) {
          console.error("Invalid load time data format:", data);
          setLoadTimes([]);
          setLoadingLoadTimes(false);
          return;
        }
        
        // The API returns data in the format we need:
        // { url: string, ttfb: number, renderTime: number }
        // We'll add a timestamp property with the current date since it's not provided by the API
        const now = new Date().toISOString();
        const formattedData = data.map((item: any) => ({
          url: item.url || "",
          ttfb: typeof item.ttfb === 'number' ? item.ttfb : 0,
          renderTime: typeof item.renderTime === 'number' ? item.renderTime : 0,
          timestamp: now // Use current time since the API doesn't provide timestamps
        }));
        
        console.log("Processed load time data:", formattedData); // Add debug log
        setLoadTimes(formattedData);
        setLoadingLoadTimes(false);
      } catch (error) {
        console.error("Failed to fetch load times:", error);
        setLoadTimes([]);
        setLoadingLoadTimes(false);
      }
    };
    
    if (id) {
      fetchLoadTimes();
    }
  }, [id, getToken]);

  if (!id) {
    return (
      <Card className="shadow-md rounded-lg">
        <Alert 
          message="No Project Selected" 
          description="Please select a project from the projects page to view its dashboard." 
          type="info" 
          showIcon 
          className="m-4"
        />
        <Button 
          type="primary" 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate('/projects')}
          style={{ margin: '16px' }}
        >
          Back to Projects
        </Button>
      </Card>
    );
  }

  if (loadingDetails) {
    return (
      <Card className="shadow-md rounded-lg" style={{ minHeight: '400px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className="text-center">
          <Spin size="large" />
          <div style={{ marginTop: '16px' }}>Loading project data...</div>
        </div>
      </Card>
    );
  }

  if (!project) {
    return (
      <Card className="shadow-md rounded-lg">
        <Alert 
          message="Error loading project details" 
          description="Could not load details for the selected project. Please try again or select a different project."
          type="error" 
          showIcon 
          className="m-4" 
        />
      </Card>
    );
  }

  return (
    <div style={{ width: '100%', margin: '0 auto' }}>
      {/* Back Button */}
      <Row style={{ marginBottom: '16px' }}>
        <Button 
          type="default" 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate('/projects')}
        >
          Back to Projects
        </Button>
      </Row>
      
      {/* Project Overview and Stats */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={24}>
          <Card 
            className="shadow-md rounded-lg"
            title={
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <InfoCircleOutlined style={{ color: '#1890ff', marginRight: '8px' }} />
                <span style={{ fontWeight: 600, fontSize: '16px' }}>Project Overview</span>
              </div>
            }
          >
            <Row gutter={[32, 24]}>
              <Col xs={24} md={16}>
                <Row gutter={[24, 24]}>
                  <Col xs={24} md={12}>
                    <Card className="inner-card" bordered={false} style={{ background: '#f9f9f9', borderRadius: '8px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                          <LinkOutlined style={{ marginRight: '8px', color: 'rgba(0, 0, 0, 0.45)' }} />
                          <span style={{ color: 'rgba(0, 0, 0, 0.45)' }}>URL</span>
                        </div>
                        <div style={{ fontSize: '14px', wordBreak: 'break-all' }}>
                          <a 
                            href={project.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            style={{ color: '#1890ff', fontWeight: 500 }}
                          >
                            {project.url}
                          </a>
                        </div>
                      </div>
                    </Card>
                  </Col>
                  
                  <Col xs={24} md={12}>
                    <Card className="inner-card" bordered={false} style={{ background: '#f9f9f9', borderRadius: '8px' }}>
                      <Statistic 
                        title={<div style={{ display: 'flex', alignItems: 'center' }}><CalendarOutlined style={{ marginRight: '8px' }} />Last Crawl</div>}
                        value={project.lastcrawl ? new Date(project.lastcrawl).toLocaleString() : 'Never crawled'}
                        valueStyle={{ fontSize: '14px', color: '#262626', fontWeight: 500 }}
                      />
                    </Card>
                  </Col>
                  
                  <Col xs={24} md={12}>
                    <Card className="inner-card" bordered={false} style={{ 
                      background: isCrawlInProgress() ? '#e6f7ff' : '#f9f9f9', 
                      borderRadius: '8px',
                      borderLeft: isCrawlInProgress() ? '4px solid #1890ff' : 'none' 
                    }}>
                      <Statistic 
                        title={<div style={{ display: 'flex', alignItems: 'center' }}><ClockCircleOutlined style={{ marginRight: '8px' }} />Crawl Status</div>}
                        value=" " 
                        valueStyle={{ fontSize: '14px' }}
                        formatter={() => getStatusTag(crawlStatus.status)}
                      />
                    </Card>
                  </Col>
                  
                  <Col xs={24} md={12}>
                    <Card className="inner-card" bordered={false} style={{ 
                      background: isCrawlInProgress() ? '#e6f7ff' : '#f9f9f9', 
                      borderRadius: '8px',
                      borderLeft: isCrawlInProgress() ? '4px solid #1890ff' : 'none' 
                    }}>
                      <Statistic 
                        title={<div style={{ display: 'flex', alignItems: 'center' }}><FileTextOutlined style={{ marginRight: '8px' }} />Pages Crawled</div>}
                        value={crawlStatus.pagesCrawled ?? 0}
                        valueStyle={{ fontSize: '14px', color: '#262626', fontWeight: 500 }}
                      />
                    </Card>
                  </Col>

                  <Col xs={24}>
                    <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'center' }}>
                      <Button 
                        type="primary" 
                        onClick={queueCrawl} 
                        loading={loading} 
                        disabled={isCrawlInProgress() || loading}
                        icon={<SyncOutlined />}
                        size="large"
                        style={{ 
                          minWidth: '200px', 
                          height: '44px',
                          borderRadius: '6px',
                          boxShadow: '0 2px 0 rgba(0, 0, 0, 0.045)'
                        }}
                      >
                        {(crawlStatus.status?.toLowerCase() === 'crawling' || crawlStatus.status?.toLowerCase() === 'in progress')
                          ? 'Crawling in Progress...' 
                          : (crawlStatus.status?.toLowerCase() === 'queued' ? 'Queued for Crawling' : 'Start New Crawl')}
                      </Button>
                    </div>
                  </Col>
                </Row>
              </Col>
                
              <Col xs={24} md={8}>
                <Card 
                  className="inner-card" 
                  bordered={false} 
                  title={
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <HeartOutlined style={{ color: '#1890ff', marginRight: '8px' }} />
                      <span style={{ fontWeight: 600, fontSize: '14px' }}>Website Health</span>
                    </div>
                  }
                  style={{ height: '100%', background: '#f9f9f9', borderRadius: '8px' }}
                  bodyStyle={{ padding: '12px' }}
                >
                  {loadingNotifications ? (
                    <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Spin size="default" />
                    </div>
                  ) : notifications.length === 0 ? (
                    <HealthDisplay health={{
                      score: 100,
                      status: 'excellent',
                      criticalIssues: 0,
                      warningIssues: 0,
                      infoIssues: 0,
                      color: '#52c41a' // green
                    }} pagesCrawled={crawlStatus.pagesCrawled ?? 0} />
                  ) : (
                    <HealthDisplay health={healthMetrics} pagesCrawled={crawlStatus.pagesCrawled ?? 0} />
                  )}
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
      
      {/* Notifications Card */}
      <div style={{ marginTop: '24px', width: '100%' }}>
        <Card 
          title={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <WarningOutlined style={{ color: '#faad14', marginRight: '8px' }} />
                <span style={{ fontWeight: 600, fontSize: '16px' }}>Notifications by Category</span>
              </div>
            </div>
          } 
          className="shadow-md rounded-lg"
          bordered={true}
          bodyStyle={{ padding: '20px' }}
        >
          <NotificationsByCategory 
            projectId={Number(id)} 
            onRefresh={() => fetchNotifications(id as string)}
          />
        </Card>
      </div>

      {/* Load Times Section */}
      <Row gutter={[24, 24]} style={{ marginTop: '24px' }}>
        <Col xs={24}>
          <Card 
            className="shadow-md rounded-lg"
            title={
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <ThunderboltOutlined style={{ color: '#1890ff', marginRight: '8px' }} />
                <span style={{ fontWeight: 600, fontSize: '16px' }}>Page Load Performance</span>
              </div>
            }
          >
            <LoadTimeMetrics 
              loadTimes={loadTimes} 
              loading={loadingLoadTimes} 
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

// New component for showing notifications by category
const NotificationsByCategory: React.FC<{ projectId: number; onRefresh: () => void }> = ({ projectId, onRefresh }) => {
  const { getToken } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  
  // Fetch notifications
  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = await getToken();
      const data = await FetchWithAuth(`/api/notifications?projectId=${projectId}`, token, {});
      setNotifications(Array.isArray(data) ? data : []);
      return data;
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
      setError("Could not load notifications.");
      setNotifications([]);
      throw err;
    } finally {
      setLoading(false);
    }
  };


  // Fetch data when component mounts or projectId changes
  useEffect(() => {
    fetchNotifications();
  }, [projectId]);

  // Get notification categories and counts
  const categoriesWithCounts = useMemo(() => {
    const categoryCounts: Record<string, number> = {};
    
    notifications.forEach(notification => {
      const category = notification.category;
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });
    
    return Object.entries(categoryCounts).map(([category, count]) => ({
      category,
      count,
      color: getCategoryColor(category),
      severity: getCategorySeverity(category)
    })).sort((a, b) => {
      // First sort by severity (critical first)
      const severityOrder = { critical: 0, warning: 1, info: 2, success: 3 };
      const severityA = severityOrder[a.severity] || 999;
      const severityB = severityOrder[b.severity] || 999;
      
      if (severityA !== severityB) {
        return severityA - severityB;
      }
      
      // Then sort by count (highest first)
      return b.count - a.count;
    });
  }, [notifications]);

  // Group notifications by URL for the selected category
  const urlsByCategory = useMemo(() => {
    if (!selectedCategory) return [];
    
    const categoryNotifications = notifications.filter(n => n.category === selectedCategory);
    const urlGroups: Record<string, Notification[]> = {};
    
    categoryNotifications.forEach(notification => {
      if (!urlGroups[notification.url]) {
        urlGroups[notification.url] = [];
      }
      urlGroups[notification.url].push(notification);
    });
    
    return Object.entries(urlGroups).map(([url, notifications]) => ({
      url,
      notifications,
      count: notifications.length
    })).sort((a, b) => b.count - a.count);
  }, [notifications, selectedCategory]);

  // Category panel click handler
  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category === selectedCategory ? null : category);
  };

  // Get category explanation
  const getCategoryExplanation = (category: string): string => {
    switch (category.toLowerCase()) {
      case 'redirect':
        return 'Redirects can impact user experience and SEO. Too many redirects slow down page loading and can confuse search engines. Proper redirect management ensures visitors and search engines can navigate your site efficiently.';
      case 'external_resource':
        return 'External resources such as third-party scripts, images, or stylesheets can introduce performance, security, and privacy issues. They may also trigger GDPR compliance requirements if they transfer user data.';
      case 'crawl_error':
        return 'Crawl errors prevent search engines from properly indexing your site, reducing your visibility in search results. Fixing these ensures your content is fully discoverable.';
      case 'accessibility':
        return 'Accessibility issues can prevent users with disabilities from using your site effectively. Addressing these improves user experience for all visitors and helps comply with accessibility regulations like WCAG and ADA.';
      case 'seo':
        return 'SEO issues can negatively impact your search engine rankings. Addressing these helps improve your visibility in search results and drives more organic traffic to your site.';
      case 'error_4xx':
        return '4xx errors (like 404 Not Found) indicate client-side problems. These create poor user experience and waste crawl budget, potentially hurting your SEO performance.';
      case 'error_5xx':
        return '5xx errors indicate server-side problems. These severely impact user experience and can cause search engines to reduce crawling of your site, affecting your SEO performance.';
      case 'broken_link':
        return 'Broken links frustrate users and damage your site\'s credibility. They also waste crawl budget and can negatively impact your SEO rankings.';
      case 'large_image':
        return 'Oversized images slow down page loading, leading to higher bounce rates and poor user experience. Optimizing images improves page speed, which is a ranking factor for search engines.';
      case 'noindex':
        return 'The noindex tag prevents search engines from indexing a page. This can be intentional, but if used incorrectly, important pages may be excluded from search results.';
      case 'nofollow':
        return 'The nofollow attribute prevents search engines from following links. This affects how PageRank flows through your site and can impact SEO if used incorrectly.';
      case 'h1_missing':
        return 'H1 headings are crucial for both users and search engines to understand the main topic of your page. Missing H1s can hurt your SEO and make pages harder to navigate.';
      case 'multiple_h1':
        return 'Multiple H1 headings on a single page can confuse search engines about the main topic. For optimal SEO, each page should have exactly one H1 heading.';
      case 'no_https':
        return 'HTTPS is essential for security and is a ranking factor for search engines. Sites without HTTPS may display security warnings to users and receive lower rankings in search results.';
      default:
        return 'This category of issues can affect your website\'s performance, user experience, or compliance with web standards. Addressing these issues will improve overall site quality.';
    }
  };

  if (loading && notifications.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px', color: '#8c8c8c' }}>
          Loading notifications...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error"
        description={error}
        type="error"
        showIcon
      />
    );
  }

  if (notifications.length === 0) {
    return (
      <Empty 
        description="No notifications found for this project" 
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        style={{ margin: '20px 0' }}
      />
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: '100%' }}>
      {/* Categories header */}
      <div style={{ marginBottom: '16px' }}>
        <Text strong>Select a category to view details</Text>
      </div>

      {/* Categories as panels */}
      <Row gutter={[16, 16]} style={{ width: '100%', margin: 0 }}>
        {categoriesWithCounts.map(({ category, count, color, severity }) => (
          <Col xs={24} sm={12} md={8} lg={6} key={category} style={{ paddingBottom: '16px' }}>
            <Card 
              hoverable
              style={{ 
                borderLeft: `4px solid ${color}`,
                borderRadius: '4px',
                background: selectedCategory === category ? '#f0f7ff' : '#fff',
                width: '100%',
                height: '100%',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
              }}
              bordered={true}
              bodyStyle={{ padding: '12px', height: '100%' }}
              onClick={() => handleCategoryClick(category)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {getCategoryIcon(category)}
                    <span style={{ 
                      marginLeft: '8px', 
                      fontWeight: 500,
                      textTransform: 'capitalize'
                    }}>
                      {category.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <Text type="secondary" style={{ fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    {getSeverityText(severity)}
                  </Text>
                </div>
                <Badge 
                  count={count} 
                  style={{ 
                    backgroundColor: getSeverityColor(severity),
                  }} 
                  overflowCount={99}
                />
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* URLs for selected category */}
      {selectedCategory && (
        <div style={{ marginTop: '24px', width: '100%' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '16px',
            paddingBottom: '12px',
            borderBottom: '1px solid #f0f0f0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Button 
                type="text" 
                icon={<ArrowLeftOutlined />} 
                onClick={() => setSelectedCategory(null)}
                style={{ marginRight: '8px', padding: '0 4px' }}
              />
              <Title level={5} style={{ margin: 0 }}>
                URLs with {selectedCategory.replace(/_/g, ' ')} issues
              </Title>
            </div>
            <div>
              <Button 
                size="small" 
                type="link"
                onClick={() => setShowExplanation(!showExplanation)}
                icon={<InfoCircleOutlined />}
              >
                Why is this important?
              </Button>
            </div>
          </div>

          {showExplanation && (
            <Alert
              message={`About ${selectedCategory.replace(/_/g, ' ')} issues`}
              description={getCategoryExplanation(selectedCategory)}
              type="info"
              showIcon
              style={{ marginBottom: '16px' }}
              closable
              onClose={() => setShowExplanation(false)}
            />
          )}

          <List
            dataSource={urlsByCategory}
            bordered
            style={{ background: 'white', borderRadius: '4px' }}
            renderItem={({ url, notifications }) => (
              <List.Item>
                <List.Item.Meta
                  title={
                    <a 
                      href={url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ fontWeight: 500 }}
                    >
                      <LinkOutlined style={{ marginRight: '8px' }} />
                      {getDisplayUrl(url)}
                    </a>
                  }
                  description={
                    <ul style={{ marginTop: '8px', paddingLeft: '24px', marginBottom: 0 }}>
                      {notifications.map(notification => (
                        <li key={notification.id} style={{ marginBottom: '4px' }}>
                          {notification.message}
                        </li>
                      ))}
                    </ul>
                  }
                />
              </List.Item>
            )}
          />
        </div>
      )}
    </div>
  );
};

// Helper functions
const getCategoryIcon = (category: string): React.ReactNode => {
  switch (category.toLowerCase()) {
    case 'redirect': return <LinkOutlined style={{ color: '#1890ff' }} />;
    case 'external_resource': return <LinkOutlined style={{ color: '#722ed1' }} />;
    case 'crawl_error': return <WarningOutlined style={{ color: '#f5222d' }} />;
    case 'accessibility': return <InfoCircleOutlined style={{ color: '#13c2c2' }} />;
    case 'seo': return <FileTextOutlined style={{ color: '#52c41a' }} />;
    case 'error_4xx': 
    case 'error_5xx': return <CloseCircleOutlined style={{ color: '#f5222d' }} />;
    case 'broken_link': return <LinkOutlined style={{ color: '#f5222d' }} />;
    case 'large_image': return <FileTextOutlined style={{ color: '#fa8c16' }} />;
    case 'noindex':
    case 'nofollow': return <ExclamationCircleOutlined style={{ color: '#faad14' }} />;
    case 'h1_missing':
    case 'multiple_h1': return <FileTextOutlined style={{ color: '#fa8c16' }} />;
    case 'no_https': return <WarningOutlined style={{ color: '#f5222d' }} />;
    default: return <InfoCircleOutlined style={{ color: '#d9d9d9' }} />;
  }
};

const getSeverityText = (severity: string): string => {
  switch (severity) {
    case 'critical': return 'Critical Issue';
    case 'warning': return 'Warning';
    case 'info': return 'Information';
    case 'success': return 'Success';
    default: return 'Information';
  }
};

const getSeverityColor = (severity: string): string => {
  switch (severity) {
    case 'critical': return '#f5222d'; // red
    case 'warning': return '#faad14'; // gold
    case 'info': return '#1890ff'; // blue
    case 'success': return '#52c41a'; // green
    default: return '#1890ff'; // blue
  }
};

const getDisplayUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    // Just display the hostname and pathname
    return `${urlObj.hostname}${urlObj.pathname === '/' ? '' : urlObj.pathname}`;
  } catch (error) {
    // If URL parsing fails, use the original string or try to make it presentable
    const hostnameMatch = url.match(/^(?:https?:\/\/)?([^\/]+)/i);
    return hostnameMatch ? hostnameMatch[1] : url;
  }
};

// Utility function to classify page performance
const classifyPagePerformance = (ttfb: number, renderTime: number): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' => {
  // Time to First Byte thresholds (in ms)
  const ttfbThresholds = {
    excellent: 200,  // < 200ms
    good: 500,       // < 500ms
    fair: 1000,      // < 1000ms
    poor: 2000       // < 2000ms
    // Anything above 2000ms is considered critical
  };
  
  // Total render time thresholds (in ms)
  const renderThresholds = {
    excellent: 800,  // < 800ms
    good: 1800,      // < 1800ms
    fair: 3000,      // < 3000ms
    poor: 5000       // < 5000ms
    // Anything above 5000ms is considered critical
  };
  
  // Determine TTFB category
  let ttfbCategory: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  if (ttfb < ttfbThresholds.excellent) ttfbCategory = 'excellent';
  else if (ttfb < ttfbThresholds.good) ttfbCategory = 'good';
  else if (ttfb < ttfbThresholds.fair) ttfbCategory = 'fair';
  else if (ttfb < ttfbThresholds.poor) ttfbCategory = 'poor';
  else ttfbCategory = 'critical';
  
  // Determine render time category
  let renderCategory: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  if (renderTime < renderThresholds.excellent) renderCategory = 'excellent';
  else if (renderTime < renderThresholds.good) renderCategory = 'good';
  else if (renderTime < renderThresholds.fair) renderCategory = 'fair';
  else if (renderTime < renderThresholds.poor) renderCategory = 'poor';
  else renderCategory = 'critical';
  
  // Use the worse of the two categories
  const categories = ['excellent', 'good', 'fair', 'poor', 'critical'];
  const ttfbIndex = categories.indexOf(ttfbCategory);
  const renderIndex = categories.indexOf(renderCategory);
  const worstIndex = Math.max(ttfbIndex, renderIndex);
  
  return categories[worstIndex] as 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
}

// Get color based on performance category
const getPerformanceColor = (category: string): string => {
  switch (category) {
    case 'excellent': return '#52c41a'; // green
    case 'good': return '#1890ff';      // blue
    case 'fair': return '#faad14';      // gold
    case 'poor': return '#fa8c16';      // orange
    case 'critical': return '#f5222d';  // red
    default: return '#8c8c8c';          // grey
  }
};

// Generate tag for performance categories
const getPerformanceTag = (category: 'excellent' | 'good' | 'fair' | 'poor' | 'critical'): React.ReactNode => {
  const iconMap = {
    'excellent': <CheckCircleOutlined />,
    'good': <CheckCircleOutlined />,
    'fair': <ClockCircleOutlined />,
    'poor': <WarningOutlined />,
    'critical': <CloseCircleOutlined />
  };
  
  const colorMap = {
    'excellent': 'success',
    'good': 'processing',
    'fair': 'warning',
    'poor': 'warning',
    'critical': 'error'
  };
  
  return (
    <Tag icon={iconMap[category]} color={colorMap[category]} style={{ textTransform: 'capitalize' }}>
      {category}
    </Tag>
  );
};

// Function to get readable time format
const formatTime = (ms: number): string => {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

// Load Times visualization component
const LoadTimeMetrics: React.FC<LoadTimeMetricsProps> = ({ loadTimes, loading }) => {
  // Process and sort data for visualization
  const processedData = useMemo(() => {
    if (!loadTimes || loadTimes.length === 0) return [];
    
    // Add performance categorization
    const categorizedData = loadTimes.map(item => {
      // Ensure numeric values for ttfb and renderTime
      const ttfb = typeof item.ttfb === 'number' ? item.ttfb : 0;
      const renderTime = typeof item.renderTime === 'number' ? item.renderTime : 0;
      const performanceCategory = classifyPagePerformance(ttfb, renderTime);
      
      return {
        ...item,
        url: item.url || "",
        ttfb,
        renderTime,
        performanceCategory
      };
    });
    
    // Sort by render time (slowest first)
    return categorizedData.sort((a, b) => b.renderTime - a.renderTime);
  }, [loadTimes]);
  
  // Table columns for detailed view
  const tableColumns = [
    {
      title: 'URL',
      dataIndex: 'url',
      key: 'url',
      ellipsis: true,
      render: (url: string) => {
        // Safely handle URL display
        try {
          // Try to parse the URL
          const urlObj = new URL(url);
          const path = urlObj.pathname === '/' ? 'Home' : urlObj.pathname;
          return (
            <Tooltip title={url}>
              <a href={url} target="_blank" rel="noopener noreferrer">
                {path}
              </a>
            </Tooltip>
          );
        } catch (error) {
          // Fallback for URLs that can't be parsed
          return (
            <Tooltip title={url}>
              <a href={url.startsWith('http') ? url : `https://${url}`} target="_blank" rel="noopener noreferrer">
                {url}
              </a>
            </Tooltip>
          );
        }
      },
    },
    {
      title: 'TTFB',
      dataIndex: 'ttfb',
      key: 'ttfb',
      width: 100,
      sorter: (a: any, b: any) => a.ttfb - b.ttfb,
      render: (ttfb: number) => formatTime(ttfb),
    },
    {
      title: 'Render Time',
      dataIndex: 'renderTime',
      key: 'renderTime',
      width: 120,
      sorter: (a: any, b: any) => a.renderTime - b.renderTime,
      defaultSortOrder: 'descend' as 'descend',
      render: (renderTime: number) => formatTime(renderTime),
    },
    {
      title: 'Performance',
      dataIndex: 'performanceCategory',
      key: 'performanceCategory',
      width: 120,
      filters: [
        { text: 'Critical', value: 'critical' },
        { text: 'Poor', value: 'poor' },
        { text: 'Fair', value: 'fair' },
        { text: 'Good', value: 'good' },
        { text: 'Excellent', value: 'excellent' },
      ],
      onFilter: (value: any, record: any) => record.performanceCategory === value,
      render: (category: 'excellent' | 'good' | 'fair' | 'poor' | 'critical') => getPerformanceTag(category),
    },
  ];
  
  if (loading) {
    return (
      <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }
  
  if (!loadTimes || loadTimes.length === 0) {
    return (
      <div>
        <Row gutter={[24, 24]}>
          <Col xs={24} md={8}>
            <Card className="inner-card" bordered={false} style={{ 
              background: '#f9f9f9', 
              borderRadius: '8px',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <div style={{ textAlign: 'center' }}>
                <Progress
                  type="dashboard"
                  percent={100}
                  format={() => (
                    <span style={{ color: '#8c8c8c', fontSize: '18px', fontWeight: 'bold' }}>
                      No Data
                    </span>
                  )}
                  strokeColor="#d9d9d9"
                  strokeWidth={8}
                  width={140}
                />
                <div style={{ 
                  marginTop: '16px', 
                  fontSize: '18px', 
                  fontWeight: 600, 
                  color: '#8c8c8c' 
                }}>
                  No Performance Data
                </div>
                <div style={{ 
                  marginTop: '8px', 
                  fontSize: '14px', 
                  color: 'rgba(0,0,0,0.65)',
                  padding: '0 16px'
                }}>
                  Start a crawl to collect performance data
                </div>
              </div>
            </Card>
          </Col>
          
          <Col xs={24} md={16}>
            <Card className="inner-card" bordered={false} style={{ 
              background: '#f9f9f9', 
              borderRadius: '8px',
              height: '100%'
            }}>
              <div style={{ 
                fontSize: '16px', 
                fontWeight: 600, 
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center'
              }}>
                <InfoCircleOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                Performance Insight
              </div>
              
              <div style={{ fontSize: '14px', marginBottom: '24px' }}>
                No performance data is available. Start a crawl to analyze your website's performance.
              </div>
              
              <Empty 
                description="No page performance data available yet" 
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            </Card>
          </Col>
        </Row>
        
        <Card
          bordered={false}
          className="shadow-sm"
          title={
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <ThunderboltOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
              <span>Page Load Time Details</span>
            </div>
          }
          style={{ marginTop: '24px' }}
        >
          <Empty 
            description="No load time data available" 
            image={Empty.PRESENTED_IMAGE_SIMPLE} 
          />
        </Card>
      </div>
    );
  }
  
  // Count pages in each performance category
  const performanceCounts = {
    critical: processedData.filter(d => d.performanceCategory === 'critical').length,
    poor: processedData.filter(d => d.performanceCategory === 'poor').length,
    fair: processedData.filter(d => d.performanceCategory === 'fair').length,
    good: processedData.filter(d => d.performanceCategory === 'good').length,
    excellent: processedData.filter(d => d.performanceCategory === 'excellent').length,
  };
  
  // Calculate average metrics safely
  const averageTTFB = loadTimes.length > 0 
    ? loadTimes.reduce((sum, item) => sum + (typeof item.ttfb === 'number' ? item.ttfb : 0), 0) / loadTimes.length 
    : 0;
    
  const averageRenderTime = loadTimes.length > 0 
    ? loadTimes.reduce((sum, item) => sum + (typeof item.renderTime === 'number' ? item.renderTime : 0), 0) / loadTimes.length 
    : 0;
  
  // Calculate performance score (0-100)
  const calculatePerformanceScore = () => {
    if (loadTimes.length === 0) return 0; // Changed from 100 to 0 to indicate no data
    
    // Weight factors - higher weight for critical issues
    const weights = {
      excellent: 100,
      good: 80,
      fair: 60,
      poor: 30,
      critical: 0
    };
    
    // Calculate weighted score
    let totalWeight = 0;
    const categories = ['excellent', 'good', 'fair', 'poor', 'critical'];
    
    categories.forEach(category => {
      const count = performanceCounts[category as keyof typeof performanceCounts];
      totalWeight += count * weights[category as keyof typeof weights];
    });
    
    const score = Math.round(totalWeight / loadTimes.length);
    return score;
  };
  
  // Calculate actual score
  const performanceScore = calculatePerformanceScore();
  
  // Get slowest page data for highlighting
  const slowestPage = processedData.length > 0 ? processedData[0] : null;
  
  // Get performance status text and color
  const getPerformanceStatus = (score: number): {text: string, color: string} => {
    if (score >= 90) return { text: 'Excellent', color: '#52c41a' };
    if (score >= 75) return { text: 'Good', color: '#1890ff' };
    if (score >= 60) return { text: 'Fair', color: '#faad14' };
    if (score >= 40) return { text: 'Poor', color: '#fa8c16' };
    return { text: 'Critical', color: '#f5222d' };
  };
  
  const performanceStatus = getPerformanceStatus(performanceScore);
  
  // Get performance issues summary
  const getPerformanceInsight = () => {
    const issues = [];
    
    if (performanceCounts.critical > 0) {
      issues.push(`${performanceCounts.critical} page${performanceCounts.critical > 1 ? 's' : ''} with critical performance issues`);
    }
    
    if (performanceCounts.poor > 0) {
      issues.push(`${performanceCounts.poor} page${performanceCounts.poor > 1 ? 's' : ''} with poor performance`);
    }
    
    if (averageTTFB > 1000) {
      issues.push('High average Time to First Byte (TTFB)');
    }
    
    if (averageRenderTime > 3000) {
      issues.push('High average render time');
    }
    
    if (issues.length === 0) {
      if (performanceScore >= 90) {
        return 'Your website is performing excellently! No major performance issues detected.';
      } else {
        return 'Your website is performing well, but there\'s room for improvement.';
      }
    }
    
    return issues.join('. ') + '.';
  };
  
  return (
    <div>
      <Row gutter={[24, 24]}>
        <Col xs={24} md={8}>
          <Card className="inner-card" bordered={false} style={{ 
            background: '#f9f9f9', 
            borderRadius: '8px',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}>
            <div style={{ textAlign: 'center' }}>
              <Progress
                type="dashboard"
                percent={performanceScore}
                format={percent => (
                  <span style={{ color: performanceStatus.color, fontSize: '28px', fontWeight: 'bold' }}>
                    {percent}
                  </span>
                )}
                strokeColor={performanceStatus.color}
                strokeWidth={8}
                width={140}
              />
              <div style={{ 
                marginTop: '16px', 
                fontSize: '18px', 
                fontWeight: 600, 
                color: performanceStatus.color 
              }}>
                {performanceStatus.text} Performance
              </div>
              <div style={{ 
                marginTop: '8px', 
                fontSize: '14px', 
                color: 'rgba(0,0,0,0.65)',
                padding: '0 16px'
              }}>
                Based on {loadTimes.length} analyzed pages
              </div>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} md={16}>
          <Card className="inner-card" bordered={false} style={{ 
            background: '#f9f9f9', 
            borderRadius: '8px',
            height: '100%'
          }}>
            <div style={{ 
              fontSize: '16px', 
              fontWeight: 600, 
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center'
            }}>
              <InfoCircleOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
              Performance Insight
            </div>
            
            <div style={{ fontSize: '14px', marginBottom: '24px' }}>
              {getPerformanceInsight()}
            </div>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <Tag color="#52c41a">{performanceCounts.excellent} Excellent</Tag>
              <Tag color="#1890ff">{performanceCounts.good} Good</Tag>
              <Tag color="#faad14">{performanceCounts.fair} Fair</Tag>
              <Tag color="#fa8c16">{performanceCounts.poor} Poor</Tag>
              <Tag color="#f5222d">{performanceCounts.critical} Critical</Tag>
            </div>
            
            <Divider style={{ margin: '16px 0' }} />
            
            <Row>
              <Col span={12}>
                <Statistic 
                  title={<div style={{ fontSize: '14px' }}><ThunderboltOutlined style={{ marginRight: '8px', color: '#1890ff' }} />Average TTFB</div>}
                  value={formatTime(averageTTFB)}
                  valueStyle={{ 
                    fontSize: '16px', 
                    color: averageTTFB > 1000 ? '#f5222d' : (averageTTFB > 500 ? '#fa8c16' : '#52c41a'), 
                    fontWeight: 500 
                  }}
                />
              </Col>
              <Col span={12}>
                <Statistic 
                  title={<div style={{ fontSize: '14px' }}><RocketOutlined style={{ marginRight: '8px', color: '#1890ff' }} />Average Render Time</div>}
                  value={formatTime(averageRenderTime)}
                  valueStyle={{ 
                    fontSize: '16px', 
                    color: averageRenderTime > 3000 ? '#f5222d' : (averageRenderTime > 1800 ? '#fa8c16' : '#52c41a'), 
                    fontWeight: 500 
                  }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
      
      {/* Show slowest page alert if there are performance issues */}
      {(slowestPage && (slowestPage.performanceCategory === 'critical' || slowestPage.performanceCategory === 'poor')) && (
        <Alert
          message="Performance Issue Detected"
          description={
            <div>
              Your slowest page is <strong>{
                (() => {
                  try {
                    const url = new URL(slowestPage.url);
                    return url.pathname === '/' ? 'Home' : url.pathname;
                  } catch {
                    return slowestPage.url;
                  }
                })()
              }</strong> with a render time of <strong>{formatTime(slowestPage.renderTime)}</strong> and TTFB of <strong>{formatTime(slowestPage.ttfb)}</strong>.
            </div>
          }
          type="warning"
          showIcon
          style={{ marginTop: '24px', marginBottom: '0px' }}
        />
      )}
      
      <Card
        bordered={false}
        className="shadow-sm"
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <ThunderboltOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
            <span>Page Load Time Details</span>
          </div>
        }
        style={{ marginTop: '24px' }}
      >
        <Table 
          dataSource={processedData} 
          columns={tableColumns} 
          rowKey="url"
          pagination={{ pageSize: 15 }}
          scroll={{ x: 'max-content' }}
        />
      </Card>
    </div>
  );
};

export default Dashboard;
