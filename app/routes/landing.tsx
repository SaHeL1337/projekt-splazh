import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Button, Typography, Layout, Menu, Row, Col, Card, Space, 
  Divider, List, Avatar, Statistic, Collapse, 
  Tag, Tooltip, Badge
} from 'antd';
import { useAuth } from '@clerk/clerk-react';
import { SignInButton } from '@clerk/clerk-react';
import {
  RocketOutlined, CheckCircleOutlined, LockOutlined, 
  GlobalOutlined, BarChartOutlined, TeamOutlined,
  ArrowRightOutlined, QuestionCircleOutlined, 
  GithubOutlined, TwitterOutlined, LinkedinOutlined,
  SafetyOutlined, AlertOutlined, SettingOutlined,
  ClockCircleOutlined, FileSearchOutlined, ApiOutlined,
  UserOutlined, StarOutlined, ThunderboltOutlined,
  SmileOutlined,
  StarFilled
} from '@ant-design/icons';

const { Header, Content, Footer } = Layout;
const { Title, Paragraph, Text } = Typography;
const { Panel } = Collapse;

export default function Landing() {
  const { isSignedIn } = useAuth();

  const features = [
    {
      title: "Automated Crawling",
      description: "Our intelligent crawler automatically scans your website to detect all third-party connections and resources.",
      icon: <GlobalOutlined className="landing-feature-icon" />
    },
    {
      title: "GDPR Compliance Check",
      description: "Get detailed reports about potential GDPR issues on your website with actionable recommendations.",
      icon: <SafetyOutlined className="landing-feature-icon" />
    },
    {
      title: "Real-time Monitoring",
      description: "Monitor your website's compliance status with regular scans and instant notifications.",
      icon: <AlertOutlined className="landing-feature-icon" />
    },
    {
      title: "Detailed Analytics",
      description: "Visualize your compliance progress and identify areas that need improvement.",
      icon: <BarChartOutlined className="landing-feature-icon" />
    },
    {
      title: "Privacy Policy Generator",
      description: "Create compliant privacy policies based on the resources detected on your website.",
      icon: <FileSearchOutlined className="landing-feature-icon" />
    },
    {
      title: "API Integration",
      description: "Integrate compliance checks into your development workflow with our robust API.",
      icon: <ApiOutlined className="landing-feature-icon" />
    }
  ];

  const howItWorks = [
    {
      title: "Add Your Website",
      description: "Enter your website URL and let us know which pages to scan.",
      icon: <GlobalOutlined style={{ fontSize: 48, color: '#1890ff' }} />
    },
    {
      title: "Automated Scan",
      description: "Our crawler analyzes your website to detect third-party resources and potential GDPR issues.",
      icon: <RocketOutlined style={{ fontSize: 48, color: '#1890ff' }} />
    },
    {
      title: "Review Results",
      description: "Get a detailed report with actionable insights about your website's compliance status.",
      icon: <FileSearchOutlined style={{ fontSize: 48, color: '#1890ff' }} />
    },
    {
      title: "Implement Changes",
      description: "Follow our recommendations to improve your website's GDPR compliance.",
      icon: <SettingOutlined style={{ fontSize: 48, color: '#1890ff' }} />
    }
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "CTO, TechStart Inc.",
      content: "Projekt-Splazh has been a game-changer for our compliance workflow. We've reduced our manual audit time by 80%.",
      avatar: "https://randomuser.me/api/portraits/women/44.jpg"
    },
    {
      name: "Michael Chen",
      role: "Privacy Officer, DataSecure",
      content: "The automated scanning and detailed reports have made GDPR compliance so much easier to manage across our client websites.",
      avatar: "https://randomuser.me/api/portraits/men/46.jpg"
    },
    {
      name: "Emma Williams",
      role: "Web Developer, CreativeAgency",
      content: "As a developer, I appreciate how Projekt-Splazh integrates into our workflow. The API is straightforward and the reports are actionable.",
      avatar: "https://randomuser.me/api/portraits/women/63.jpg"
    }
  ];

  const faqs = [
    {
      question: "How does Projekt-Splazh detect third-party resources?",
      answer: "Our advanced crawler technology scans your website pages, analyzing all network requests, scripts, cookies, and other resources to identify third-party connections that might have privacy implications."
    },
    {
      question: "Is Projekt-Splazh compliant with the latest GDPR regulations?",
      answer: "Yes, we continuously update our compliance rules to reflect the latest GDPR regulations and guidelines from data protection authorities across Europe."
    },
    {
      question: "Can I scan multiple websites with one account?",
      answer: "Yes, you can monitor multiple websites from a single dashboard with your subscription."
    },
    {
      question: "How often should I scan my website?",
      answer: "We recommend regular scans, especially after making changes to your website. Your subscription includes automated scheduled scans."
    },
    {
      question: "Does Projekt-Splazh help with cookie consent management?",
      answer: "While we don't provide a cookie consent banner solution, we do identify all cookies on your website and classify them to help you implement proper consent mechanisms."
    }
  ];

  const screenshots = [
    {
      image: "/screenshot1.png",
      title: "Projects List",
      description: "Manage all your website projects in one convenient location"
    },
    {
      image: "/screenshot2.png",
      title: "Comprehensive Dashboard",
      description: "Get a complete overview of your website's compliance status"
    }
  ];

  return (
    <Layout className="landing-layout">
      {/* Modern Sticky Header */}
      <Header className="landing-header">
        <div className="landing-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
          <div className="landing-logo">
            Projekt-Splazh
          </div>
          <Menu
            mode="horizontal"
            style={{ flex: 1, justifyContent: 'flex-end', minWidth: 0, border: 'none', background: 'transparent' }}
            items={[
              { key: 'features', label: <a href="#features">Features</a> },
              { key: 'how-it-works', label: <a href="#how-it-works">How It Works</a> },
              { key: 'pricing', label: <a href="#pricing">Pricing</a> },
              { key: 'login', label: isSignedIn ? (
                <Link to="/projects">
                  <Button type="primary" shape="round" icon={<ArrowRightOutlined />}>
                    Dashboard
                  </Button>
                </Link>
              ) : (
                <SignInButton mode="modal">
                  <Button type="primary" shape="round" style={{ marginLeft: '8px' }}>
                    Login
                  </Button>
                </SignInButton>
              )}
            ]}
          />
        </div>
      </Header>

      <Content>
        {/* Hero Section */}
        <div className="landing-hero">
          <div className="landing-container">
            <Row justify="center" align="middle">
              <Col xs={24} md={16}>
                <Title style={{ color: 'white', marginBottom: '24px', fontSize: '48px' }}>
                  Simplify GDPR Compliance For Your Website
                </Title>
                <Paragraph style={{ fontSize: '20px', color: 'white', marginBottom: '32px' }}>
                  Automatically detect third-party resources, cookies, and tracking scripts to ensure your website is GDPR compliant.
                </Paragraph>
                <Space size="large" align="center">
                  <SignInButton mode="modal">
                    <Button type="primary" size="large" className="landing-cta-button">
                      Start Now
                    </Button>
                  </SignInButton>
                </Space>
              </Col>
            </Row>
          </div>
        </div>

        {/* Features Section - Moved up */}
        <div id="features" className="landing-section landing-section-alt">
          <div className="landing-container">
            <Title level={2} className="landing-section-title">
              Key Features
            </Title>
            
            <Row gutter={[32, 32]} justify="center">
              {features.map((feature, index) => (
                <Col xs={24} sm={12} lg={8} key={index}>
                  <Card className="landing-feature-card" hoverable>
                    {feature.icon}
                    <Title level={4}>{feature.title}</Title>
                    <Paragraph>{feature.description}</Paragraph>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        </div>

        {/* Stats Section - Toned down */}
        <div style={{ 
          padding: '40px 0', 
          background: '#f9f9f9',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          marginBottom: '40px'
        }}>
          <div className="landing-container">
            <Row gutter={[48, 24]} justify="center">
              <Col xs={24} sm={8}>
                <Card bordered={false} style={{ 
                  textAlign: 'center', 
                  height: '100%',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  background: 'white'
                }}>
                  <Statistic 
                    title={<span style={{ fontSize: '18px', fontWeight: 'bold' }}>Websites Protected</span>}
                    value={5000} 
                    prefix={<SafetyOutlined />} 
                    valueStyle={{ fontWeight: 'bold', fontSize: '36px' }}
                  />
                  <Paragraph style={{ marginTop: '8px' }}>and counting...</Paragraph>
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card bordered={false} style={{ 
                  textAlign: 'center', 
                  height: '100%',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  background: 'white'
                }}>
                  <Statistic 
                    title={<span style={{ fontSize: '18px', fontWeight: 'bold' }}>GDPR Issues Detected</span>}
                    value={1.2} 
                    suffix="M" 
                    prefix={<AlertOutlined />}
                    valueStyle={{ fontWeight: 'bold', fontSize: '36px' }}
                  />
                  <Paragraph style={{ marginTop: '8px' }}>before they became fines</Paragraph>
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card bordered={false} style={{ 
                  textAlign: 'center', 
                  height: '100%',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  background: 'white'
                }}>
                  <Statistic 
                    title={<span style={{ fontSize: '18px', fontWeight: 'bold' }}>Privacy Officers' Sanity</span>}
                    value={100} 
                    suffix="%" 
                    prefix={<SmileOutlined />}
                    valueStyle={{ fontWeight: 'bold', fontSize: '36px' }}
                  />
                  <Paragraph style={{ marginTop: '8px' }}>preserved by automation</Paragraph>
                </Card>
              </Col>
            </Row>
          </div>
        </div>

        {/* How It Works Section */}
        <div id="how-it-works" className="landing-section">
          <div className="landing-container">
            <Title level={2} className="landing-section-title">
              How It Works
            </Title>
            
            <Row gutter={[32, 48]} justify="center">
              {howItWorks.map((step, index) => (
                <Col xs={24} sm={12} md={6} key={index} className="landing-how-it-works-step">
                  <Badge count={index + 1} style={{ backgroundColor: '#1890ff', marginBottom: '16px' }}>
                    {step.icon}
                  </Badge>
                  <Title level={4}>{step.title}</Title>
                  <Paragraph>{step.description}</Paragraph>
                </Col>
              ))}
            </Row>
          </div>
        </div>

        {/* Screenshots Section - Static Version */}
        <div id="screenshots" className="landing-section landing-section-alt">
          <div className="landing-container">
            <Title level={2} className="landing-section-title">
              See Projekt-Splazh in Action
            </Title>
            
            <Row gutter={[32, 48]} justify="center">
              {screenshots.map((screenshot, index) => (
                <Col xs={24} md={8} key={index}>
                  <Card 
                    hoverable 
                    cover={
                      <div style={{ height: '220px', overflow: 'hidden' }}>
                        <img 
                          alt={screenshot.title} 
                          src={screenshot.image} 
                          style={{ 
                            borderRadius: '8px 8px 0 0',
                            width: '100%',
                            height: '220px',
                            objectFit: 'cover',
                            objectPosition: 'top'
                          }}
                        />
                      </div>
                    }
                    style={{ 
                      borderRadius: '8px',
                      overflow: 'hidden',
                      height: '100%',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                  >
                    <Card.Meta
                      title={screenshot.title}
                      description={screenshot.description}
                    />
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        </div>

        {/* Testimonials Section */}
        <div className="landing-section">
          <div className="landing-container">
            <Title level={2} className="landing-section-title">
              What Our Customers Say
            </Title>
            
            <Row gutter={[32, 32]} justify="center">
              {testimonials.map((testimonial, index) => (
                <Col xs={24} md={8} key={index}>
                  <Card className="landing-testimonial-card">
                    <div style={{ textAlign: 'center' }}>
                      <Avatar 
                        size={80} 
                        src={testimonial.avatar} 
                        className="landing-testimonial-avatar"
                      />
                      <Title level={4}>{testimonial.name}</Title>
                      <Text type="secondary">{testimonial.role}</Text>
                      <Divider />
                      <Paragraph style={{ fontSize: '16px' }}>
                        <Text italic>"{testimonial.content}"</Text>
                      </Paragraph>
                      <div>
                        {[1, 2, 3, 4, 5].map(star => (
                          <StarFilled key={star} style={{ color: '#faad14', fontSize: '18px', margin: '0 2px' }} />
                        ))}
                      </div>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        </div>

        {/* Single Pricing Option */}
        <div id="pricing" className="landing-section landing-section-alt">
          <div className="landing-container">
            <Title level={2} className="landing-section-title">
              Simple, Transparent Pricing
            </Title>
            
            <Row justify="center">
              <Col xs={24} sm={20} md={16} lg={12}>
                <Card 
                  bordered={true}
                  style={{ 
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: '0 8px 24px rgba(24,144,255,0.15)',
                    textAlign: 'center',
                    position: 'relative',
                    paddingTop: '12px'
                  }}
                >
                  <div style={{ position: 'absolute', top: 0, right: 0 }}>
                    <Badge.Ribbon text="All Features Included" color="#1890ff" />
                  </div>
                  
                  <Title level={2} style={{ marginTop: '24px', marginBottom: '8px' }}>Professional Plan</Title>
                  
                  <div style={{ margin: '24px 0' }}>
                    <span style={{ fontSize: '64px', fontWeight: 'bold', color: '#1890ff' }}>$29</span>
                    <span style={{ fontSize: '20px', color: '#666' }}>/month</span>
                  </div>
                  
                  <Tag color="blue" style={{ fontSize: '16px', padding: '4px 12px', marginBottom: '24px' }}>
                    Monthly billing, cancel anytime
                  </Tag>
                  
                  <Divider style={{ margin: '24px 0' }} />
                  
                  <List
                    grid={{ gutter: 16, column: 2 }}
                    dataSource={[
                      'Unlimited websites',
                      'Daily scans',
                      'Advanced reporting',
                      'API access',
                      'Priority support',
                      'Cookie consent recommendations',
                      'Custom scan schedules',
                      'Email notifications',
                      'White-label reports',
                      'Team collaboration tools'
                    ]}
                    renderItem={item => (
                      <List.Item>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '18px', marginRight: '8px' }} />
                          <span>{item}</span>
                        </div>
                      </List.Item>
                    )}
                    style={{ textAlign: 'left', marginBottom: '32px' }}
                  />
                  
                  <SignInButton mode="modal">
                    <Button 
                      type="primary" 
                      size="large" 
                      style={{ 
                        height: '50px', 
                        fontSize: '18px', 
                        padding: '0 40px',
                        borderRadius: '25px',
                        margin: '0 auto'
                      }}
                    >
                      Subscribe Now
                    </Button>
                  </SignInButton>
                </Card>
              </Col>
            </Row>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="landing-section">
          <div className="landing-container">
            <Title level={2} className="landing-section-title">
              Frequently Asked Questions
            </Title>
            
            <Collapse 
              className="landing-faq-collapse" 
              expandIconPosition="end"
              bordered={false}
            >
              {faqs.map((faq, index) => (
                <Panel 
                  header={<span style={{ fontSize: '16px', fontWeight: 500 }}>{faq.question}</span>} 
                  key={index}
                >
                  <Paragraph>{faq.answer}</Paragraph>
                </Panel>
              ))}
            </Collapse>
          </div>
        </div>

        {/* CTA Section */}
        <div className="landing-cta">
          <div className="landing-container">
            <Title level={2} style={{ color: 'white', marginBottom: '24px' }}>
              Ready to Simplify Your GDPR Compliance?
            </Title>
            <Paragraph style={{ fontSize: '18px', color: 'white', maxWidth: '800px', margin: '0 auto 40px' }}>
              Join thousands of businesses that trust Projekt-Splazh for their privacy compliance needs.
            </Paragraph>
            <SignInButton mode="modal">
              <Button type="primary" size="large" className="landing-cta-button">
                Subscribe Now
              </Button>
            </SignInButton>
          </div>
        </div>
      </Content>

      {/* Footer */}
      <Footer className="landing-footer">
        <div className="landing-container">
          <Row gutter={[48, 32]}>
            <Col xs={24} md={8}>
              <div className="landing-footer-logo">
                Projekt-Splazh
              </div>
              <Paragraph style={{ color: 'rgba(255,255,255,0.65)' }}>
                Automated GDPR compliance monitoring for your websites. Detect third-party resources and ensure privacy compliance with ease.
              </Paragraph>
              <Space>
                <Button type="text" icon={<TwitterOutlined />} style={{ color: 'rgba(255,255,255,0.65)' }} />
                <Button type="text" icon={<GithubOutlined />} style={{ color: 'rgba(255,255,255,0.65)' }} />
                <Button type="text" icon={<LinkedinOutlined />} style={{ color: 'rgba(255,255,255,0.65)' }} />
              </Space>
            </Col>
            
            <Col xs={24} md={16}>
              <Row gutter={[48, 32]}>
                <Col xs={24} sm={8}>
                  <Title level={5} style={{ color: 'white', marginBottom: '24px' }}>Product</Title>
                  <ul className="landing-footer-links">
                    <li className="landing-footer-link"><a href="#features">Features</a></li>
                    <li className="landing-footer-link"><a href="#pricing">Pricing</a></li>
                    <li className="landing-footer-link"><Link to="/projects">Dashboard</Link></li>
                  </ul>
                </Col>
                
                <Col xs={24} sm={8}>
                  <Title level={5} style={{ color: 'white', marginBottom: '24px' }}>Resources</Title>
                  <ul className="landing-footer-links">
                    <li className="landing-footer-link"><a href="#">Documentation</a></li>
                    <li className="landing-footer-link"><a href="#">API Reference</a></li>
                    <li className="landing-footer-link"><a href="#">Blog</a></li>
                  </ul>
                </Col>
                
                <Col xs={24} sm={8}>
                  <Title level={5} style={{ color: 'white', marginBottom: '24px' }}>Company</Title>
                  <ul className="landing-footer-links">
                    <li className="landing-footer-link"><a href="#">About Us</a></li>
                    <li className="landing-footer-link"><a href="#">Contact</a></li>
                    <li className="landing-footer-link"><a href="#">Privacy Policy</a></li>
                  </ul>
                </Col>
              </Row>
            </Col>
          </Row>
          
          <Divider style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '40px 0 20px' }} />
          
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.45)' }}>
            Projekt-Splazh ©{new Date().getFullYear()} - GDPR Compliance Made Easy
          </div>
        </div>
      </Footer>
    </Layout>
  );
}

export function meta() {
  return [
    { title: "Projekt-Splazh - GDPR Compliance Tool" },
    { name: "description", content: "Automatically detect and monitor third-party resources for GDPR compliance" },
  ];
} 