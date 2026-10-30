// Khung chung của ứng dụng: nền, tiêu đề tab trình duyệt và vùng hiện toast.
// Danh sách trang nằm ở routes.jsx.
import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { Toaster } from 'sonner';
import { languageStore } from './context/LanguageContext';
import { useStore } from './lib/store';

function PageFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center p-8">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-600 border-t-transparent" />
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading...</span>
      </div>
    </div>
  );
}

const SITE_BRAND = 'Nexus Telecom';

function pageTitle(path, isVi) {
  if (path === '/' || path === '/home') {
    return isVi
      ? `${SITE_BRAND} - Giải Pháp Kết Nối Mạng Viễn Thông Thế Hệ Mới`
      : `${SITE_BRAND} - Next-Gen Telecom Network Solutions`;
  }

  let pageName;
  if (path === '/login' || path === '/dang-nhap') {
    pageName = isVi ? 'Cổng Đăng Nhập' : 'Sign In Gateway';
  } else if (path === '/register' || path === '/dang-ky') {
    pageName = isVi ? 'Đăng Ký Gói Cước' : 'Buy Service Plans';
  } else if (path === '/admin') {
    pageName = isVi ? 'Quản Trị Hệ Thống' : 'Executive Admin';
  } else if (path === '/retail') {
    pageName = isVi ? 'Nhân viên chi nhánh' : 'Retail Operations';
  } else if (path === '/technical' || path === '/tech') {
    pageName = isVi ? 'Kỹ Thuật NOC & Mạng' : 'Field NOC & Ops';
  } else if (path === '/accounts' || path === '/billing') {
    pageName = isVi ? 'Kế Toán & Cước Phí' : 'Billing & Finance';
  } else if (path === '/user' || path === '/subscriber' || path === '/customer') {
    pageName = isVi ? 'Cổng Thuê Bao Tự Phục Vụ' : 'Subscriber Portal';
  } else if (path === '/profile' || path === '/ho-so') {
    pageName = isVi ? 'Hồ Sơ Cá Nhân' : 'User Profile';
  } else {
    pageName = isVi ? 'Không Tìm Thấy Trang' : 'Page Not Found';
  }
  return `${pageName} | ${SITE_BRAND}`;
}

export default function App() {
  const { pathname } = useLocation();
  const language = useStore(languageStore.language);

  useEffect(() => {
    document.title = pageTitle(pathname, language === 'vi');
  }, [pathname, language]);

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#E0F1FF] dark:bg-[#1B2D40] text-[#1B2D40] dark:text-[#E0F1FF] antialiased selection:bg-sky-500 selection:text-white transition-colors duration-300">
      <div className="flex-1 h-full overflow-hidden">
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </div>

      {/* Toast thông báo toàn cục (tự tắt sau 1,5 giây) */}
      <Toaster position="top-right" offset="76px" richColors duration={1500} />
    </div>
  );
}
