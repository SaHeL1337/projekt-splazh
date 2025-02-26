import React from 'react';
import { useParams } from 'react-router-dom';
import Dashboard from '../components/Dashboard';
import ProjectSelector from '../components/ProjectSelector';
import { Card } from 'antd';
import type { Route } from "./+types/dashboard";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Project Dashboard" },
    { name: "description", content: "Monitor your project crawl status" },
  ];
}

export default function DashboardPage() {
  const { id } = useParams();

  return (
    <div>
      <Card style={{ marginBottom: 20 }}>
        <ProjectSelector />
      </Card>
      <Dashboard />
    </div>
  );
}
