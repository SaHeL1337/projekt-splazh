import React, { useState, useEffect } from 'react';
import { Tag, Tooltip } from 'antd';
import { CrownOutlined, HourglassOutlined } from '@ant-design/icons';

// This will be replaced with actual API call in the future
const fetchSubscriptionStatus = async (): Promise<'Premium' | 'Trial'> => {
  // Dummy implementation - will be replaced with fetchWithAuth call
  return new Promise((resolve) => {
    setTimeout(() => {
      // Randomly return Premium or Trial for demonstration
      resolve(Math.random() > 0.5 ? 'Premium' : 'Trial');
    }, 500);
  });
};

const SubscriptionStatus: React.FC = () => {
  const [status, setStatus] = useState<'Premium' | 'Trial' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getStatus = async () => {
      try {
        const result = await fetchSubscriptionStatus();
        setStatus(result);
      } catch (error) {
        console.error('Failed to fetch subscription status:', error);
      } finally {
        setLoading(false);
      }
    };

    getStatus();
  }, []);

  if (loading) {
    return <Tag color="default">Loading...</Tag>;
  }

  if (status === 'Premium') {
    return (
      <Tooltip title="Premium Subscription">
        <Tag color="gold" icon={<CrownOutlined />}>
          Premium
        </Tag>
      </Tooltip>
    );
  }

  return (
    <Tooltip title="Trial Subscription">
      <Tag color="blue" icon={<HourglassOutlined />}>
        Trial
      </Tag>
    </Tooltip>
  );
};

export default SubscriptionStatus; 