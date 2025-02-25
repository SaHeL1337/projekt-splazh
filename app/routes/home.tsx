import type { Route } from "./+types/home";
import { Row, Col } from 'antd';
import Search from '../components/Search';
import Dashboard from '../components/Dashboard';

import { rootAuthLoader } from '@clerk/react-router/ssr.server';

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App2" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return (
    <div>
      <Row justify="center" style={{ marginTop: 20 }}>
        <Col span={16}>
          <Dashboard />
        </Col>
      </Row>
    </div>
  );
}
