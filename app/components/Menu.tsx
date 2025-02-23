
import { UploadOutlined, UserOutlined, VideoCameraOutlined, NotificationOutlined, SettingOutlined } from '@ant-design/icons';
import { Layout as L, Menu as M } from 'antd';
const { Sider } = L;
import { Link } from "react-router";

const items = [
  {
    label: <Link to="/">Dashboard</Link>,
    key: 'home',
    icon: <UserOutlined />,
  },
  {
    label: <Link to="/reports">Reports</Link>,
    key: 'reports',
    icon: <VideoCameraOutlined /> ,
  }
];

export default function Menu(){
  return <Sider
      theme="light"
        breakpoint="lg"
        collapsedWidth="0"
        onBreakpoint={(broken) => {
          console.log(broken);
        }}
        onCollapse={(collapsed, type) => {
          console.log(collapsed, type);
        }}
      >
        <div className="demo-logo-vertical" />
        <M mode="inline" defaultSelectedKeys={['1']} items={items} />
      </Sider>
}