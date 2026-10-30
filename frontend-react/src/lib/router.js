// Các hàm điều hướng dùng chung, bọc quanh React Router.
// Component có thể dùng useNavigate của React Router, còn code ngoài component
// (hoặc code chép từ bản Svelte) gọi navigate / navigateTo ở đây.
// Routes: '/', '/home', '/login', '/register', '/admin', '/retail', '/technical', '/accounts', '/user' (+ aliases)
import { writable } from './store';

let appRouter = null;

// main.jsx gọi hàm này một lần sau khi tạo router.
export function registerRouter(router) {
  appRouter = router;
}

function cleanPath(path) {
  // Bỏ dấu '#' thừa từ link kiểu cũ (/#/login)
  return path.startsWith('#') ? path.replace(/^#/, '') : path;
}

export function navigate(to) {
  const target = cleanPath(to);
  if (appRouter) {
    appRouter.navigate(target);
  } else if (typeof window !== 'undefined') {
    window.location.href = target;
  }
}

// Tab muốn mở khi chuyển sang một dashboard, ví dụ navigateTo('/admin', 'profile').
export const activeTabOverride = writable(null);

export function navigateTo(path, tab, extraQuery) {
  const target = cleanPath(path);
  if (tab) {
    activeTabOverride.set({ path: target, tab });
    // extraQuery cho phép kèm tham số bổ sung (VD: session=chat-01 để mở thẳng phiên chat)
    const params = new URLSearchParams({ tab });
    if (extraQuery) {
      for (const [key, value] of Object.entries(extraQuery)) params.set(key, value);
    }
    appRouter?.navigate(`${target}?${params.toString()}`);
  } else {
    activeTabOverride.set(null);
    appRouter?.navigate(target);
  }
}

// Đọc tham số trên URL, ví dụ queryParam('order') với /login?order=B0000000001.
export function queryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

// Đổi link kiểu cũ /#/login?order=B01 thành /login?order=B01 trước khi router khởi động.
export function migrateHashUrl() {
  const hash = window.location.hash;
  if (hash.startsWith('#/')) {
    window.history.replaceState({}, '', hash.replace(/^#/, ''));
  } else if (hash === '#') {
    window.history.replaceState({}, '', window.location.pathname + window.location.search);
  }
}

// Dashboard của từng nhóm quyền (khớp với ProtectedRoute).
export function dashboardPathForRole(role) {
  const map = {
    admin: '/admin',
    retail: '/retail',
    technical: '/technical',
    accounts: '/accounts',
    user: '/user',
  };
  return map[role] ?? '/user';
}
