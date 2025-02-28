import React, { useState, useEffect } from 'react';
import { Layout, Typography, Card, Row, Col, Button, Divider, List, Tag, Alert, Spin } from 'antd';
import { CrownOutlined, CheckCircleOutlined, RocketOutlined, SettingOutlined } from '@ant-design/icons';
import { FetchWithAuth } from '../services/api';
import { useAuth, useUser } from '@clerk/clerk-react';

const { Title, Text, Paragraph } = Typography;
const { Content } = Layout;

interface SubscriptionData {
  user_id: string;
  status: 'free' | 'premium';
  valid_until: string;
  customer_id?: string;
}

// Styles
const styles = {
  container: {
    padding: '24px',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  card: {
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.09)',
    marginBottom: '24px'
  },
  premiumCard: {
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.09)',
    marginBottom: '24px'
  },
  button: {
    width: '100%',
    marginTop: '16px'
  },
  upgradeButton: {
    width: '100%',
    marginTop: '16px',
    background: '#722ed1',
    borderColor: '#722ed1'
  },
  featureItem: {
    padding: '12px 0'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '16px'
  },
  headerIcon: {
    fontSize: '24px',
    marginRight: '8px'
  }
};

const premiumFeatures = [
  'Unlimited projects',
  'Advanced analytics',
  'Priority support',
  'Custom domain',
  'API access',
  'Team collaboration'
];

const freeFeatures = [
  'Up to 3 projects',
  'Basic analytics',
  'Community support',
  'Standard domain'
];

export default function SubscriptionPage() {
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
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!subscription) {
    return (
      <div style={styles.container}>
        <Alert
          message="Error"
          description="Failed to load subscription information. Please try again later."
          type="error"
          showIcon
        />
      </div>
    );
  }

  // Format the expiration date
  const validUntil = new Date(subscription.valid_until);
  const formattedDate = validUntil.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const isPremium = subscription.status === 'premium';
  const userId = user?.id || '';

  return (
    <Content style={styles.container}>
      <div style={styles.header}>
        {isPremium ? (
          <CrownOutlined style={{ ...styles.headerIcon, color: '#faad14' }} />
        ) : (
          <RocketOutlined style={{ ...styles.headerIcon, color: '#52c41a' }} />
        )}
        <Title level={2} style={{ margin: 0 }}>
          Subscription Management
        </Title>
      </div>
      <Paragraph>
        Manage your subscription and access premium features.
      </Paragraph>

      <Row gutter={24}>
        <Col xs={24} md={16}>
          <Card 
            title="Current Subscription" 
            style={styles.card}
          >
            <div>
              <Title level={4}>
                {isPremium ? (
                  <>
                    <Tag color="gold" icon={<CrownOutlined />}>Premium</Tag>
                    Premium Subscription
                  </>
                ) : (
                  <>
                    <Tag color="green" icon={<RocketOutlined />}>Free</Tag>
                    Free Tier
                  </>
                )}
              </Title>
              
              {isPremium ? (
                <>
                  <Paragraph>
                    You have access to all premium features until <strong>{formattedDate}</strong>.
                  </Paragraph>
                  <Button 
                    type="primary" 
                    icon={<SettingOutlined />}
                    href="https://billing.stripe.com/p/login/test_14k3fqcJf5X7fio4gg"
                    target="_blank"
                    style={styles.button}
                  >
                    Manage Subscription
                  </Button>
                </>
              ) : (
                <>
                  <Paragraph>
                    Upgrade to premium to unlock all features and enhance your experience.
                  </Paragraph>
                  <Button 
                    type="primary" 
                    icon={<RocketOutlined />}
                    href={`https://buy.stripe.com/test_28o01hfea2AH012144?client_reference_id=${userId}`}
                    target="_blank"
                    style={styles.upgradeButton}
                  >
                    Upgrade to Premium
                  </Button>
                </>
              )}
            </div>
          </Card>

          {subscription.customer_id && (
            <Card 
              title="Billing Information" 
              style={styles.card}
            >
              <Paragraph>
                Your subscription is managed through Stripe. You can update your payment method, 
                view invoices, and manage your billing information through the Stripe customer portal.
              </Paragraph>
              <Button 
                type="default" 
                href="https://billing.stripe.com/p/login/test_14k3fqcJf5X7fio4gg"
                target="_blank"
              >
                Access Billing Portal
              </Button>
            </Card>
          )}
        </Col>

        <Col xs={24} md={8}>
          <Card 
            title="Subscription Comparison" 
            style={styles.card}
          >
            <div>
              <Title level={5}>
                <Tag color="gold">Premium</Tag>
              </Title>
              <List
                dataSource={premiumFeatures}
                renderItem={item => (
                  <List.Item style={styles.featureItem}>
                    <CheckCircleOutlined style={{ color: '#722ed1', marginRight: '8px' }} />
                    {item}
                  </List.Item>
                )}
              />

              <Divider />

              <Title level={5}>
                <Tag color="green">Free</Tag>
              </Title>
              <List
                dataSource={freeFeatures}
                renderItem={item => (
                  <List.Item style={styles.featureItem}>
                    <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                    {item}
                  </List.Item>
                )}
              />
            </div>
          </Card>
        </Col>
      </Row>
    </Content>
  );
} 