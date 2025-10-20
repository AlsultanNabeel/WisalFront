import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { getDefaultRouteForRole, type EmployeeRole } from '@/constants/roles';

type ProtectedRouteProps = {
  allowedRoles?: EmployeeRole[];
};

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, initializing, role } = useAuth();

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <span className="text-sm text-gray-500">جارٍ التحميل…</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!role || !allowedRoles.includes(role)) {
      const fallback = role ? getDefaultRouteForRole(role) : '/unauthorized';
      return <Navigate to={fallback} replace />;
    }
  }

  return <Outlet />;
}
