import { Layout, Row, Col, Space } from 'antd';
import { SettingOutlined, NotificationOutlined } from '@ant-design/icons';
import React from 'react';

import { FetchWithAuth } from '../services/api'

import { Breadcrumb } from 'antd';
const { Header } = Layout;

import  UserComponent  from '../components/User';
import Auth from '../components/Auth';

export default function MyHeader(){
  const [tokens, setTokens] = React.useState(0);

  React.useEffect(() => {
    FetchWithAuth('https://jsonplaceholder.typicode.com/todos/1', "abc", {}).then(data => {
      setTokens(data.id);
    });
  }, []);


    return <Header style={{ padding: 0 }}>
    <Row>
      <Col className="breadcrumb" span={11}><Breadcrumb items={[{ title: 'Dashboard' }, { title: 'https://cloudvil.com'}]} /></Col>
      <Col span={10}>
        Tokens: {tokens} 
      </Col>
      <Col className="userNavigation" span={2}>
        <UserComponent/> 
        <Auth></Auth>
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