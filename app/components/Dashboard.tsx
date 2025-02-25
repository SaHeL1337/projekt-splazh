import React, { useState } from 'react';
import { Card, Row, Col, Statistic, Descriptions, Divider, Button, message } from 'antd';
import { FetchWithAuth } from '../services/api';
import { useAuth } from '@clerk/clerk-react';

const dummyProject = {
  id: 1,
  name: "Sample Project",
  url: "https://example.com",
  lastCrawl: "2023-10-01T12:00:00Z",
  pagesCrawled: 120,
  status: "Completed",
};

const Dashboard: React.FC = () => {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);

  const startCrawl = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      await FetchWithAuth('/api/crawl/start', token, {
        method: "POST",
        body: JSON.stringify({ projectId: dummyProject.id }),
      });
    } catch (error) {
      console.error("Failed to start crawl:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Card>
        <Descriptions title="Details" bordered>
          <Descriptions.Item label="URL">{dummyProject.url}</Descriptions.Item>
          <Descriptions.Item label="Last Crawl">{dummyProject.lastCrawl}</Descriptions.Item>
        </Descriptions>
        <Divider />
        <Row gutter={16}>
          <Col span={12}>
            <Statistic title="Pages Crawled" value={dummyProject.pagesCrawled} />
          </Col>
          <Col span={12}>
            <Statistic title="Crawl Status" value={dummyProject.status} />
          </Col>
        </Row>
        <Divider />
        <Row justify="center">
          <Button type="primary" onClick={startCrawl} loading={loading}>
            Start Crawl
          </Button>
        </Row>
      </Card>
    </div>
  );
};

export default Dashboard;
