import { Layout, Row, Col, Space, Divider, Popover, Button, Badge, Typography, Breadcrumb } from 'antd';
import { SettingOutlined, NotificationOutlined, CrownOutlined, RocketOutlined, MenuOutlined } from '@ant-design/icons';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FetchWithAuth } from '../services/api';
import { useAuth } from '@clerk/clerk-react';

const { Header } = Layout;
const { Text } = Typography;

import UserComponent from '../components/User';
import SubscriptionStatus from '../components/SubscriptionStatus';

// Custom content for the subscription popover
const SubscriptionPopoverContent = () => (
  <div>
    <SubscriptionStatus />
    <Divider style={{ margin: '12px 0' }} />
    <Link to="/subscription">
      <Button type="link" style={{ padding: 0 }}>
        View detailed subscription options
      </Button>
    </Link>
  </div>
);

export default function MyHeader() {
  const [subscriptionVisible, setSubscriptionVisible] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<'free' | 'premium' | null>(null);
  const [loading, setLoading] = useState(true);
  const { getToken } = useAuth();

  useEffect(() => {
    const getSubscriptionStatus = async () => {
      try {
        const token = await getToken();
        const result = await FetchWithAuth('/api/subscription', token, {
          method: "GET"
        });
        setSubscriptionStatus(result.status);
      } catch (error) {
        console.error('Failed to fetch subscription status:', error);
      } finally {
        setLoading(false);
      }
    };

    getSubscriptionStatus();
  }, [getToken]);

  const handleSubscriptionVisibleChange = (visible: boolean) => {
    setSubscriptionVisible(visible);
  };

  const isPremium = subscriptionStatus === 'premium';

  return (
    <Header 
      style={{ 
        padding: '0 16px', 
        background: '#fff', 
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        height: 'auto',
        lineHeight: '1.5'
      }}
    >
      <Row 
        align="middle" 
        gutter={[16, 16]}
        style={{ paddingTop: 12, paddingBottom: 12 }}
      >
        {/* Breadcrumb on desktop, collapsible on mobile */}
        <Col xs={16} sm={16} md={18} lg={18} xl={18}>
          <Breadcrumb 
            items={[{ title: 'Dashboard' }, { title: 'https://cloudvil.com'}]} 
            style={{ fontSize: '14px' }}
          />
        </Col>
        
        {/* Subscription Status Button */}
        <Col xs={0} sm={0} md={3} lg={3} xl={3} style={{ textAlign: 'right' }}>
          <Popover
            content={<SubscriptionPopoverContent />}
            title="Subscription Management"
            trigger="click"
            open={subscriptionVisible}
            onOpenChange={handleSubscriptionVisibleChange}
            placement="bottomRight"
            overlayStyle={{ width: '350px' }}
          >
            {isPremium ? (
              <Button 
                type="text" 
                icon={<CrownOutlined style={{ color: '#faad14' }} />}
                style={{ 
                  border: '1px solid #f0f0f0', 
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px'
                }}
              >
                <Text strong style={{ marginLeft: 4 }}>Premium</Text>
              </Button>
            ) : (
              <Button 
                type="text" 
                icon={<RocketOutlined style={{ color: '#52c41a' }} />}
                style={{ 
                  border: '1px solid #f0f0f0', 
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px'
                }}
              >
                <Text strong style={{ marginLeft: 4 }}>Free</Text>
              </Button>
            )}
          </Popover>
        </Col>
        
        {/* Mobile subscription icon only (no text) */}
        <Col xs={3} sm={3} md={0} lg={0} xl={0} style={{ textAlign: 'right' }}>
          <Popover
            content={<SubscriptionPopoverContent />}
            title="Subscription Management"
            trigger="click"
            placement="bottomRight"
            overlayStyle={{ width: '350px' }}
          >
            <Button type="text" size="small">
              {isPremium ? (
                <CrownOutlined style={{ color: '#faad14', fontSize: '16px' }} />
              ) : (
                <RocketOutlined style={{ color: '#52c41a', fontSize: '16px' }} />
              )}
            </Button>
          </Popover>
        </Col>
        
        {/* User Component */}
        <Col xs={3} sm={3} md={2} lg={2} xl={2} style={{ textAlign: 'right' }}>
          <UserComponent /> 
        </Col>
        
        {/* Settings/Notifications */}
        <Col xs={2} sm={2} md={1} lg={1} xl={1} style={{ textAlign: 'right' }}>
          <Space size="small">
            <Button 
              type="text" 
              icon={<SettingOutlined />} 
              size="small"
              style={{ 
                display: 'flex', 
                alignItems: 'center',
                justifyContent: 'center' 
              }}
            />
            <Button
              type="text"
              icon={<NotificationOutlined />}
              size="small"
              style={{ 
                display: 'flex', 
                alignItems: 'center',
                justifyContent: 'center' 
              }}
            />
          </Space>
        </Col>
      </Row>
    </Header>
  );
}