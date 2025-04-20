import type { Route } from "./+types/projects";
import { useEffect, useState, useCallback } from 'react';
import { Table, Row, Col, Form, Input, Button, Space, Card, message, Tooltip } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { InfoCircleOutlined, CheckCircleOutlined, DashboardOutlined, ClockCircleOutlined } from '@ant-design/icons';

import { FetchWithAuth } from '../services/api'

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Project Management" },
    { name: "description", content: "Manage your projects" },
  ];
}

interface Project {
  id: number;
  userid: string;
  url: string;
  lastcrawl?: string;
}

const layout = {
  labelCol: { span: 4 },
  wrapperCol: { span: 17 },
};

const tailLayout = {
  wrapperCol: { offset: 4 },
};

// URL validation rules - updated to allow trailing slash
const urlPattern = /^(https?:\/\/)[a-zA-Z0-9][-a-zA-Z0-9.]*\.[a-zA-Z]{2,}\/?$/;
const MAX_URL_LENGTH = 100;

const validateUrl = (url: string) => {
  if (!url) return false;
  if (url.length > MAX_URL_LENGTH) return false;
  if (!urlPattern.test(url)) return false;
  
  try {
    // Allow trailing slash but no other paths
    const urlObj = new URL(url);
    if (urlObj.pathname !== '/' && urlObj.pathname !== '') return false;
    
    // No query parameters
    if (urlObj.search !== '') return false;
    
    return true;
  } catch (e) {
    return false;
  }
};

// Helper function to format relative time
const getRelativeTime = (timestamp: string): string => {
  if (!timestamp) return "Not crawled yet";
  
  const now = new Date();
  const crawlTime = new Date(timestamp);
  
  // Calculate time difference in milliseconds
  const diffMs = now.getTime() - crawlTime.getTime();
  
  // Convert to seconds, minutes, hours, days
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  // Format the relative time string
  if (diffDays > 0) {
    return diffDays === 1 ? "1 day ago" : `${diffDays} days ago`;
  } else if (diffHours > 0) {
    return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
  } else if (diffMinutes > 0) {
    return diffMinutes === 1 ? "1 minute ago" : `${diffMinutes} minutes ago`;
  } else {
    return diffSeconds <= 10 ? "just now" : `${diffSeconds} seconds ago`;
  }
};

