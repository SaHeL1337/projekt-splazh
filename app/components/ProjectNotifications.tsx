import React, { useState, useEffect } from 'react';
import { Card, Collapse, Tag, Typography, List, Badge, Space, Tooltip, Button, Empty, Spin } from 'antd';
import { 
  WarningOutlined, 
  InfoCircleOutlined, 
  LinkOutlined, 
  DownOutlined, 
  RightOutlined, 
  ReloadOutlined,
  QuestionCircleOutlined,
  CheckCircleOutlined,
  AlertOutlined
} from '@ant-design/icons';
import { FetchWithAuth } from '../services/api';
import { useAuth } from '@clerk/clerk-react';

const { Panel } = Collapse;
const { Text, Paragraph } = Typography;

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
      <Button 
        icon={<ReloadOutlined />} 
        onClick={fetchNotifications} 
        size="small" 
        loading={loading}
        style={{ borderRadius: '4px' }}
      />
    </div>
  );

  // Convert Collapse children to items prop
  const collapseItems = sortedUrls.map(({ url, notifications: urlNotifications, count }) => {
    const categoryCounts = getCategoryCounts(urlNotifications);
    
    // Generate summary tags for categories
    const categoryTags = Object.entries(categoryCounts).map(([category, count]) => (
      <Tag 
        key={category} 
        color={getCategoryColor(category)}
        style={{ 
          marginRight: '8px', 
          marginBottom: '4px',
          borderRadius: '12px',
          padding: '0 8px'
        }}
      >
        {getCategoryIcon(category)}{' '}
        <span style={{ marginLeft: '4px' }}>{category.replace('_', ' ')} ({count})</span>
      </Tag>
    ));
    
    return {
      key: url,
      label: (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          width: '100%', 
          alignItems: 'center', 
          flexWrap: 'wrap',
          padding: '8px 0'
        }}>
          <Space direction="vertical" size={4} style={{ maxWidth: 'calc(100% - 60px)' }}>
            <Text strong style={{ wordBreak: 'break-word' }}>
              {url}
            </Text>
            <div style={{ marginTop: '4px' }}>
              {categoryTags}
            </div>
          </Space>
          <Badge 
            count={count} 
            style={{ 
              backgroundColor: '#1890ff', 
              marginLeft: 'auto',
              borderRadius: '14px',
              boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)'
            }} 
          />
        </div>
      ),
      children: (
        <List
          itemLayout="horizontal"
          dataSource={urlNotifications}
          style={{ 
            background: '#f9fbfd', 
            padding: '12px', 
            borderRadius: '8px',
            marginBottom: '8px'
          }}
          renderItem={notification => (
            <List.Item style={{ 
              padding: '16px', 
              marginBottom: '8px', 
              background: '#fff', 
              borderRadius: '8px',
              border: '1px solid #f0f0f0',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)' 
            }}>
              <List.Item.Meta
                avatar={
                  <div style={{ 
                    width: '32px', 
                    height: '32px', 
                    borderRadius: '50%', 
                    background: getCategoryColor(notification.category) === 'error' ? '#fff2f0' : '#f0f5ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '8px',
                    border: `1px solid ${getCategoryColor(notification.category) === 'error' ? '#ffccc7' : '#d6e4ff'}`
                  }}>
                    {getCategoryIcon(notification.category)}
                  </div>
                }
                title={
                  <Space align="center">
                    <Tag 
                      color={getCategoryColor(notification.category)}
                      style={{
                        padding: '2px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        textTransform: 'capitalize'
                      }}
                    >
                      {notification.category.replace('_', ' ')}
                    </Tag>
                    <Tooltip title={getCategoryDescription(notification.category)}>
                      <QuestionCircleOutlined style={{ color: '#8c8c8c' }} />
                    </Tooltip>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {new Date(notification.timestamp).toLocaleString()}
                    </Text>
                  </Space>
                }
                description={
                  <Paragraph 
                    style={{ 
                      margin: '8px 0 0', 
                      color: '#262626',
                      fontSize: '14px',
                      lineHeight: '1.5'
                    }}
                  >
                    {notification.message}
                  </Paragraph>
                }
              />
            </List.Item>
          )}
        />
      )
    };
  });

  if (loading && notifications.length === 0) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '40px 20px',
        background: '#fafafa',
        borderRadius: '8px',
        minHeight: '200px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px', color: '#8c8c8c' }}>
          Loading notifications...
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '40px 20px',
        background: '#fff2f0',
        borderRadius: '8px',
        border: '1px solid #ffccc7',
        minHeight: '200px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <WarningOutlined style={{ fontSize: '32px', color: '#ff4d4f', marginBottom: '16px' }} />
        <div style={{ color: '#ff4d4f', fontWeight: 500 }}>
          {error}
        </div>
        <Button 
          onClick={fetchNotifications} 
          style={{ marginTop: '16px' }}
          type="primary" 
          danger
        >
          Try Again
        </Button>
      </div>
    );
  }
  
  if (notifications.length === 0) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '40px 20px',
        background: '#f9fbfd',
        borderRadius: '8px',
        minHeight: '200px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <CheckCircleOutlined style={{ fontSize: '32px', color: '#52c41a', marginBottom: '16px' }} />
        <div style={{ color: '#262626', fontWeight: 500 }}>
          No notifications found
        </div>
        <div style={{ color: '#8c8c8c', marginTop: '8px' }}>
          Your project is running smoothly
        </div>
      </div>
    );
  }

  return (
    <div className="notifications-container">
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Text style={{ fontSize: '14px', color: '#8c8c8c' }}>
            Showing {notifications.length} notification{notifications.length !== 1 ? 's' : ''} across {groupedNotifications.length} URL{groupedNotifications.length !== 1 ? 's' : ''}
          </Text>
        </div>
        <Button 
          icon={<ReloadOutlined />} 
          onClick={fetchNotifications} 
          size="small"
          type="text"
          loading={loading}
        >
          Refresh
        </Button>
      </div>
      
      <Collapse 
        items={collapseItems}
        expandIcon={({ isActive }) => 
          isActive ? 
            <DownOutlined style={{ color: '#1890ff' }} /> : 
            <RightOutlined style={{ color: '#8c8c8c' }} />
        }
        className="url-collapse"
        bordered={false}
        style={{
          background: 'transparent',
        }}
      />
    </div>
  );
};

export default ProjectNotifications; 