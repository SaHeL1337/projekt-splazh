import React, { useState, useEffect, useMemo } from 'react';
import { Card, Row, Col, Statistic, Descriptions, Divider, Button, message, Space, Typography, Tag, Spin, Alert, Input, Empty, notification, Progress, Badge, List } from 'antd';
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
    PieChartOutlined,
    ReloadOutlined,
    ArrowLeftOutlined,
    HeartOutlined,
    CheckCircleFilled,
    ExclamationCircleFilled,
    InfoCircleFilled,
    ExclamationCircleOutlined
} from '@ant-design/icons';
import { Pie } from '@ant-design/plots';

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

const calculateHealthScore = (notifications: Notification[]): HealthMetrics => {
  if (!notifications || notifications.length === 0) {
    return {
      score: 100,
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

const HealthDisplay: React.FC<{ health: HealthMetrics }> = ({ health }) => {
  const getStatusText = (status: string): string => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getStatusDescription = (health: HealthMetrics): string => {
    if (health.criticalIssues > 0) {
      return `${health.criticalIssues} critical issues need attention`;
    } else if (health.warningIssues > 0) {
      return `${health.warningIssues} warnings to review`;
    } else if (health.infoIssues > 0) {
      return `${health.infoIssues} informational items`;
    } else {
      return 'No issues detected';
    }
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <Progress
        type="dashboard"
        percent={health.score}
        format={() => (
          <span style={{ color: health.color, fontSize: '28px', fontWeight: 'bold' }}>
            {Math.round(health.score)}
          </span>
        )}
        strokeColor={health.color}
        strokeWidth={8}
        width={160}
      />
      <div style={{ marginTop: '16px' }}>
        <div style={{ fontSize: '18px', fontWeight: 600, color: health.color, marginBottom: '4px' }}>
          {getStatusText(health.status)}
        </div>
        <div style={{ fontSize: '14px', color: 'rgba(0, 0, 0, 0.45)' }}>
          {getStatusDescription(health)}
        </div>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '24px' }}>
        <Statistic 
          title={<div style={{ fontSize: '13px' }}><ExclamationCircleFilled style={{ color: '#f5222d', marginRight: '4px' }} />Critical</div>}
          value={health.criticalIssues} 
          valueStyle={{ color: health.criticalIssues > 0 ? '#f5222d' : '#8c8c8c', fontSize: '16px' }}
        />
        <Statistic 
          title={<div style={{ fontSize: '13px' }}><WarningOutlined style={{ color: '#faad14', marginRight: '4px' }} />Warning</div>}
          value={health.warningIssues} 
          valueStyle={{ color: health.warningIssues > 0 ? '#faad14' : '#8c8c8c', fontSize: '16px' }}
        />
        <Statistic 
          title={<div style={{ fontSize: '13px' }}><InfoCircleFilled style={{ color: '#1890ff', marginRight: '4px' }} />Info</div>}
          value={health.infoIssues} 
          valueStyle={{ color: '#8c8c8c', fontSize: '16px' }}
        />
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

  // Separate fetch function for status polling
  const pollCrawlStatus = async () => {
    if (!id) return;
    try {
      const token = await getToken();
      const response = await FetchWithAuth(`/api/crawl?projectId=${id}`, token, {
        method: "GET"
      });
      setCrawlStatus({
        status: response.status || 'idle',
        pagesCrawled: response.pagesCrawled ?? 0
      });
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
      const health = calculateHealthScore(notifications);
      setHealthMetrics(health);
    } else {
      setNotificationCategories([]);
      setHealthMetrics({
        score: 100,
        status: 'excellent',
        criticalIssues: 0,
        warningIssues: 0,
        infoIssues: 0,
        color: '#52c41a'
      });
    }
  }, [notifications]);

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

  const fetchNotifications = async (projectId: string) => {
    setLoadingNotifications(true);
    try {
      const token = await getToken();
      const data = await FetchWithAuth(`/api/notifications?projectId=${projectId}`, token, {});
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      setNotifications([]);
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
      message.success('Crawl queued!');
      setTimeout(pollCrawlStatus, 1500);
    } catch (error) {
      console.error("Failed to queue crawl:", error);
      message.error('Failed to queue crawl.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const data = await FetchWithAuth(`/api/project/${id}/dashboard`, token, {
        method: 'GET',
      });
      setDashboardData(data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      notification.error({
        message: 'Error',
        description: 'Failed to load dashboard data. Please try again later.',
      });
    } finally {
      setLoading(false);
    }
  };

  const viewResults = () => {
    navigate(`/dashboard/project/${id}/results`);
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
  
  // Custom tooltip formatter for the pie chart
  const tooltipFormatter = (datum: any) => {
    if (!datum || datum.value === undefined) {
      return "";
    }
    const percentage = ((datum.value / totalNotifications) * 100).toFixed(1);
    return `${datum.label || 'Unknown'}: ${datum.value} (${percentage}%)`;
  };

  // Helper function to check if a crawl is in progress
  const isCrawlInProgress = () => {
    const status = crawlStatus.status?.toLowerCase();
    return status === 'queued' || status === 'crawling' || status === 'in progress';
  };

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
                    }} />
                  ) : (
                    <HealthDisplay health={healthMetrics} />
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
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <WarningOutlined style={{ color: '#faad14', marginRight: '8px' }} />
              <span style={{ fontWeight: 600, fontSize: '16px' }}>Notifications by Category</span>
            </div>
          } 
          className="shadow-md rounded-lg"
          bordered={true}
          bodyStyle={{ padding: '20px' }}
        >
          <NotificationsByCategory projectId={Number(id)} />
        </Card>
      </div>
    </div>
  );
};

// New component for showing notifications by category
const NotificationsByCategory: React.FC<{ projectId: number }> = ({ projectId }) => {
  const { getToken } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Fetch notifications
  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = await getToken();
      const data = await FetchWithAuth(`/api/notifications?projectId=${projectId}`, token, {});
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
      setError("Could not load notifications.");
      setNotifications([]);
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
      />
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: '100%' }}>
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
            <Title level={5} style={{ margin: 0 }}>
              URLs with {selectedCategory.replace(/_/g, ' ')} issues
            </Title>
            <Button 
              size="small" 
              onClick={() => setSelectedCategory(null)}
              icon={<ArrowLeftOutlined />}
            >
              Back to all categories
            </Button>
          </div>

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
    const path = urlObj.pathname === '/' ? '' : urlObj.pathname;
    return `${urlObj.hostname}${path}${urlObj.search}`;
  } catch (e) {
    return url;
  }
};

export default Dashboard;
