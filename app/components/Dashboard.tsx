import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Descriptions, Divider, Button, message } from 'antd';
import { FetchWithAuth } from '../services/api';
import { useAuth } from '@clerk/clerk-react';
import { useParams } from 'react-router-dom';

interface Project {
  id: number;
  userId: string;
  url: string;
  lastcrawl?: string;
}

const Dashboard: React.FC = () => {
  const { getToken } = useAuth();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [status, setStatus] = useState<string>("loading");

  useEffect(() => {
    if (id) {
      fetchProjectDetails();
      fetchCrawlStatus();
      const interval = setInterval(fetchCrawlStatus, 5000); // Poll every 5 seconds
      return () => clearInterval(interval);
    }
  }, [id]);

  const fetchProjectDetails = async () => {
    if (!id) return;
    
    try {
      const token = await getToken();
      const response = await FetchWithAuth(`/api/project/get/${id}`, token, {
        method: "GET",
      });
      setProject(response);
    } catch (error) {
      console.error("Failed to get project details:", error);
    }
  };

  const fetchCrawlStatus = async () => {
    if (!id) return;
    
    try {
      const token = await getToken();
      const response = await FetchWithAuth('/api/crawl/status', token, {
        method: "POST",
        body: JSON.stringify({ projectId: Number(id) }),
      });
      setStatus(response.status);
    } catch (error) {
      console.error("Failed to get crawl status:", error);
    }
  };

  const queueCrawl = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const token = await getToken();
      await FetchWithAuth('/api/crawl/queue', token, {
        method: "POST",
        body: JSON.stringify({ projectId: Number(id) }),
      });
      await fetchCrawlStatus();
    } catch (error) {
      console.error("Failed to queue crawl:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!id) {
    return <div>Please select a project</div>;
  }

  return (
    <div>
      <Card>
        <Descriptions title="Details" bordered>
          <Descriptions.Item label="URL">{project?.url || 'Loading...'}</Descriptions.Item>
          <Descriptions.Item label="Last Crawl">{project?.lastcrawl || 'Never'}</Descriptions.Item>
        </Descriptions>
        <Divider />
        <Row gutter={16}>
          <Col span={12}>
            <Statistic title="Pages Crawled" value={0} />
          </Col>
          <Col span={12}>
            <Statistic title="Crawl Status" value={status} />
          </Col>
        </Row>
        <Divider />
        <Row justify="center">
          <Button 
            type="primary" 
            onClick={queueCrawl} 
            loading={loading}
            disabled={status === "queued"}
          >
            Queue Crawl
          </Button>
        </Row>
      </Card>
    </div>
  );
};

export default Dashboard;
