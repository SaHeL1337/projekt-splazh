import React, { useState, useEffect } from 'react';
import { Card, Collapse, Tag, Typography, List, Badge, Space, Tooltip, Button, Empty, Spin } from 'antd';
import { 
  WarningOutlined, 
  InfoCircleOutlined, 
  LinkOutlined, 
  DownOutlined, 
  RightOutlined, 
  ReloadOutlined,
  QuestionCircleOutlined 
} from '@ant-design/icons';
import { FetchWithAuth } from '../services/api';
import { useAuth } from '@clerk/clerk-react';

const { Panel } = Collapse;
const { Text } = Typography;

interface Notification {
  id: number;
  projectId: number;
  url: string;
  category: string;
  message: string;
  timestamp: string;
}

interface GroupedNotification {
  url: string;
  notifications: Notification[];
  count: number;
}

const getCategoryColor = (category: string): string => {
  switch (category.toLowerCase()) {
    case 'redirect': return 'blue';
    case 'external_resource': return 'purple';
    case 'crawl_error': return 'error';
    case 'accessibility': return 'cyan';
    case 'seo': return 'green';
    default: return 'default';
  }
};

const getCategoryIcon = (category: string): React.ReactNode => {
  switch (category.toLowerCase()) {
    case 'redirect': return <LinkOutlined />;
    case 'external_resource': return <LinkOutlined style={{ color: 'purple' }}/>;
    case 'crawl_error': return <WarningOutlined style={{ color: 'red' }} />;
    case 'accessibility': return <InfoCircleOutlined style={{ color: 'cyan' }} />;
    case 'seo': return <InfoCircleOutlined style={{ color: 'green' }} />;
    default: return <InfoCircleOutlined />;
  }
};

const getCategoryDescription = (category: string): string => {
  switch (category.toLowerCase()) {
    case 'redirect': return 'The page redirected to another URL during the crawl.';
    case 'external_resource': return 'An external resource (like a script, CSS, or image) was loaded from a different domain.';
    case 'crawl_error': return 'An error occurred while trying to crawl or analyze this specific page.';
    case 'accessibility': return 'Potential accessibility issue detected.';
    case 'seo': return 'Potential SEO issue detected.';
    default: return 'General notification.';
  }
};

interface ProjectNotificationsProps {
  projectId: number;
}

const ProjectNotifications: React.FC<ProjectNotificationsProps> = ({ projectId }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [groupedNotifications, setGroupedNotifications] = useState<GroupedNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getToken } = useAuth();

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

  useEffect(() => {
    fetchNotifications();
  }, [projectId]);

  useEffect(() => {
    // Group notifications by URL when notifications data changes
    const groups: { [url: string]: Notification[] } = {};
    notifications.forEach(n => {
      if (!groups[n.url]) {
        groups[n.url] = [];
      }
      groups[n.url].push(n);
    });
    
    const groupedArray: GroupedNotification[] = Object.entries(groups).map(([url, notifications]) => ({
      url,
      notifications,
      count: notifications.length
    }));
    
    setGroupedNotifications(groupedArray);
  }, [notifications]);

  const getCategoryCounts = (notifications: Notification[]) => {
    const counts: { [category: string]: number } = {};
    notifications.forEach(n => {
      counts[n.category] = (counts[n.category] || 0) + 1;
    });
    return counts;
  };
  
  const sortedUrls = groupedNotifications.sort((a, b) => a.url.localeCompare(b.url));
  
  const cardTitle = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span>Notifications</span>
      <Button icon={<ReloadOutlined />} onClick={fetchNotifications} size="small" loading={loading} />
    </div>
  );

  // Convert Collapse children to items prop
  const collapseItems = sortedUrls.map(({ url, notifications: urlNotifications, count }) => {
    const categoryCounts = getCategoryCounts(urlNotifications);
    return {
      key: url,
      label: (
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap' }}>
          <Text strong style={{ wordBreak: 'break-word', maxWidth: 'calc(100% - 50px)' }}>
            {url}
          </Text>
          <Badge count={count} style={{ backgroundColor: '#1890ff', marginLeft: 'auto' }} />
        </div>
      ),
      children: (
        <List
          itemLayout="horizontal"
          dataSource={urlNotifications}
          renderItem={notification => (
            <List.Item>
              <List.Item.Meta
                avatar={getCategoryIcon(notification.category)}
                title={
                  <Space>
                    <Tag color={getCategoryColor(notification.category)}>
                      {notification.category.replace('_', ' ')}
                    </Tag>
                    <Tooltip title={getCategoryDescription(notification.category)}>
                      <QuestionCircleOutlined style={{ color: '#999' }} />
                    </Tooltip>
                  </Space>
                }
                description={<Text>{notification.message}</Text>}
              />
            </List.Item>
          )}
        />
      )
    };
  });

  return (
    <Card title={cardTitle} className="notifications-card">
      {loading && notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin />
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '20px', color: 'red' }}>
          {error}
        </div>
      ) : notifications.length === 0 ? (
        <Empty description="No notifications found" />
      ) : (
        <Collapse 
          items={collapseItems} // Use items prop here
          expandIcon={({ isActive }) => isActive ? <DownOutlined /> : <RightOutlined />}
          className="url-collapse"
        >
          {/* Removed direct Panel children */}
        </Collapse>
      )}
    </Card>
  );
};

export default ProjectNotifications; 