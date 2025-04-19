import React, { useEffect, useState } from 'react';
import { Select, Typography, Space, Spin, Button, Card, Divider, Tooltip, Badge, Input, Avatar } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { FetchWithAuth } from '../services/api';
import { useAuth } from '@clerk/clerk-react';
import { ProjectOutlined, GlobalOutlined, PlusOutlined, LoadingOutlined, SearchOutlined } from '@ant-design/icons';

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

// Function to get domain color based on URL
const getDomainColor = (url: string): string => {
  // A list of colors to choose from
  const colors = [
    '#1890ff', // Blue
    '#52c41a', // Green
    '#722ed1', // Purple
    '#fa8c16', // Orange
    '#eb2f96', // Pink
    '#faad14', // Gold
    '#13c2c2', // Cyan
  ];
  
  // Simple hash function to determine color based on domain
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    hash = url.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Use the hash to pick a color
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

// Get domain from URL
const getDomain = (url: string): string => {
  try {
    if (!url.includes('://')) {
      url = 'https://' + url;
    }
    return new URL(url).hostname;
  } catch (e) {
    return url;
  }
};

// Get initials from domain
const getInitials = (domain: string): string => {
  const parts = domain.split('.');
  if (parts.length >= 2) {
    return parts[parts.length - 2].charAt(0).toUpperCase();
  }
  return domain.charAt(0).toUpperCase();
};

const ProjectSelector: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hovered, setHovered] = useState(false);
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { id } = useParams();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);
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
      setError("Failed to load projects. Please try again.");
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
  const selectOptions: SelectOption[] = projects.map(project => {
    const domain = getDomain(project.url);
    const color = getDomainColor(project.url);
    const initial = getInitials(domain);
    
    return {
      value: project.id,
      label: (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center',
          padding: '8px 0',
          gap: '12px'
        }}>
          <Avatar 
            style={{ 
              backgroundColor: color,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
            size="small"
          >
            {initial}
          </Avatar>
          <Text style={{ 
            fontSize: '14px', 
            lineHeight: '20px'
          }}>{project.url}</Text>
        </div>
      )
    };
  });
  
  // Add a "Create Project" option at the end
  const createNewOption: CreateNewOption = {
    value: 'create_new',
    label: (
      <div style={{ 
        display: 'flex',
        alignItems: 'center',
        padding: '8px 0',
        gap: '12px'
      }}>
        <Avatar 
          style={{ 
            backgroundColor: '#f0f0f0',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
          size="small"
        >
          <PlusOutlined style={{ color: '#1890ff' }} />
        </Avatar>
        <Text style={{ 
          color: '#1890ff', 
          fontSize: '14px',
          lineHeight: '20px'
        }}>Create New Project</Text>
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

  // Get current selected project
  const getCurrentProject = (): Project | undefined => {
    if (!id || id === 'create_new') return undefined;
    const projectId = Number(id);
    return projects.find(p => p.id === projectId);
  };

  const currentProject = getCurrentProject();
  const domain = currentProject ? getDomain(currentProject.url) : '';
  const initial = currentProject ? getInitials(domain) : '';
  const color = currentProject ? getDomainColor(currentProject.url) : '';

  return (
    <Card 
      style={{ 
        borderRadius: '12px', 
        marginBottom: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}
      bodyStyle={{ padding: '16px' }}
      bordered={false}
    >
      <div style={{ marginBottom: '12px' }}>
        <Text 
          style={{ 
            fontSize: '14px', 
            color: '#8c8c8c',
            display: 'block',
            marginBottom: '4px'
          }}
        >
          PROJECT
        </Text>
      </div>
      
      <div style={{ position: 'relative' }}>
        {error && (
          <div style={{ marginBottom: '8px' }}>
            <Text type="danger">{error}</Text>
            <Button 
              type="link" 
              onClick={fetchProjects} 
              size="small"
              style={{ padding: '0 4px' }}
            >
              Retry
            </Button>
          </div>
        )}
        
        {loading ? (
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              height: '48px', 
              padding: '0 12px',
              border: '1px solid #d9d9d9',
              borderRadius: '8px',
              gap: '12px'
            }}
          >
            <Spin indicator={<LoadingOutlined style={{ fontSize: 16 }} spin />} />
            <Text type="secondary">Loading projects...</Text>
          </div>
        ) : (
          currentProject ? (
            <div 
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                height: '48px', 
                padding: '0 12px',
                border: `1px solid ${hovered ? '#1890ff' : '#d9d9d9'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                position: 'relative',
                transition: 'all 0.3s ease',
                gap: '12px',
                backgroundColor: '#fff'
              }}
              role="button"
              aria-haspopup="listbox"
            >
              <Avatar 
                style={{ 
                  backgroundColor: color,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
                size="small"
              >
                {initial}
              </Avatar>
              <Text ellipsis style={{ flex: 1, lineHeight: '48px' }}>{currentProject.url}</Text>
              <div style={{ marginLeft: 'auto' }}>
                <svg 
                  viewBox="0 0 24 24" 
                  width="16" 
                  height="16" 
                  fill="currentColor" 
                  style={{ color: '#8c8c8c' }}
                >
                  <path d="M7 10l5 5 5-5z" />
                </svg>
              </div>
              
              <Select
                style={{ 
                  width: '100%',
                  height: '100%',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  opacity: 0,
                  cursor: 'pointer'
                }}
                value={getCurrentValue()}
                onChange={(value) => {
                  if (value === 'create_new') {
                    handleCreateProject();
                  } else if (typeof value === 'number') {
                    handleProjectChange(value);
                  }
                }}
                options={selectOptions}
                dropdownStyle={{ 
                  borderRadius: '8px', 
                  padding: '8px 0',
                  boxShadow: '0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 6px 16px 0 rgba(0, 0, 0, 0.08)'
                }}
                optionLabelProp="label"
                optionFilterProp="label"
                showSearch
                listHeight={350}
                disabled={loading}
                filterOption={(input, option) => {
                  if (!option) return false;
                  
                  if (option.value === 'create_new') 
                    return input.toLowerCase().includes('new') || input.toLowerCase().includes('create');
                  
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
          ) : (
            <Select
              style={{ 
                width: '100%'
              }}
              placeholder="Select a project..."
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
              listHeight={350}
              disabled={loading}
              filterOption={(input, option) => {
                if (!option) return false;
                
                if (option.value === 'create_new') 
                  return input.toLowerCase().includes('new') || input.toLowerCase().includes('create');
                
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
          )
        )}
        
        {!loading && projects.length > 0 && (
          <div style={{ marginTop: '8px', textAlign: 'right' }}>
            <Button 
              type="link" 
              size="small" 
              onClick={handleCreateProject}
              icon={<PlusOutlined />}
              style={{ padding: '4px 0' }}
            >
              Add another project
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ProjectSelector; 