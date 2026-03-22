import { Navigate } from "react-router-dom";
import { isSessionStarted } from "@/hooks/useRouteGuard";

const RouteGuard = ({ children }: { children: React.ReactNode }) => {
  if (!isSessionStarted()) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

export default RouteGuard;
