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

interface UrlWithCount {
  url: string;
  notifications: Notification[];
  count: number;
}

interface ProjectNotificationsProps {
  projectId: number;
}

const ProjectNotifications: React.FC<ProjectNotificationsProps> = ({ projectId }) => {
  const { getToken } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async () => {
    if (!projectId) return;
    
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      const response = await FetchWithAuth(`/api/notifications/get?projectId=${projectId}`, token, {
        method: "GET",
      });
      
      // Ensure we always have an array
      setNotifications(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error("Failed to get notifications:", error);
      setError("Failed to load notifications");
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [projectId]);

  // Group notifications by URL - ensure we're working with an array
  const groupedNotifications = (notifications || []).reduce((groups, notification) => {
    if (!groups[notification.url]) {
      groups[notification.url] = [];
    }
    groups[notification.url].push(notification);
    return groups;
  }, {} as Record<string, Notification[]>);

  // Sort URLs by notification count (descending)
  const sortedUrls: UrlWithCount[] = Object.entries(groupedNotifications)
    .map(([url, urlNotifications]) => ({
      url,
      notifications: urlNotifications,
      count: urlNotifications.length
    }))
    .sort((a, b) => b.count - a.count);

  // Count notifications by category for each URL
  const getCategoryCounts = (urlNotifications: Notification[]) => {
    const counts: Record<string, number> = {};
    urlNotifications.forEach(notification => {
      counts[notification.category] = (counts[notification.category] || 0) + 1;
    });
    return counts;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'external_resource':
        return 'blue';
      case 'redirect':
        return 'red';
      case 'performance':
        return 'orange';
      default:
        return 'default';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'external_resource':
        return <LinkOutlined />;
      case 'redirect':
        return <WarningOutlined />;
      case 'performance':
        return <InfoCircleOutlined />;
      default:
        return <InfoCircleOutlined />;
    }
  };

  const getCategoryDescription = (category: string) => {
    switch (category) {
      case 'external_resource':
        return 'External resources are files or services loaded from domains other than your website. These may include scripts, images, fonts, or other content.';
      case 'security':
        return 'Security issues that may affect your website or users.';
      case 'performance':
        return 'Issues that may impact the loading speed or performance of your website.';
      default:
        return 'General notification';
    }
  };

  const cardTitle = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span>Notifications</span>
      <Button 
        icon={<ReloadOutlined />} 
        onClick={fetchNotifications} 
        loading={loading}
        type="text"
      />
    </div>
  );

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
          expandIcon={({ isActive }) => isActive ? <DownOutlined /> : <RightOutlined />}
          className="url-collapse"
        >
          {sortedUrls.map(({ url, notifications: urlNotifications, count }) => {
            const categoryCounts = getCategoryCounts(urlNotifications);
            
            return (
              <Panel 
                key={url} 
                header={
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    width: '100%',
                    flexWrap: 'wrap'
                  }}>
                    <Text 
                      strong 
                      style={{ 
                        wordBreak: 'break-word', 
                        maxWidth: 'calc(100% - 50px)'
                      }}
                    >
                      {url}
                    </Text>
                    <Badge 
                      count={count} 
                      style={{ 
                        backgroundColor: '#1890ff',
                        marginLeft: 'auto'
                      }}
                    />
                  </div>
                }
              >
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
                        description={
                          <Text>{notification.message}</Text>
                        }
                      />
                    </List.Item>
                  )}
                />
              </Panel>
            );
          })}
        </Collapse>
      )}
    </Card>
  );
};

export default ProjectNotifications; 