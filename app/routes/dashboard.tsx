import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Dashboard from '../components/Dashboard';
import { Typography } from 'antd';
import type { Route } from "./+types/dashboard";
import { useAuth } from '@clerk/clerk-react';
import { DashboardOutlined } from '@ant-design/icons';

const { Title } = Typography;

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
    
    // Redirect to projects page if no project id is provided
    if (isLoaded && isSignedIn && !id) {
      navigate('/projects');
    }
  }, [isLoaded, isSignedIn, navigate, id]);

  return (
    <>
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
      
      <Dashboard />
    </>
  );
}
