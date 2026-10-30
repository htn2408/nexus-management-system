// Danh sách trang của ứng dụng. Mỗi dashboard chỉ mở cho đúng nhóm quyền (ProtectedRoute).
import { lazy } from 'react';
import { Navigate } from 'react-router';
import App from './App';
import ProtectedRoute from './components/auth/ProtectedRoute';
import IndexPage from './pages/IndexPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import { authStore } from './context/AuthContext';
import { dashboardPathForRole } from './lib/router';
import { useStore } from './lib/store';

const AccountsDashboard = lazy(() => import('./pages/AccountsDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const RetailDashboard = lazy(() => import('./pages/RetailDashboard'));
const TechnicalDashboard = lazy(() => import('./pages/TechnicalDashboard'));
const UserDashboard = lazy(() => import('./pages/UserDashboard'));


// /profile mở tab hồ sơ trong dashboard của người đang đăng nhập.
function ProfileRedirect() {
  const user = useStore(authStore.currentUser);
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={`${dashboardPathForRole(user.role)}?tab=profile`} replace />;
}

function guarded(role, page) {
  return <ProtectedRoute requiredRole={role}>{page}</ProtectedRoute>;
}

// Một trang có thể có nhiều đường dẫn (tên tiếng Anh, tiếng Việt, tên cũ).
function aliases(paths, element) {
  return paths.map((path) => ({ path, element }));
}

export const routes = [
  {
    element: <App />,
    children: [
      ...aliases(['/', '/home'], <IndexPage />),
      ...aliases(['/login', '/dang-nhap'], <LoginPage />),
      ...aliases(['/register', '/dang-ky'], <RegisterPage />),
      { path: '/admin', element: guarded('admin', <AdminDashboard />) },
      { path: '/retail', element: guarded('retail', <RetailDashboard />) },
      ...aliases(['/technical', '/tech'], guarded('technical', <TechnicalDashboard />)),
      ...aliases(['/accounts', '/billing'], guarded('accounts', <AccountsDashboard />)),
      ...aliases(['/user', '/subscriber', '/customer'], guarded('user', <UserDashboard />)),
      ...aliases(['/profile', '/ho-so'], <ProfileRedirect />),
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
