import { writable, derived, get } from '../lib/store';
import { roleTypeFromJobTitle } from '../types/nexus';
import { nexusStore, accountIdKey } from './NexusContext';
import { languageStore } from './LanguageContext';
import { navigate } from '../lib/router';
import { toast } from 'sonner';
import {
  loginRequest,
  requestLoginOtpApi,
  verifyLoginOtpApi,
  updateProfileApi,
  updatePasswordApi,
  isTokenExpired,
  onUnauthorized,
  clearCachedUserData,
  ApiError,
} from '../lib/api';

// ---- Account ID helpers ----
// Customers sign in with the 16-char Account ID issued once the line is feasible.
// Layout per spec: [type letter D/B/T][3-digit city code][12-digit serial].
export function normalizeAccountId(raw) {
  const s = (raw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 16);
  return s.length > 4 ? `${s.slice(0, 4)}-${s.slice(4)}` : s;
}
export function isCompleteAccountId(raw) {
  return (raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '').length === 16;
}
export { clearCachedUserData };

// Khôi phục phiên làm việc khi tải lại trang (F5):
// Nếu có JWT chưa hết hạn và có thông tin người dùng trong localStorage thì khôi phục,
// ngược lại thì dọn dẹp sạch sẽ token cũ.
function loadSavedUser() {
  if (typeof localStorage === 'undefined') return null;
  const token = localStorage.getItem('nexus_jwt_token');
  if (!token || isTokenExpired(token)) {
    if (token) {
      localStorage.removeItem('nexus_jwt_token');
      localStorage.removeItem('nexus_auth_user');
      clearCachedUserData();
    }
    return null;
  }
  try {
    const raw = localStorage.getItem('nexus_auth_user');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem('nexus_auth_user');
    return null;
  }
}

