import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
    index("routes/projects.tsx"),
    route("dashboard/project/:id?", "routes/dashboard.tsx"),
] satisfies RouteConfig;