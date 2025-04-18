import React, { useEffect, useState } from 'react';
import { Select, Typography, Space, Spin, Button, Card, Divider } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { FetchWithAuth } from '../services/api';
import { useAuth } from '@clerk/clerk-react';
import { ProjectOutlined, GlobalOutlined, PlusOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

interface Project {
  id: number;
  url: string;
}

// Create two separate option types instead of trying to use a union type
type ProjectOption = {
  value: number;
  label: React.ReactNode;
};

type CreateNewOption = {
  value: 'create_new';
  label: React.ReactNode;
};

type SelectOption = ProjectOption | CreateNewOption;

// Type guard to check if an option is a project
function isProjectOption(option: SelectOption): option is ProjectOption {
  return typeof option.value === 'number';
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
      const data = await FetchWithAuth('/api/projects', token, {
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
  
  const handleCreateProject = () => {
    navigate('/projects');
  };

  // Format the select options to show icons and better formatting
  const selectOptions: SelectOption[] = projects.map(project => ({
    value: project.id,
    label: (
      <Space>
        <GlobalOutlined style={{ color: '#1890ff' }} />
        <Text ellipsis style={{ maxWidth: 400 }}>{project.url}</Text>
      </Space>
    )
  }));
  
  // Add a "Create Project" option at the end
  const createNewOption: CreateNewOption = {
    value: 'create_new',
    label: (
      <div style={{ color: '#1890ff', padding: '4px 0' }}>
        <PlusOutlined /> Create New Project
      </div>
    )
  };
  
  selectOptions.push(createNewOption);

  // Get the current selected value as string or number
  const getCurrentValue = (): string | number | undefined => {
    if (!id) return undefined;
    if (id === 'create_new') return 'create_new';
    return Number(id);
  };

  return (
    <div>
      <Title level={5} style={{ margin: '0 0 16px 0', fontSize: '16px' }}>
        Select a project to view its dashboard and crawl results
      </Title>
      
      <Select
        style={{ 
          width: '100%', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}
        placeholder={
          loading ? (
            <Space>
              <Spin size="small" spinning={true} />
              <span>Loading projects...</span>
            </Space>
          ) : (
            "Select a project..."
          )
        }
        loading={loading}
        value={getCurrentValue()}
        onChange={(value) => {
          if (value === 'create_new') {
            handleCreateProject();
          } else if (typeof value === 'number') {
            handleProjectChange(value);
          }
        }}
        options={selectOptions}
        size="large"
        dropdownStyle={{ 
          borderRadius: '8px', 
          padding: '8px 0',
          boxShadow: '0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 6px 16px 0 rgba(0, 0, 0, 0.08)'
        }}
        optionLabelProp="label"
        optionFilterProp="label"
        showSearch
        filterOption={(input, option) => {
          if (!option) return false;
          
          if (option.value === 'create_new') 
            return input.includes('new') || input.includes('create');
          
          const projectId = option.value as number;
          const projectUrl = projects.find(p => p.id === projectId)?.url;
          return projectUrl ? projectUrl.toLowerCase().includes(input.toLowerCase()) : false;
        }}
        notFoundContent={
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <Text type="secondary">No projects found</Text>
            <div style={{ marginTop: '12px' }}>
              <Button 
                type="primary" 
                size="small" 
                icon={<PlusOutlined />}
                onClick={handleCreateProject}
              >
                Create a project
              </Button>
            </div>
          </div>
        }
      />
    </div>
  );
};

export default ProjectSelector; 