export default function Projects({ loaderData }: Route.ComponentProps) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [tableLoading, setTableLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingUrl, setEditingUrl] = useState<string>('');
  const [editingUrlValid, setEditingUrlValid] = useState<boolean>(true);
  const [newUrlValid, setNewUrlValid] = useState<boolean>(false);
  const [formSubmitted, setFormSubmitted] = useState<boolean>(false);

  // Use useCallback to memoize the fetchProjects function
  const fetchProjects = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;
    
    try {
      setTableLoading(true);
      const token = await getToken();
      const data = await FetchWithAuth('/api/projects', token, {
        method: "GET"
      });
      
      // Transform API data to match table data structure
      const formattedProjects = data.map((project: Project) => ({
        key: project.id.toString(),
        id: project.id,
        url: project.url,
        lastCrawl: project.lastcrawl || "Not crawled yet",
        lastCrawlRaw: project.lastcrawl || null, // Keep the raw timestamp for tooltip
      }));
      
      setProjects(formattedProjects);
      console.log("Projects fetched:", formattedProjects);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    } finally {
      setTableLoading(false);
    }
  }, [isLoaded, isSignedIn, getToken]);
  
  useEffect(() => {
    // Redirect to landing page if not authenticated
    if (isLoaded && !isSignedIn) {
      navigate('/');
    }
    
    // Only fetch projects if authenticated
    if (isLoaded && isSignedIn) {
      fetchProjects();
    }
  }, [isLoaded, isSignedIn, navigate]);

  const handleDelete = async (id: number) => {
    try {
      setDeletingId(id);
      const token = await getToken();
      await FetchWithAuth(`/api/project`, token, {
        method: "DELETE",
        body: JSON.stringify({ Id: id }),
      });
      await fetchProjects(); 
    } catch (error) {
      console.error("Failed to delete project:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleUpdate = async (id: number) => {
    if (editingId === id) {
      // Validate URL before saving
      if (!validateUrl(editingUrl)) {
        message.error('Please enter a valid URL (http/https, optional trailing slash only)');
        return;
      }
      
      // Save the edit
      try {
        setUpdatingId(id);
        const token = await getToken();
        await FetchWithAuth(`/api/project`, token, {
          method: "PUT",
          body: JSON.stringify({ Id: id, url: editingUrl }),
        });
        setEditingId(null);
        setEditingUrl('');
        setEditingUrlValid(true);
        await fetchProjects(); 
      } catch (error) {
        console.error("Failed to update project:", error);
      } finally {
        setUpdatingId(null);
      }
    } else {
      // Start editing
      const project = projects.find(p => p.id === id);
      if (project) {
        setEditingId(id);
        setEditingUrl(project.url);
        setEditingUrlValid(validateUrl(project.url));
      }
    }
  };

  const handleEditingUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setEditingUrl(url);
    setEditingUrlValid(validateUrl(url));
  };

  const handleNewUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    // Fix the linter error by ensuring we're setting a boolean
    setNewUrlValid(Boolean(url && validateUrl(url)));
  };

  const onSubmit = async (values: any) => {
    try {
      setSubmitting(true);
      const token = await getToken();
      await FetchWithAuth('/api/project', token, {
        method: "POST",
        body: JSON.stringify({ url: values.url }),
      });
      
      form.resetFields();
      setNewUrlValid(false);
      setFormSubmitted(false);
      await fetchProjects();
    } catch (error) {
      console.error("Failed to create project:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFormSubmit = () => {
    setFormSubmitted(true);
    form.submit();
  };

  const columns = [
    {
      title: 'URL',
      dataIndex: 'url',
      key: 'url',
      render: (text: string, record: any) => {
        return editingId === record.id ? (
          <Input
            value={editingUrl}
            onChange={handleEditingUrlChange}
            onPressEnter={() => editingUrlValid && handleUpdate(record.id)}
            autoFocus
            status={editingUrlValid ? '' : 'error'}
            placeholder="https://example.com"
            maxLength={MAX_URL_LENGTH}
            showCount
            suffix={
              editingUrlValid && editingUrl ? (
                <Space>
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  <Tooltip title="URL must start with http:// or https://, may have a trailing slash, but no other paths or parameters">
                    <InfoCircleOutlined style={{ color: 'rgba(0,0,0,.45)' }} />
                  </Tooltip>
                </Space>
              ) : (
                <Tooltip title="URL must start with http:// or https://, may have a trailing slash, but no other paths or parameters">
                  <InfoCircleOutlined style={{ color: 'rgba(0,0,0,.45)' }} />
                </Tooltip>
              )
            }
          />
        ) : (
          text
        );
      }
    },
    {
      title: 'Last Crawl',
      dataIndex: 'lastCrawl',
      key: 'lastCrawl',
      render: (lastCrawl: string, record: any) => {
        if (!record.lastCrawlRaw) {
          return <span style={{ color: '#8c8c8c' }}>Not crawled yet</span>;
        }
        
        const relativeTime = getRelativeTime(record.lastCrawlRaw);
        const exactTime = new Date(record.lastCrawlRaw).toLocaleString();
        
        return (
          <Tooltip title={`Exact time: ${exactTime}`}>
            <span style={{ display: 'flex', alignItems: 'center', cursor: 'default' }}>
              <ClockCircleOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
              {relativeTime}
            </span>
          </Tooltip>
        );
      }
    },
    {
      title: 'Action',
      key: 'action',
      width: '30%',
      render: (_: any, record: any) => (
        <Space>
          <Button 
            type="primary"
            icon={<DashboardOutlined />}
            onClick={() => navigate(`/dashboard/project/${record.id}`)}
            disabled={deletingId === record.id || editingId === record.id}
          >
            Dashboard
          </Button>
          <Button 
            type="default"  
            onClick={() => handleUpdate(record.id)}
            loading={updatingId === record.id}
            disabled={deletingId === record.id || (editingId === record.id && !editingUrlValid)}
          >
            {editingId === record.id ? "Save" : "Update"}
          </Button>
          <Button 
            type="primary" 
            danger 
            onClick={() => handleDelete(record.id)}
            loading={deletingId === record.id}
            disabled={editingId === record.id}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];
 
  return (
    <div>
    <Space direction="vertical" size="large" style={{ display: 'flex' }}>
    <Row justify="center">
      <Col span={24}>
        <Table 
          dataSource={projects} 
          columns={columns} 
          pagination={false} 
          loading={tableLoading}
          locale={{ emptyText: "No projects found" }}
        />
      </Col>
    </Row>

    <Row justify="center">
      <Col span={24}>
      <Card
        size="small"
        title="New Project"
        key="newProject"
      >
        <Form
          {...layout}
          form={form}
          name="control-hooks"
          onFinish={onSubmit}
        >
          <Form.Item 
            name="url" 
            label="URL" 
            rules={[
              { required: true, message: 'Please enter a URL' },
              { max: MAX_URL_LENGTH, message: `URL must be less than ${MAX_URL_LENGTH} characters` },
              { 
                pattern: urlPattern,
                message: 'URL must start with http:// or https:// and contain a valid domain'
              },
              { 
                validator: (_, value) => {
                  if (!value) return Promise.resolve();
                  
                  // If it passes the pattern test but has invalid path/query
                  if (urlPattern.test(value)) {
                    try {
                      const urlObj = new URL(value);
                      if (urlObj.pathname !== '/' && urlObj.pathname !== '') {
                        return Promise.reject(new Error('URL should not contain paths (trailing slash is allowed)'));
                      }
                      if (urlObj.search !== '') {
                        return Promise.reject(new Error('URL should not contain query parameters'));
                      }
                    } catch (e) {
                      // Don't show this error if pattern validation already failed
                      // Just resolve to avoid duplicate errors
                      return Promise.resolve();
                    }
                  }
                  return Promise.resolve();
                }
              }
            ]}
            // Only validate on submit unless already submitted once
            validateTrigger={formSubmitted ? ['onChange', 'onBlur'] : []}
          >
            <Input 
              placeholder="https://example.com" 
              maxLength={MAX_URL_LENGTH}
              showCount
              onChange={handleNewUrlChange}
              suffix={
                newUrlValid ? (
                  <Space>
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    <Tooltip title="URL must start with http:// or https://, may have a trailing slash, but no other paths or parameters">
                      <InfoCircleOutlined style={{ color: 'rgba(0,0,0,.45)' }} />
                    </Tooltip>
                  </Space>
                ) : (
                  <Tooltip title="URL must start with http:// or https://, may have a trailing slash, but no other paths or parameters">
                    <InfoCircleOutlined style={{ color: 'rgba(0,0,0,.45)' }} />
                  </Tooltip>
                )
              }
            />
          </Form.Item>
          <Form.Item {...tailLayout}>
            <Button 
              type="primary" 
              onClick={handleFormSubmit}
              loading={submitting}
            >
              Create new Project
            </Button>
          </Form.Item>
        </Form>
      </Card>
      </Col>
    </Row>
    </Space>
    </div>
  );
}
