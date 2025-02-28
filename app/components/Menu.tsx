import { UploadOutlined, UserOutlined, VideoCameraOutlined, NotificationOutlined, SettingOutlined, CrownOutlined } from '@ant-design/icons';
import { Layout as L, Menu as M, theme } from 'antd';
const { Sider } = L;
import { Link } from "react-router";
import React, { useState, useEffect } from 'react';
import { FetchWithAuth } from '../services/api';
import { useAuth } from '@clerk/clerk-react';

const Menu = () => {
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

  const isPremium = subscriptionStatus === 'premium';

  const items = [
    {
      label: <Link to="/dashboard/project">Dashboard</Link>,
      key: 'dashboard',
      icon: <UserOutlined />,
    },
    {
      label: <Link to="/projects">Projects</Link>,
      key: 'projects',
      icon: <VideoCameraOutlined />,
    },
    {
      label: <Link to="/subscription">Subscription</Link>,
      key: 'subscription',
      icon: <CrownOutlined />,
    }
  ];

  return (
    <Sider
      theme="light"
      breakpoint="lg"
      collapsedWidth="0"
      onBreakpoint={(broken) => {
        console.log(broken);
      }}
      onCollapse={(collapsed, type) => {
        console.log(collapsed, type);
      }}
    >
      <div className="demo-logo-vertical" />
      <M mode="inline" defaultSelectedKeys={['1']} items={items} />
    </Sider>
  );
};

export default Menu;