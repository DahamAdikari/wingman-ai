import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

function homeForRole(role) {
  if (role === 'client' || role === 'viewer') return '/client';
  return '/dashboard';
}

export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (roles && !roles.includes(user?.role)) {
    return <Navigate to={homeForRole(user?.role)} replace />;
  }

  return children;
}
