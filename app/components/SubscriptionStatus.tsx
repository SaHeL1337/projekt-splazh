import React, { useState, useEffect } from 'react';
import { Tag, Tooltip, Badge } from 'antd';
import { CrownOutlined, HourglassOutlined, ExperimentOutlined } from '@ant-design/icons';
import { FetchWithAuth } from '../services/api';
import { useAuth } from '@clerk/clerk-react';

interface SubscriptionData {
  user_id: string;
  status: 'free' | 'trial' | 'premium';
  valid_until: string;
}

const SubscriptionStatus: React.FC = () => {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const { getToken } = useAuth();

  useEffect(() => {
    const getSubscriptionStatus = async () => {
      try {
        const token = await getToken();
        const result = await FetchWithAuth('/api/subscription', token, {
          method: "GET"
        });
        setSubscription(result);
        
        // Calculate days remaining
        if (result.valid_until) {
          const validUntil = new Date(result.valid_until);
          const now = new Date();
          const diffTime = validUntil.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          setDaysRemaining(diffDays > 0 ? diffDays : 0);
        }
      } catch (error) {
        console.error('Failed to fetch subscription status:', error);
      } finally {
        setLoading(false);
      }
    };

    getSubscriptionStatus();
  }, [getToken]);

  if (loading) {
    return <Tag color="default">Loading...</Tag>;
  }

  if (!subscription) {
    return <Tag color="error">Error loading subscription</Tag>;
  }

  const renderSubscriptionTag = () => {
    switch (subscription.status) {
      case 'premium':
        return (
          <Tooltip title="Premium Subscription">
            <Tag color="gold" icon={<CrownOutlined />}>
              Premium
            </Tag>
          </Tooltip>
        );
      case 'trial':
        return (
          <Tooltip title={`Trial expires in ${daysRemaining} days`}>
              <Tag color="blue" icon={<HourglassOutlined />}>
                Trial, {daysRemaining} Days remaining
              </Tag>
          </Tooltip>
        );
      case 'free':
        return (
          <Tooltip title={`Free access expires in ${daysRemaining} days`}>
              <Tag color="green" icon={<ExperimentOutlined />}>
                Free, {daysRemaining} Days remaining
              </Tag>
          </Tooltip>
        );
      default:
        return <Tag color="default">Unknown</Tag>;
    }
  };

  return (
    <div className="subscription-status-container">
      {renderSubscriptionTag()}
    </div>
  );
};

export default SubscriptionStatus; 