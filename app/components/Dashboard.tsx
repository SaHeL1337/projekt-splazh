import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Descriptions, Divider, Button, message, Space, Typography, Tag, Spin, Alert } from 'antd';
import { FetchWithAuth } from '../services/api';
import { useAuth } from '@clerk/clerk-react';
import { useParams } from 'react-router-dom';
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
    FileTextOutlined
} from '@ant-design/icons';

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

const getStatusTag = (status: string | null | undefined) => {
  status = status?.toLowerCase() || 'unknown';
  switch (status) {
    case 'completed':
      return <Tag icon={<CheckCircleOutlined />} color="success">Completed</Tag>;
    case 'crawling':
    case 'processing':
      return <Tag icon={<SyncOutlined spin />} color="processing">Crawling</Tag>;
    case 'queued':
      return <Tag icon={<ClockCircleOutlined />} color="blue">Queued</Tag>;
    case 'error':
      return <Tag icon={<CloseCircleOutlined />} color="error">Error</Tag>;
    case 'idle':
    case 'never':
    case 'not crawled':
    case 'unknown':
      return <Tag icon={<ClockCircleOutlined />} color="default">Not Crawled</Tag>;
    default:
      return <Tag color="default">{status}</Tag>;
  }
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

  // Separate fetch function for status polling
  const pollCrawlStatus = async () => {
    if (!id) return;
    try {
      const token = await getToken();
      const response = await FetchWithAuth(`/api/crawl?projectId=${id}`, token, {
        method: "GET"
      });
      // Only update state if component is still mounted and id matches
      // (Add check if needed, depending on routing/unmount behavior)
      setCrawlStatus({
        status: response.status || 'idle',
        pagesCrawled: response.pagesCrawled ?? 0
      });
    } catch (error) {
      console.error("Failed to poll crawl status:", error);
      // Avoid setting error status during polling unless desired
      // setCrawlStatus({ status: 'error', pagesCrawled: 0 }); 
    }
  };

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    const loadInitialData = async () => {
        if (id) {
            setLoadingDetails(true);
            setProject(null); // Clear previous project data
            setCrawlStatus({ status: null, pagesCrawled: null }); // Clear previous status

            // Fetch project details and initial crawl status concurrently
            const results = await Promise.allSettled([
                fetchProjectDetails(id),
                fetchCrawlStatus(id)
            ]);

            // Stop loading indicator regardless of success/failure
            setLoadingDetails(false);

            // Set up polling *after* initial load attempts
            intervalId = setInterval(pollCrawlStatus, 5000);

        } else {
            // No ID selected, clear everything and stop loading
            setLoadingDetails(false);
            setProject(null);
            setCrawlStatus({ status: null, pagesCrawled: null });
        }
    };

    loadInitialData();

    // Cleanup function to clear interval when component unmounts or id changes
    return () => {
        if (intervalId) {
            clearInterval(intervalId);
        }
    };

  }, [id, getToken]); // Add getToken dependency

  // Modified fetch functions to remove finally blocks that set loadingDetails
  const fetchProjectDetails = async (projectId: string) => {
    // Removed !id check as it's checked in useEffect
    try {
      const token = await getToken();
      const response = await FetchWithAuth(`/api/project?projectId=${projectId}`, token, {
        method: "GET",
      });
      setProject(response);
    } catch (error) {
      console.error("Failed to get project details:", error);
      setProject(null); // Set project to null on error
    }
    // Removed finally block
  };

  const fetchCrawlStatus = async (projectId: string) => {
    // Removed !id check as it's checked in useEffect
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
      setCrawlStatus({ status: 'error', pagesCrawled: 0 }); // Set error status
    }
    // Removed finally block
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

  if (!id) {
    return <Alert message="Please select a project to view its dashboard." type="info" showIcon className="m-4" />;
  }

  if (loadingDetails) {
    return <div className="text-center p-10"><Spin size="large" tip="Loading project data..."/></div>;
  }

  if (!project) {
    return <Alert message="Error loading project details" description="Could not load details for the selected project. Please try again or select a different project." type="error" showIcon className="m-4" />;
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <Card className="shadow-md p-4">
        <Descriptions 
            title={<Title level={4} className="mb-2">Project Overview</Title>} 
            bordered 
            size="small" 
            column={1} 
            labelStyle={{ width: '150px' }}
        >
          <Descriptions.Item label={<><LinkOutlined className="mr-2" />URL</>}>
            <a href={project.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">
              {project.url}
            </a>
          </Descriptions.Item>
          <Descriptions.Item label={<><CalendarOutlined className="mr-2" />Last Crawl</>}>
            {project.lastcrawl ? new Date(project.lastcrawl).toLocaleString() : 'Never'}
          </Descriptions.Item>
        </Descriptions>
        
        <Divider className="my-6" />
        
        <Row gutter={[16, 24]} align="middle" justify="space-between">
          <Col xs={24} sm={24} md={14} lg={16}>
             <Descriptions size="small" column={{ xs: 1, sm: 2 }}>
               <Descriptions.Item label={<><ClockCircleOutlined className="mr-2" />Crawl Status</>} span={1}>
                   {getStatusTag(crawlStatus.status)}
               </Descriptions.Item>
               <Descriptions.Item label={<><FileTextOutlined className="mr-2" />Pages Crawled</>} span={1}>{crawlStatus.pagesCrawled ?? '-'}</Descriptions.Item>
            </Descriptions>
          </Col>

          <Col xs={24} sm={24} md={10} lg={8} className="text-center md:text-right mt-4 md:mt-0">
             <Button 
                type="primary" 
                onClick={queueCrawl} 
                loading={loading} 
                disabled={crawlStatus.status === 'queued' || crawlStatus.status === 'crawling' || loading}
                icon={<SyncOutlined />}
                size="middle"
                className="min-w-[150px]"
             >
                {crawlStatus.status === 'crawling' ? 'Crawling...' : (crawlStatus.status === 'queued' ? 'Queued' : 'Start New Crawl')}
             </Button>
          </Col>
        </Row>
      </Card>
      
      <Card title="Notifications" size="small" className="shadow-md">
        {project && <ProjectNotifications projectId={project.id} />}
      </Card>
    </div>
  );
};

export default Dashboard;