// ---- Stores ----
function createAuthStore() {
  const savedUser = loadSavedUser();
  const currentUser = writable(savedUser);

  // Lưu người dùng hiện tại vào localStorage; khi đăng xuất (u === null) thì xoá bỏ
  currentUser.subscribe((u) => {
    if (u) localStorage.setItem('nexus_auth_user', JSON.stringify(u));
    else localStorage.removeItem('nexus_auth_user');
  });

  const isAuthenticated = derived(currentUser, (u) => !!u);

  // Tải lại trang (F5): có phiên đăng nhập hợp lệ thì đồng bộ lại dữ liệu mới nhất theo vai trò
  if (savedUser && typeof window !== 'undefined') {
    setTimeout(() => {
      void nexusStore.syncWithDatabase();
    }, 0);
  }

  // Đăng ký nhận thông báo 401 khi token hết hạn hoặc server từ chối request nghiệp vụ
  onUnauthorized(() => {
    logout();
    navigate('/login');
    toast.error(
      get(languageStore.language) === 'vi'
        ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
        : 'Session has expired. Please sign in again.',
    );
  });
  // Builds the customer session from whatever the Account ID is attached to:
  // a provisioned connection first, otherwise the order that reserved the ID.
  const buildCustomerUser = (accountId) => {
    const key = accountIdKey(accountId);
    const connection = get(nexusStore.connections).find((c) => accountIdKey(c.accountId) === key);
    const order = get(nexusStore.orders).find((o) => o.assignedAccountId && accountIdKey(o.assignedAccountId) === key);
    if (!connection && !order) return null;
    const shopCode = order?.retailOutletCode;
    const shop = get(nexusStore.retailShops).find((s) => s.shopCode === shopCode);
    return {
      id: accountId,
      name: connection?.customerName || order.customerName,
      email: connection?.customerEmail || order.customerEmail,
      role: 'user',
      title: 'Customer',
      department: shop ? `${shop.name} (${shop.shopCode})` : 'Subscribers',
      accountId,
      orderId: connection?.orderId || order?.id,
      branchCode: shopCode,
      planName: connection?.planName || order?.planName,
    };
  };
  // Customer sign-in: Account ID only, issued at purchase time.
  /**
   * Bước 1 đăng nhập khách hàng: gửi mã tài khoản, backend gửi OTP về email đã đăng ký.
   * Trả về email đã che bớt để giao diện hiện "Mã OTP đã gửi tới sa*****@gmail.com".
   */
  const requestLoginOtp = async (rawAccountId) => {
    const t = get(languageStore.t);
    if (!isCompleteAccountId(rawAccountId)) {
      return { success: false, error: t.auth.accountIdRequired };
    }
    try {
      const res = await requestLoginOtpApi(normalizeAccountId(rawAccountId));
      return {
        success: true,
        maskedEmail: res.maskedEmail,
        expiresInSeconds: res.expiresInSeconds,
        resendAfterSeconds: res.resendAfterSeconds,
      };
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.message === 'network') {
          return { success: false, error: t.auth.serverUnreachable };
        }
        return { success: false, error: e.message };
      }
      return { success: false, error: t.auth.loginFailed };
    }
  };
  /**
   * Bước 2: gửi OTP khách nhập lên backend. Đúng thì lưu JWT và đăng nhập.
   * Thông tin hiển thị ưu tiên lấy từ store cục bộ (có tên cửa hàng, gói cước),
   * thiếu thì dùng dữ liệu tối thiểu mà API trả về.
   */
  const loginWithOtp = async (rawAccountId, otp) => {
    const t = get(languageStore.t);
    try {
      const res = await verifyLoginOtpApi(normalizeAccountId(rawAccountId), otp.trim());
      if (res.token) {
        localStorage.setItem('nexus_jwt_token', res.token);
      }
      const accountId = normalizeAccountId(res.user.accountId || rawAccountId);
      const user = buildCustomerUser(accountId) ?? {
        id: accountId,
        name: res.user.name,
        email: res.user.email,
        role: 'user',
        title: 'Customer',
        department: 'Subscribers',
        accountId,
      };
      currentUser.set(user);
      void nexusStore.syncWithDatabase();
      return { success: true, user };
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.message === 'network') {
          return { success: false, error: t.auth.serverUnreachable };
        }
        return { success: false, error: e.message };
      }
      return { success: false, error: t.auth.loginFailed };
    }
  };
  // Staff/customer sign-in through the real backend: POST /api/auth/login
  // with email + password. The backend returns a JWT plus the account's role
  // (Manager / Retail Staff / Field Engineer / Senior Accountant / Customer).
  const mapBackendRole = roleTypeFromJobTitle;
  const loginWithCredentials = async (email, password) => {
    const t = get(languageStore.t);
    try {
      const res = await loginRequest(email.trim(), password);
      // Lưu JWT để đính kèm vào các request tới backend sau này (nếu có).
      if (res.token) {
        localStorage.setItem('nexus_jwt_token', res.token);
      }
      const role = mapBackendRole(res.user.role);
      const titleByRole = {
        admin: 'Manager',
        retail: 'Retail Staff',
        technical: 'Field Engineer',
        accounts: 'Senior Accountant',
        user: 'Customer',
      };
      const user = {
        id: res.user.id,
        name: res.user.name,
        email: res.user.email,
        role,
        title: titleByRole[role],
        department: res.user.accountType === 'Employee' ? 'Nexus Telecom Internal' : 'Subscribers',
        // Chi nhánh làm việc của nhân viên (SH-01...); quầy bán lẻ dùng để lọc đơn của mình.
        branchCode: res.user.storeId || undefined,
      };
      currentUser.set(user);
      // Lúc mở trang chỉ tải được dữ liệu công khai; có token và vai trò rồi thì tải phần của vai trò này.
      if (res.token) void nexusStore.syncWithDatabase();
      return { success: true, user };
    } catch (e) {
      // Không còn fallback đăng nhập demo: mọi đăng nhập đều phải qua backend
      // (JWT). Sai mật khẩu / backend sập → báo lỗi, không tự cấp phiên cục bộ.
      if (e instanceof ApiError) {
        if (e.message === 'network') return { success: false, error: t.auth.serverUnreachable };
        if (e.status === 401) return { success: false, error: t.auth.invalidCredentials };
      }
      return { success: false, error: t.auth.loginFailed };
    }
  };
  // Đăng nhập nhanh 1-chạm cho tài khoản mẫu các role — đi qua backend thật
  // (email + mật khẩu demo khớp hash seed) để nhận JWT đúng role.
  const loginQuickStaff = async (email) => {
    return loginWithCredentials(email, '1234567890');
  };
  const updateUserProfile = async (updates) => {
    currentUser.update((u) => {
      if (!u) return null;
      const updated = { ...u, ...updates };
      localStorage.setItem('nexus_auth_user', JSON.stringify(updated));
      return updated;
    });
    // Sync name, email, phone, address to database regardless of user role
    const me = get(currentUser);
    if (me) {
      try {
        await updateProfileApi({
          name: me.name,
          email: me.email,
          phoneNumber: me.phone ?? '',
          address: me.address ?? '',
        });
      } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : 'Không lưu được hồ sơ lên máy chủ.' };
      }
    }
    return { success: true };
  };
  const changePassword = async (currentPassword, newPassword) => {
    try {
      await updatePasswordApi({ currentPassword, newPassword });
      return { success: true };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Lỗi khi đổi mật khẩu.' };
    }
  };
  const logout = () => {
    currentUser.set(null);
    localStorage.removeItem('nexus_auth_user');
    localStorage.removeItem('nexus_jwt_token');
    clearCachedUserData();
    nexusStore.clearSessionData?.();
  };
  return {
    currentUser,
    isAuthenticated,
    requestLoginOtp,
    loginWithOtp,
    loginWithCredentials,
    loginQuickStaff,
    updateUserProfile,
    changePassword,
    logout,
  };
}
export const authStore = createAuthStore();
