import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Dashboard from '../components/Dashboard';
import ProjectSelector from '../components/ProjectSelector';
import { Card, Typography, Layout, Space, Divider } from 'antd';
import type { Route } from "./+types/dashboard";
import { useAuth } from '@clerk/clerk-react';
import { DashboardOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Content } = Layout;

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Project Dashboard" },
    { name: "description", content: "Monitor your project crawl status" },
  ];
}

export default function DashboardPage() {
  const { id } = useParams();
  const { isLoaded, isSignedIn } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    // Redirect to landing page if not authenticated
    if (isLoaded && !isSignedIn) {
      navigate('/');
    }
  }, [isLoaded, isSignedIn, navigate]);

  return (
    <Layout style={{ 
      minHeight: '100vh', 
      background: '#f5f7fa'
    }}>
      <Content style={{ 
        padding: '24px',
        maxWidth: '1400px',
        margin: '0 auto',
        width: '100%'
      }}>
        <div style={{ 
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center'
        }}>
          <DashboardOutlined style={{ 
            fontSize: '24px', 
            marginRight: '12px',
            color: '#1890ff'
          }} />
          <Title 
            level={4} 
            style={{ 
              margin: 0,
              fontWeight: 600
            }}
          >
            Project Dashboard
          </Title>
        </div>
        
        <Card 
          className="shadow-sm" 
          style={{ 
            marginBottom: '24px',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text type="secondary">
              Select a project to view its dashboard and crawl results
            </Text>
            <Divider style={{ margin: '12px 0' }} />
            <ProjectSelector />
          </Space>
        </Card>
        
        <Dashboard />
      </Content>
    </Layout>
  );
}
