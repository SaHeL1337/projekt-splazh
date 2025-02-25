import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),
    route("reports", "routes/report.tsx"),
    route("projects", "routes/projects.tsx"),
  ] satisfies RouteConfig;