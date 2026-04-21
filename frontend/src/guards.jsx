// guards.jsx - Route protection and role-based access control
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ROLE_PERMISSIONS } from './api/constants';

// Protect any route — redirect to login if not authenticated
export function ProtectedRoute({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

// Restrict route to specific roles
export function RoleRoute({ children, allowedRoles }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  if (!allowedRoles.includes(user?.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}

// Role-based dashboard redirect after login
export function RoleRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  const dashboards = {
    admin:     '/admin/dashboard',
    principal: '/admin/dashboard',
    teacher:   '/teacher/dashboard',
    parent:    '/parent/dashboard',
  };

  return <Navigate to={dashboards[user.role] || '/login'} replace />;
}

// Utility: check if user has access to a feature
export function hasPermission(userRole, feature) {
  return ROLE_PERMISSIONS[userRole]?.includes(feature) ?? false;
}
