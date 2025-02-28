import { Layout, Row, Col, Space, Divider, Popover, Button, Badge } from 'antd';
import { SettingOutlined, NotificationOutlined, CrownOutlined, RocketOutlined } from '@ant-design/icons';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FetchWithAuth } from '../services/api';
import { useAuth } from '@clerk/clerk-react';

import { Breadcrumb } from 'antd';
const { Header } = Layout;

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

export default function MyHeader(){
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

  return <Header style={{ padding: 0 }}>
    <Row align="middle">
      <Col className="breadcrumb" span={18}><Breadcrumb items={[{ title: 'Dashboard' }, { title: 'https://cloudvil.com'}]} /></Col>
      
      <Col className="subscription-status" span={3} style={{ textAlign: 'right' }}>
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
            >
              Premium
            </Button>
          ) : (
            <Button 
              type="text" 
              icon={<RocketOutlined style={{ color: '#52c41a' }} />}
            >
              Free
            </Button>
          )}
        </Popover>
      </Col>
      
      <Col className="userNavigation" span={2}>
        <UserComponent/> 
      </Col>
      <Col className="userNavigation" span={1}>
        <Space size="small">
          <SettingOutlined />
          <NotificationOutlined />
        </Space>
      </Col>
    </Row>
  </Header>
}