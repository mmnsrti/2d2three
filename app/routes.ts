import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("pricing", "./routes/pricing.tsx"),
  route("projects", "./routes/projects.tsx"),
  route("visualizer/:id", "./routes/visualizer.$id.tsx"),
] satisfies RouteConfig;
