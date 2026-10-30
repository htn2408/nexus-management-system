// Chặn trang dashboard theo quyền: chưa đăng nhập thì về /login,
// đăng nhập sai nhóm quyền thì về dashboard của chính người đó.
import { useEffect } from 'react';
import { Navigate } from 'react-router';
import { toast } from 'sonner';
import { authStore } from '../../context/AuthContext';
import { dashboardPathForRole } from '../../lib/router';
import { useStore } from '../../lib/store';

export default function ProtectedRoute({ requiredRole, children }) {
  const user = useStore(authStore.currentUser);
  const wrongRole = user && user.role !== requiredRole;

  useEffect(() => {
    if (wrongRole) {
      toast.error('Bạn không có quyền truy cập trang này. Đang chuyển hướng về trang của bạn.');
    }
  }, [wrongRole]);

  if (!user) return <Navigate to="/login" replace />;
  if (wrongRole) return <Navigate to={dashboardPathForRole(user.role)} replace />;
  return children;
}
