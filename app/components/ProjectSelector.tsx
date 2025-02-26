import React, { useEffect, useState } from 'react';
import { Select } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { FetchWithAuth } from '../services/api';
import { useAuth } from '@clerk/clerk-react';

interface Project {
  id: number;
  url: string;
}

const ProjectSelector: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { id } = useParams();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const data = await FetchWithAuth('/api/project/get', token, {
        method: "GET"
      });
      setProjects(data);
      
      // If no project is selected in URL but we have projects, select the first one
      if (!id && data.length > 0) {
        handleProjectChange(data[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectChange = (projectId: number) => {
    navigate(`/dashboard/project/${projectId}`);
  };

  return (
    <Select
      style={{ width: '100%', marginBottom: 20 }}
      placeholder="Select a project"
      loading={loading}
      value={id ? Number(id) : undefined}
      onChange={handleProjectChange}
      options={projects.map(project => ({
        value: project.id,
        label: project.url
      }))}
    />
  );
};

export default ProjectSelector; 