import type { Route } from "./+types/home";
import { useEffect, useState, useCallback } from 'react';
import { Table, Row, Col, Form, Input, Button, Space, Card, message } from 'antd';

import { FetchWithAuth } from '../services/api'

import { useAuth } from '@clerk/clerk-react';

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

export default function Home({ loaderData }: Route.ComponentProps) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [tableLoading, setTableLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingUrl, setEditingUrl] = useState<string>('');

  // Use useCallback to memoize the fetchProjects function
  const fetchProjects = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;
    
    try {
      setTableLoading(true);
      const token = await getToken();
      const data = await FetchWithAuth('/api/project/get', token, {
        method: "GET"
      });
      
      // Transform API data to match table data structure
      const formattedProjects = data.map((project: Project) => ({
        key: project.id.toString(),
        id: project.id,
        url: project.url,
        lastCrawl: project.lastcrawl || "Not crawled yet",
      }));
      
      setProjects(formattedProjects);
      console.log("Projects fetched:", formattedProjects);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    } finally {
      setTableLoading(false);
    }
  }, [isLoaded, isSignedIn, getToken]);
  
  // Use the memoized fetchProjects in useEffect
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleDelete = async (id: number) => {
    try {
      setDeletingId(id);
      const token = await getToken();
      await FetchWithAuth(`/api/project/delete`, token, {
        method: "POST",
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
      // Save the edit
      try {
        setUpdatingId(id);
        const token = await getToken();
        await FetchWithAuth(`/api/project/update`, token, {
          method: "POST",
          body: JSON.stringify({ Id: id, url: editingUrl }),
        });
        setEditingId(null);
        setEditingUrl('');
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
      }
    }
  };

  const onSubmit = async (values: any) => {
    try {
      setSubmitting(true);
      const token = await getToken();
      await FetchWithAuth('/api/project/create', token, {
        method: "POST",
        body: JSON.stringify({ url: values.url }),
      });
      
      form.resetFields();
      await fetchProjects();
    } catch (error) {
      console.error("Failed to create project:", error);
    } finally {
      setSubmitting(false);
    }
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
            onChange={(e) => setEditingUrl(e.target.value)}
            onPressEnter={() => handleUpdate(record.id)}
            autoFocus
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
    },
    {
      title: 'Action',
      key: 'action',
      width: '25%',
      render: (_: any, record: any) => (
        <Space>
          <Button 
            type="default"  
            onClick={() => handleUpdate(record.id)}
            loading={updatingId === record.id}
            disabled={deletingId === record.id}
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
      <Col span={12}>
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
      <Col span={12}>
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
          <Form.Item name="url" label="URL" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item {...tailLayout}>
            <Button 
              type="primary" 
              htmlType="submit" 
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
