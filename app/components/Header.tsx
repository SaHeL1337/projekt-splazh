import { Layout, Row, Col, Space } from 'antd';
import { SettingOutlined, NotificationOutlined } from '@ant-design/icons';
import React from 'react';

import { FetchWithAuth } from '../services/api'

import { Breadcrumb } from 'antd';
const { Header } = Layout;

import  UserComponent  from '../components/User';
import { useAuth } from '@clerk/clerk-react';

export default function MyHeader(){

    return <Header style={{ padding: 0 }}>
    <Row>
      <Col className="breadcrumb" span={11}><Breadcrumb items={[{ title: 'Dashboard' }, { title: 'https://cloudvil.com'}]} /></Col>
      <Col span={10}>
        Tokens: 0 
      </Col>
      <Col className="userNavigation" span={2}>
        <UserComponent/> 
      </Col>
      <Col className="userNavigation" span={1}>
        <Space size="small">
          <SettingOutlined />
          <NotificationOutlined />
        </Space>
      </Col>
    </Row>
  </Header>
}