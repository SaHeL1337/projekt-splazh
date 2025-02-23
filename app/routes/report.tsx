import type { Route } from "./+types/home";
import { Login2 } from "../welcome/login";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App3" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}


export default function Report() {
  return "hello from report"
}
