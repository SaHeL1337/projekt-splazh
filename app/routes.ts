import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
    index("routes/landing.tsx"),
    route("projects", "routes/projects.tsx"),
    route("dashboard/project/:id?", "routes/dashboard.tsx"),
] satisfies RouteConfig;