import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),
    route("reports", "routes/report.tsx"),
  ] satisfies RouteConfig;