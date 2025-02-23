import { Layout, Row, Col, Space } from 'antd';
import { SettingOutlined, NotificationOutlined } from '@ant-design/icons';
import React from 'react';

import { FetchWithAuth } from '../services/api'

import { Breadcrumb } from 'antd';
const { Header } = Layout;

import  UserComponent  from '../components/User';
import { useAuth } from '@clerk/clerk-react';

export default function MyHeader(){
  const [tokens, setTokens] = React.useState(0);
  const { isLoaded, isSignedIn, userId, sessionId, getToken } = useAuth()
  
  React.useEffect(() => {
    (async () => {
      const token = await getToken();
      const data = await FetchWithAuth('https://projekt-splazh.vercel.app/api/index', token, {});
      setTokens(data.user_id);
    })();
  }, []);


    return <Header style={{ padding: 0 }}>
    <Row>
      <Col className="breadcrumb" span={11}><Breadcrumb items={[{ title: 'Dashboard' }, { title: 'https://cloudvil.com'}]} /></Col>
      <Col span={10}>
        Tokens: {tokens} 
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