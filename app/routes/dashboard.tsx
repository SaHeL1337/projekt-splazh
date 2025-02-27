import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Dashboard from '../components/Dashboard';
import ProjectSelector from '../components/ProjectSelector';
import { Card } from 'antd';
import type { Route } from "./+types/dashboard";
import { useAuth } from '@clerk/clerk-react';

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
    <div>
      <Card style={{ marginBottom: 20 }}>
        <ProjectSelector />
      </Card>
      <Dashboard />
    </div>
  );
}
