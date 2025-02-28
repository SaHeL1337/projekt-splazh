import React, { useState, useEffect } from 'react';
import { Tag, Tooltip, Button, Space, Typography, Card } from 'antd';
import { CrownOutlined, ExperimentOutlined, SettingOutlined, RocketOutlined } from '@ant-design/icons';
import { FetchWithAuth } from '../services/api';
import { useAuth, useUser } from '@clerk/clerk-react';

const { Text } = Typography;

interface SubscriptionData {
  user_id: string;
  status: 'free' | 'premium';
  valid_until: string;
}

// Styles
const styles = {
  container: {
    margin: '16px 0'
  },
  card: {
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.09)',
    background: '#fafafa'
  },
  button: {
    width: '100%'
  },
  upgradeButton: {
    width: '100%',
    background: '#722ed1',
    borderColor: '#722ed1'
  }
};

const SubscriptionStatus: React.FC = () => {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const { getToken } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    const getSubscriptionStatus = async () => {
      try {
        const token = await getToken();
        const result = await FetchWithAuth('/api/subscription', token, {
          method: "GET"
        });
        setSubscription(result);
        
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

  // Calculate days remaining until subscription expires
  const validUntil = new Date(subscription.valid_until);
  const today = new Date();
  const daysRemaining = Math.ceil((validUntil.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  // Format the expiration date
  const formattedDate = validUntil.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

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
      case 'free':
        return (
          <Tooltip title="Free Tier">
            <Tag color="green" icon={<ExperimentOutlined />}>
              Free
            </Tag>
          </Tooltip>
        );
      default:
        return <Tag color="default">Unknown</Tag>;
    }
  };

  const renderSubscriptionManagement = () => {
    const userId = user?.id || '';
    
    if (subscription.status === 'premium') {
      return (
        <Card style={styles.card} bordered={false}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Space>
                {renderSubscriptionTag()}
                <Text strong>Premium Subscription</Text>
              </Space>
            </div>
            
            <Text type="secondary">
              Your premium subscription is active until {formattedDate}.
            </Text>
            
            <Button 
              type="primary" 
              icon={<SettingOutlined />}
              href="https://billing.stripe.com/p/login/test_14k3fqcJf5X7fio4gg"
              target="_blank"
              style={styles.button}
            >
              Manage Subscription
            </Button>
          </Space>
        </Card>
      );
    } else {
      // Free tier
      return (
        <Card style={styles.card} bordered={false}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Space>
                {renderSubscriptionTag()}
                <Text strong>Free Tier</Text>
              </Space>
            </div>
            
            <Text type="secondary">
              Upgrade to premium for unlimited access to all features.
            </Text>
            
            <Button 
              type="primary" 
              icon={<RocketOutlined />}
              href={`https://buy.stripe.com/test_28o01hfea2AH012144?client_reference_id=${userId}`}
              target="_blank"
              style={styles.upgradeButton}
            >
              Upgrade to Premium
            </Button>
          </Space>
        </Card>
      );
    }
  };

  return (
    <div style={styles.container}>
      {renderSubscriptionManagement()}
    </div>
  );
};

export default SubscriptionStatus; 