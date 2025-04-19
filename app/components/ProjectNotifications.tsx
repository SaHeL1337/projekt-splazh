import React, { useState, useEffect, useMemo } from 'react';
import { 
  Card, Collapse, Tag, Typography, List, Badge, Space, Tooltip, Button, Empty, Spin, 
  Alert, Row, Col, Select, Statistic
} from 'antd';
import { 
  WarningOutlined, 
  InfoCircleOutlined, 
  LinkOutlined, 
  DownOutlined, 
  RightOutlined, 
  ReloadOutlined,
  QuestionCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { FetchWithAuth } from '../services/api';
import { useAuth } from '@clerk/clerk-react';

const { Panel } = Collapse;
const { Text, Paragraph, Title } = Typography;

// Enhanced notification interface
interface Notification {
  id: number;
  projectId: number;
  url: string;
  category: string;
  message: string;
  timestamp: string;
  severity?: 'critical' | 'warning' | 'info' | 'success';
}

// Group notifications by URL
interface GroupedNotification {
  url: string;
  notifications: Notification[];
  count: number;
}

// Map notification categories to icons, colors, and descriptions
const categoryMetadata: Record<string, { 
  color: string; 
  icon: React.ReactNode; 
  description: string;
  severity: 'critical' | 'warning' | 'info' | 'success';
  actionable: boolean;
  suggestedAction?: string;
}> = {
  'redirect': { 
    color: 'blue', 
    icon: <LinkOutlined />, 
    description: 'The page redirected to another URL during the crawl.',
    severity: 'info',
    actionable: false
  },
  'external_resource': { 
    color: 'purple', 
    icon: <LinkOutlined style={{ color: 'purple' }}/>,
    description: 'An external resource was loaded from a different domain.',
    severity: 'info',
    actionable: false
  },
  'crawl_error': { 
    color: 'error', 
    icon: <WarningOutlined style={{ color: 'red' }} />,
    description: 'An error occurred while trying to crawl this page.',
    severity: 'critical',
    actionable: true,
    suggestedAction: 'Check if the page is accessible.'
  },
  'accessibility': { 
    color: 'cyan', 
    icon: <InfoCircleOutlined style={{ color: 'cyan' }} />,
    description: 'Potential accessibility issue detected.',
    severity: 'warning',
    actionable: true,
    suggestedAction: 'Review the element for accessibility.'
  },
  'seo': { 
    color: 'green', 
    icon: <FileTextOutlined style={{ color: 'green' }} />,
    description: 'Potential SEO issue detected.',
    severity: 'warning',
    actionable: true,
    suggestedAction: 'Follow SEO best practices.'
  },
  'title_length': { 
    color: 'orange', 
    icon: <FileTextOutlined style={{ color: 'orange' }} />,
    description: 'The page title length is not optimal for SEO.',
    severity: 'warning',
    actionable: true,
    suggestedAction: 'Adjust title length to 50-60 characters.'
  },
  'performance': { 
    color: 'volcano', 
    icon: <WarningOutlined style={{ color: '#d4380d' }} />,
    description: 'Performance issue detected.',
    severity: 'warning',
    actionable: true,
    suggestedAction: 'Optimize page load time.'
  },
  'security': { 
    color: 'magenta', 
    icon: <WarningOutlined style={{ color: '#eb2f96' }} />,
    description: 'Potential security vulnerability.',
    severity: 'critical',
    actionable: true,
    suggestedAction: 'Address security concern immediately.'
  }
};

// Get category color
const getCategoryColor = (category: string): string => {
  return categoryMetadata[category.toLowerCase()]?.color || 'default';
};

// Get category icon
const getCategoryIcon = (category: string): React.ReactNode => {
  return categoryMetadata[category.toLowerCase()]?.icon || <InfoCircleOutlined />;
};

// Get category description
const getCategoryDescription = (category: string): string => {
  return categoryMetadata[category.toLowerCase()]?.description || 'General notification.';
};

// Get severity level for a category
const getCategorySeverity = (category: string): 'critical' | 'warning' | 'info' | 'success' => {
  return categoryMetadata[category.toLowerCase()]?.severity || 'info';
};

// Get suggested action for a category
const getSuggestedAction = (category: string): string | undefined => {
  return categoryMetadata[category.toLowerCase()]?.suggestedAction;
};

// Get severity icon
const getSeverityIcon = (severity: 'critical' | 'warning' | 'info' | 'success'): React.ReactNode => {
  switch (severity) {
    case 'critical':
      return <ExclamationCircleOutlined style={{ color: '#f5222d' }} />;
    case 'warning':
      return <WarningOutlined style={{ color: '#faad14' }} />;
    case 'info':
      return <InfoCircleOutlined style={{ color: '#1890ff' }} />;
    case 'success':
      return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    default:
      return <InfoCircleOutlined style={{ color: '#1890ff' }} />;
  }
};

// Get severity color
const getSeverityColor = (severity: 'critical' | 'warning' | 'info' | 'success'): string => {
  switch (severity) {
    case 'critical':
      return '#f5222d';
    case 'warning':
      return '#faad14';
    case 'info':
      return '#1890ff';
    case 'success':
      return '#52c41a';
    default:
      return '#1890ff';
  }
};

// Interface for component props
interface ProjectNotificationsProps {
  projectId: number;
}

const ProjectNotifications: React.FC<ProjectNotificationsProps> = ({ projectId }) => {
  // State for raw data
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // UI state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSeverity, setSelectedSeverity] = useState<'critical' | 'warning' | 'info' | 'success' | null>(null);
  const [activePanels, setActivePanels] = useState<string[]>([]);
  
  const { getToken } = useAuth();

  // Fetch notifications from API
  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = await getToken();
      const data = await FetchWithAuth(`/api/notifications?projectId=${projectId}`, token, {});
      
      // Add severity to each notification based on its category
      const enhancedData = Array.isArray(data) 
        ? data.map(notification => ({
            ...notification,
            severity: getCategorySeverity(notification.category),
          }))
        : [];
        
      setNotifications(enhancedData);
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

  // Group notifications by URL
  const groupedByUrl = useMemo(() => {
    const groups: { [url: string]: Notification[] } = {};
    
    notifications.forEach(n => {
      if (!groups[n.url]) {
        groups[n.url] = [];
      }
      groups[n.url].push(n);
    });
    
    return Object.entries(groups).map(([url, notifications]) => ({
      url,
      notifications,
      count: notifications.length
    }));
  }, [notifications]);

  // Count notifications by severity
  const severityCounts = useMemo(() => {
    const counts = { critical: 0, warning: 0, info: 0, success: 0 };
    
    notifications.forEach(n => {
      const severity = n.severity || 'info';
      counts[severity]++;
    });
    
    return counts;
  }, [notifications]);

  // Filter notifications based on selected filters
  const filteredNotifications = useMemo(() => {
    let filtered = [...notifications];
    
    if (selectedCategory) {
      filtered = filtered.filter(n => n.category === selectedCategory);
    }
    
    if (selectedSeverity) {
      filtered = filtered.filter(n => n.severity === selectedSeverity);
    }
    
    return filtered;
  }, [notifications, selectedCategory, selectedSeverity]);

  // Clear all filters
  const clearFilters = () => {
    setSelectedCategory(null);
    setSelectedSeverity(null);
  };

  // Handle category selection
  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category === selectedCategory ? null : category);
  };

  // Handle severity selection
  const handleSeveritySelect = (severity: 'critical' | 'warning' | 'info' | 'success') => {
    setSelectedSeverity(severity === selectedSeverity ? null : severity);
  };

  // Handle panel change for URL groups
  const handlePanelChange = (keys: string | string[]) => {
    const keyArray = Array.isArray(keys) ? keys : [keys];
    setActivePanels(keyArray);
  };

  // Render loading state
  if (loading && notifications.length === 0) {
    return (
      <Card>
        <div style={{ 
          textAlign: 'center', 
          padding: '40px 20px',
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
      </Card>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <Card>
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
      </Card>
    );
  }
  
  // Render empty state
  if (notifications.length === 0) {
    return (
      <Card>
        <div style={{ 
          textAlign: 'center', 
          padding: '40px 20px',
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
          <div style={{ color: '#8c8c8c', marginTop: '8px', marginBottom: '16px' }}>
            Your project is running smoothly
          </div>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={fetchNotifications}
            type="primary"
          >
            Refresh Notifications
          </Button>
        </div>
      </Card>
    );
  }

  // Get URLs to display based on filters
  const urlsToDisplay = groupedByUrl.filter(group => {
    // If category filter is applied
    if (selectedCategory && !group.notifications.some(n => n.category === selectedCategory)) {
      return false;
    }
    
    // If severity filter is applied
    if (selectedSeverity && !group.notifications.some(n => n.severity === selectedSeverity)) {
      return false;
    }
    
    return true;
  }).sort((a, b) => {
    // Sort URLs containing critical issues first
    const aCritical = a.notifications.some(n => n.severity === 'critical');
    const bCritical = b.notifications.some(n => n.severity === 'critical');
    
    if (aCritical && !bCritical) return -1;
    if (!aCritical && bCritical) return 1;
    
    // Then sort by notification count
    return b.count - a.count;
  });

  return (
    <Card 
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Project Notifications</span>
          <Space>
            {(selectedCategory || selectedSeverity) && (
              <Button 
                size="small"
                icon={<CloseCircleOutlined />} 
                onClick={clearFilters}
              >
                Clear Filters
              </Button>
            )}
            <Button 
              size="small"
              icon={<ReloadOutlined />} 
              onClick={fetchNotifications} 
              loading={loading}
              type="primary"
            >
              Refresh
            </Button>
          </Space>
        </div>
      }
    >
      {/* Show summary stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
        <Col xs={24} sm={6}>
          <Statistic 
            title="Total" 
            value={notifications.length} 
            valueStyle={{ color: '#1890ff' }}
          />
        </Col>
        <Col xs={24} sm={6}>
          <Statistic 
            title="Critical Issues" 
            value={severityCounts.critical} 
            valueStyle={{ color: '#f5222d' }}
          />
        </Col>
        <Col xs={24} sm={6}>
          <Statistic 
            title="Warnings" 
            value={severityCounts.warning} 
            valueStyle={{ color: '#faad14' }}
          />
        </Col>
        <Col xs={24} sm={6}>
          <Statistic 
            title="Pages Affected" 
            value={groupedByUrl.length} 
          />
        </Col>
      </Row>

      {/* Active filters display */}
      {(selectedCategory || selectedSeverity) && (
        <div style={{ marginBottom: '16px' }}>
          <Space wrap>
            <Text type="secondary">Active Filters:</Text>
            
            {selectedCategory && (
              <Tag 
                color={getCategoryColor(selectedCategory)}
                closable
                onClose={() => setSelectedCategory(null)}
              >
                Category: {selectedCategory.replace('_', ' ')}
              </Tag>
            )}
            
            {selectedSeverity && (
              <Tag 
                color={getSeverityColor(selectedSeverity)}
                closable
                onClose={() => setSelectedSeverity(null)}
              >
                Severity: {selectedSeverity}
              </Tag>
            )}
          </Space>
        </div>
      )}

      {/* Filter controls */}
      <div style={{ marginBottom: '16px' }}>
        <Row gutter={16}>
          <Col span={12}>
            <Select
              placeholder="Filter by Category"
              style={{ width: '100%' }}
              allowClear
              value={selectedCategory}
              onChange={setSelectedCategory}
              options={Array.from(new Set(notifications.map(n => n.category))).map(category => ({
                value: category,
                label: (
                  <Space>
                    {getCategoryIcon(category)}
                    <span style={{ textTransform: 'capitalize' }}>{category.replace('_', ' ')}</span>
                  </Space>
                )
              }))}
            />
          </Col>
          <Col span={12}>
            <Select
              placeholder="Filter by Severity"
              style={{ width: '100%' }}
              allowClear
              value={selectedSeverity}
              onChange={setSelectedSeverity}
              options={[
                { value: 'critical', label: 'Critical', },
                { value: 'warning', label: 'Warning' },
                { value: 'info', label: 'Info' },
                { value: 'success', label: 'Success' }
              ]}
            />
          </Col>
        </Row>
      </div>

      {/* Notifications list */}
      <Collapse 
        activeKey={activePanels}
        onChange={handlePanelChange}
        expandIcon={({ isActive }) => 
          isActive ? 
            <DownOutlined /> : 
            <RightOutlined />
        }
        style={{ background: 'white' }}
      >
        {urlsToDisplay.map(({ url, notifications: urlNotifications }) => {
          // Filter notifications for this URL based on selected filters
          const filteredUrlNotifications = urlNotifications.filter(n => {
            if (selectedCategory && n.category !== selectedCategory) return false;
            if (selectedSeverity && n.severity !== selectedSeverity) return false;
            return true;
          });
          
          // Get category counts for this URL
          const categoryCounts: { [category: string]: number } = {};
          filteredUrlNotifications.forEach(n => {
            categoryCounts[n.category] = (categoryCounts[n.category] || 0) + 1;
          });
          
          // Check if this URL has a critical notification
          const hasCritical = filteredUrlNotifications.some(n => n.severity === 'critical');
          
          // Generate category tags
          const categoryTags = Object.entries(categoryCounts).map(([category, count]) => (
            <Tag 
              key={category} 
              color={getCategoryColor(category)}
              style={{ 
                marginRight: '8px', 
                cursor: 'pointer',
                border: selectedCategory === category ? '2px solid #222' : undefined,
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleCategorySelect(category);
              }}
            >
              {getCategoryIcon(category)}{' '}
              <span style={{ marginLeft: '4px' }}>{category.replace('_', ' ')} ({count})</span>
            </Tag>
          ));
          
          return (
            <Panel 
              key={url}
              header={
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <div>
                    <Space align="center">
                      {hasCritical && (
                        <ExclamationCircleOutlined style={{ color: '#f5222d' }} />
                      )}
                      <Text style={{ maxWidth: '500px', display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {url}
                      </Text>
                    </Space>
                    <div style={{ marginTop: '8px' }}>
                      {categoryTags}
                    </div>
                  </div>
                  <Badge 
                    count={filteredUrlNotifications.length} 
                    style={{ backgroundColor: hasCritical ? '#f5222d' : '#1890ff' }} 
                  />
                </div>
              }
            >
              <List
                dataSource={filteredUrlNotifications}
                renderItem={notification => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={getSeverityIcon(notification.severity || 'info')}
                      title={
                        <Space>
                          <Tag color={getCategoryColor(notification.category)}>
                            {notification.category.replace('_', ' ')}
                          </Tag>
                          <Tooltip title={getCategoryDescription(notification.category)}>
                            <QuestionCircleOutlined />
                          </Tooltip>
                        </Space>
                      }
                      description={
                        <Paragraph style={{ margin: '8px 0' }}>
                          {notification.message}
                        </Paragraph>
                      }
                    />
                  </List.Item>
                )}
              />
            </Panel>
          );
        })}
      </Collapse>
      
      {urlsToDisplay.length === 0 && (
        <Empty 
          description="No notifications match your filter criteria" 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      )}
    </Card>
  );
};

export default ProjectNotifications; 