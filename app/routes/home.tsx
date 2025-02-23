import type { Route } from "./+types/home";
import { Row, Col } from 'antd';
import Search from '../components/Search';

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App2" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return (
    <Row justify="center">
    <Col span={8}>
      <Search />
    </Col>
  </Row>
  );
}
