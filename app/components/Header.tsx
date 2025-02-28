import { Layout, Row, Col, Space, Divider } from 'antd';
import { SettingOutlined, NotificationOutlined } from '@ant-design/icons';
import React from 'react';


import { Breadcrumb } from 'antd';
const { Header } = Layout;

import UserComponent from '../components/User';
import SubscriptionStatus from '../components/SubscriptionStatus';

export default function MyHeader(){

    return <Header style={{ padding: 0 }}>
    <Row align="middle">
      <Col className="breadcrumb" span={18}><Breadcrumb items={[{ title: 'Dashboard' }, { title: 'https://cloudvil.com'}]} /></Col>
      
      <Col className="subscription-status" span={3} style={{ textAlign: 'right' }}>
        <SubscriptionStatus />
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