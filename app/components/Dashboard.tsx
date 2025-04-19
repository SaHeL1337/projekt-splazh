import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Descriptions, Divider, Button, message, Space, Typography, Tag, Spin, Alert, Input, Empty, notification } from 'antd';
import { FetchWithAuth } from '../services/api';
import { useAuth } from '@clerk/clerk-react';
import { useParams, useNavigate } from 'react-router-dom';
import ProjectNotifications from './ProjectNotifications';
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
    ReloadOutlined
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
    } else {
      setNotificationCategories([]);
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
          description="Please select a project from the dropdown above to view its dashboard." 
          type="info" 
          showIcon 
          className="m-4"
        />
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

  const pieConfig = {
    data: notificationCategories,
    angleField: 'count',
    colorField: 'category',
    radius: 0.8,
    innerRadius: 0.6,
    legend: {
      position: 'bottom' as const,
      layout: 'horizontal' as const,
    },
    label: false,
    interactions: [{ type: 'element-active' }],
    statistic: {
      title: {
        style: {
          fontSize: '14px',
          color: 'rgba(0,0,0,0.65)',
          fontWeight: 'normal'
        },
        content: 'Total'
      },
      content: {
        style: {
          fontSize: '20px',
          fontWeight: 'bold',
          color: 'rgba(0,0,0,0.85)'
        },
        content: `${notifications.length}`
      },
    },
    color: notificationCategories.map(item => item.color),
    tooltip: {
      formatter: (datum: PieChartDatum) => {
        if (!datum || !datum.category) return { name: '', value: '' };
        
        return { 
          name: datum.category || 'Unknown', 
          value: `${datum.count} (${Math.round((datum.count / notifications.length) * 100)}%)` 
        };
      },
    },
  };

  return (
    <div style={{ width: '100%', margin: '0 auto' }}>
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
                      <PieChartOutlined style={{ color: '#1890ff', marginRight: '8px' }} />
                      <span style={{ fontWeight: 600, fontSize: '14px' }}>Notifications by Type</span>
                    </div>
                  }
                  style={{ height: '100%', background: '#f9f9f9', borderRadius: '8px' }}
                  bodyStyle={{ padding: '0 8px 8px' }}
                >
                  {loadingNotifications ? (
                    <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Spin size="default" />
                    </div>
                  ) : notificationCategories.length === 0 ? (
                    <Empty 
                      image={Empty.PRESENTED_IMAGE_SIMPLE} 
                      description="No notifications found" 
                      style={{ margin: '30px 0' }}
                    />
                  ) : (
                    <div style={{ height: 240 }}>
                      <Pie {...pieConfig} />
                    </div>
                  )}
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
      
      {/* Notifications Card */}
      <div style={{ marginTop: '24px' }}>
        <Card 
          title={
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <WarningOutlined style={{ color: '#faad14', marginRight: '8px' }} />
              <span style={{ fontWeight: 600, fontSize: '16px' }}>Latest Notifications</span>
              {totalNotifications > 0 && (
                <Tag color="#faad14">{totalNotifications}</Tag>
              )}
            </div>
          } 
          className="shadow-md rounded-lg"
        >
          <ProjectNotifications projectId={Number(id)} />
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
