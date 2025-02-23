import { Layout, Row, Col, Space } from 'antd';
import { UserOutlined, SettingOutlined, NotificationOutlined } from '@ant-design/icons';

import { Breadcrumb } from 'antd';
const { Header } = Layout;

export default function MyHeader(){
    return <Header style={{ padding: 0 }}>
    <Row>
      <Col className="breadcrumb" span={11}><Breadcrumb items={[{ title: 'Dashboard' }, { title: 'https://cloudvil.com'}]} /></Col>
      <Col span={10}>
        Tokens: 300  
      </Col>
      <Col className="userNavigation" span={2}>
        <UserOutlined /> Sign In  
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