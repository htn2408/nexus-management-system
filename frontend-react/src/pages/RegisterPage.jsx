// Mua gói cước: khách tự điền thông tin, chọn gói và chi nhánh; đơn tạo ra mã đơn để theo dõi.
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { ArrowRight, Building2, IdCard, Mail, Package, Phone, ShoppingCart, Store, User } from 'lucide-react';
import { authStore } from '../context/AuthContext';
import { languageStore } from '../context/LanguageContext';
import { nexusStore, getBulkDiscountPercent, isDepositWaived } from '../context/NexusContext';
import { registerCustomerApi, ApiError } from '../lib/api';
import { dashboardPathForRole, queryParam } from '../lib/router';
import { useStore } from '../lib/store';
import { ID_PROOF_RULES, ID_PROOF_TYPES } from '../lib/idProof';
import { isValidEmail, isValidPhone } from '../lib/validation';
import ErrorAlert from '../components/common/ErrorAlert';
import PublicHeader from '../components/layout/PublicHeader';
import AddressPicker from '../components/register/AddressPicker';
import OrderSummary from '../components/register/OrderSummary';
import PurchaseReceipt from '../components/register/PurchaseReceipt';
import RegisterBenefits from '../components/register/RegisterBenefits';
import { formatAddress } from '../components/register/address';

const labelClass = 'block text-xs font-semibold text-[#305070] dark:text-slate-300 uppercase tracking-wider mb-1.5';
const fieldClass =
  'w-full text-sm bg-[#EDF6FF] dark:bg-[#101C29] border border-[#CCE4F7] dark:border-[#253D56] rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 dark:focus:ring-blue-500 text-[#0F1D2B] dark:text-white placeholder-[#7899B8] dark:placeholder-slate-500 transition';
const iconClass = 'absolute left-3.5 top-3 h-4 w-4 text-[#7899B8] dark:text-slate-500';

const Required = () => <span className="text-rose-500">*</span>;

// Mật khẩu ngẫu nhiên cho tài khoản khách (khách đăng nhập bằng OTP, không dùng mật khẩu này).
// Dùng crypto thay cho Math.random vì Math.random đoán được, không an toàn cho mật khẩu.
function randomPassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('');
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const currentUser = useStore(authStore.currentUser);
  const plans = useStore(nexusStore.plans);
  const retailShops = useStore(nexusStore.retailShops);
  const t = useStore(languageStore.t);
  const isVi = useStore(languageStore.language) === 'vi';

  const [customerType, setCustomerType] = useState('personal'); // 'personal' | 'business'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState({ province: '', district: '', ward: '', specific: '' });
  const [idProofType, setIdProofType] = useState('National ID Card');
  const [idProofNumber, setIdProofNumber] = useState('');
  // Gói chọn sẵn từ trang chủ (VD: /register?plan=plan-bb-64)
  const [planId, setPlanId] = useState(() => queryParam('plan') ?? '');
  const [shopCode, setShopCode] = useState('');
  const [bulkConnectionsCount, setBulkConnectionsCount] = useState('1');
  // Dial-Up: khách đã có đường dây cố định Nexus chưa?
  const [hasExistingLandline, setHasExistingLandline] = useState(false);
  const [existingLandlineAccountId, setExistingLandlineAccountId] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Có giá trị khi đặt thành công: trang chuyển sang biên nhận.
  const [placedOrder, setPlacedOrder] = useState(null);

  const fullAddress = formatAddress(address);
  // Khách cá nhân luôn 1 kết nối, chỉ doanh nghiệp mới được đặt nhiều.
  const effectiveBulkCount = customerType === 'business' ? Math.max(1, Number(bulkConnectionsCount) || 1) : 1;
  const bulkDiscountPercent = getBulkDiscountPercent(effectiveBulkCount);
  // Trên 50 kết nối: miễn hoàn toàn tiền cọc (lưu ở cột Orders.DepositWaived).
  const depositWaived = isDepositWaived(effectiveBulkCount);

  const activePlans = plans.filter((p) => p.status === 'Active');
  const selectedPlan = activePlans.find((p) => p.id === planId) ?? null;
  const selectedShop = retailShops.find((s) => s.shopCode === shopCode) ?? null;
  const idRule = ID_PROOF_RULES[idProofType];

  // Đã đăng nhập thì về dashboard của mình (trừ lúc đang xem biên nhận vừa đặt).
  if (currentUser && !placedOrder) return <Navigate to={dashboardPathForRole(currentUser.role)} replace />;

  const validate = () => {
    if (!name.trim() || !phone.trim() || !fullAddress.trim()) return t.auth.fillAll;
    if (!isValidEmail(email)) return t.auth.invalidEmail;
    if (!isValidPhone(phone)) {
      return isVi ? 'Số điện thoại phải gồm đúng 10 chữ số.' : 'Phone number must contain exactly 10 digits.';
    }
    if (!idRule.isValid(idProofNumber)) return isVi ? idRule.vi : idRule.en;
    if (!idProofNumber.trim()) return t.registrationPage.idProofRequired;
    if (!selectedPlan) return t.registrationPage.planRequired;
    if (!selectedShop) return t.registrationPage.branchRequired;
    if (!agreeTerms) {
      return isVi
        ? 'Vui lòng đồng ý với Điều khoản dịch vụ để tiếp tục.'
        : 'Please accept the Terms of Service to proceed.';
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    const problem = validate();
    setErrorMessage(problem);
    if (problem) return;

    setIsSubmitting(true);
    const normalizedEmail = email.trim().toLowerCase();

    try {
      // Bước 1: tạo tài khoản đăng nhập cho khách lần đầu. Backend tự hash mật khẩu và
      // lưu hồ sơ Customer. Xoá JWT còn sót của phiên trước để không lẫn sang khách khác.
      localStorage.removeItem('nexus_jwt_token');

      let isReturningCustomer = false;
      try {
        const regRes = await registerCustomerApi({
          name: name.trim(),
          email: normalizedEmail,
          password: randomPassword(),
          phoneNumber: phone.trim().replace(/\D/g, ''),
        });
        if (regRes.token) localStorage.setItem('nexus_jwt_token', regRes.token);
      } catch (err) {
        // 409 = email (hoặc số điện thoại) đã có tài khoản: khách cũ mua thêm. Đơn mới được
        // backend gắn vào đúng hồ sơ khách có sẵn theo email, không tạo tài khoản thứ hai.
        if (err instanceof ApiError && err.status === 409) isReturningCustomer = true;
        else throw err;
      }

      // Bước 2: ghi đơn qua /api/public/orders (không cần JWT), nên khách cũ dùng lại email vẫn đặt được.
      const order = await nexusStore.placeOrder(
        {
          customerName: name.trim(),
          customerPhone: phone.trim(),
          customerEmail: normalizedEmail,
          installationAddress: fullAddress.trim(),
          idProofType,
          idProofNumber: idProofNumber.trim(),
          connectionType: selectedPlan.type,
          planId: selectedPlan.id,
          planName: selectedPlan.name,
          retailOutletCode: selectedShop.shopCode,
          retailEmployeeName: 'Online Self-Service',
          bulkConnectionsCount: effectiveBulkCount,
          ...(selectedPlan.type === 'Dial-Up' && hasExistingLandline && existingLandlineAccountId.trim()
            ? { existingLandlineAccountId: existingLandlineAccountId.trim() }
            : {}),
        },
        { selfService: true },
      );
      setPlacedOrder(order);

      if (isReturningCustomer) {
        toast.info(
          isVi
            ? `Email ${normalizedEmail} đã có tài khoản — đơn mới đã được thêm vào hồ sơ của bạn.`
            : `${normalizedEmail} already has an account — this order was added to your profile.`,
        );
      }
      toast.success(t.auth.registerSuccess);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setErrorMessage(
        err instanceof ApiError && err.message !== 'network'
          ? err.message
          : isVi
            ? 'Không kết nối được máy chủ. Vui lòng thử lại.'
            : 'Could not reach the server. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const typeButtonClass = (type) =>
    `flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-2 ${
      customerType === type
        ? 'bg-white dark:bg-[#1E3349] text-sky-600 dark:text-white shadow-xs'
        : 'text-[#537292] dark:text-slate-400 hover:text-[#0F1D2B] dark:hover:text-white'
    }`;

  return (
    <div className="h-full w-full bg-[#E0F1FF] dark:bg-[#1B2D40] text-[#1B2D40] dark:text-[#E0F1FF] font-sans antialiased transition-colors duration-300 flex flex-col relative overflow-y-scroll">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950 opacity-0 dark:opacity-100 transition-opacity"></div>
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-200/40 via-[#E0F1FF] to-[#E0F1FF] opacity-100 dark:opacity-0 transition-opacity"></div>
      <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(to_right,#0284c70d_1px,transparent_1px),linear-gradient(to_bottom,#0284c70d_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1e293b0a_1px,transparent_1px),linear-gradient(to_bottom,#1e293b0a_1px,transparent_1px)] bg-[size:3rem_3rem]"></div>

      <PublicHeader />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10">
        {placedOrder ? (
          <PurchaseReceipt order={placedOrder} shopName={selectedShop?.name} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            <RegisterBenefits />

            <div className="lg:col-span-7">
              <div className="bg-white/95 dark:bg-[#152434]/95 border border-[#CCE4F7] dark:border-[#253D56] rounded-2xl p-6 sm:p-8 shadow-xl backdrop-blur-md transition-colors duration-300">
                {/* Customer Type Selector */}
                <div className="flex rounded-xl bg-[#EDF6FF] dark:bg-[#101C29] p-1 border border-[#CCE4F7] dark:border-[#253D56] mb-6">
                  <button type="button" onClick={() => setCustomerType('personal')} className={typeButtonClass('personal')}>
                    <User className="h-4 w-4" />
                    <span>{t.registrationPage.personalType}</span>
                  </button>
                  <button type="button" onClick={() => setCustomerType('business')} className={typeButtonClass('business')}>
                    <Building2 className="h-4 w-4" />
                    <span>{t.registrationPage.businessType}</span>
                  </button>
                </div>

                <ErrorAlert message={errorMessage} className="mb-5" />

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* SECTION 1: PERSONAL DETAILS */}
                  <h3 className="text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300 flex items-center space-x-1.5">
                    <User className="h-3.5 w-3.5" />
                    <span>{t.registrationPage.personalSection}</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="name" className={labelClass}>
                        {customerType === 'business'
                          ? isVi
                            ? 'Tên Doanh Nghiệp / Đại Diện'
                            : 'Company / Representative Name'
                          : t.auth.nameLabel}{' '}
                        <Required />
                      </label>
                      <div className="relative">
                        <User className={iconClass} />
                        <input
                          id="name"
                          type="text"
                          required
                          placeholder={
                            customerType === 'business'
                              ? isVi
                                ? 'VD: Công ty TNHH Nexus (hoặc Tên Cơ sở)'
                                : 'Ex: Nexus Co. (or Facility Name)'
                              : 'Nguyen Van A'
                          }
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className={`pl-10 pr-4 py-2.5 ${fieldClass}`}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="email" className={labelClass}>
                        {t.auth.emailLabel} <Required />
                      </label>
                      <div className="relative">
                        <Mail className={iconClass} />
                        <input
                          id="email"
                          type="email"
                          required
                          pattern=".*@.*"
                          title={isVi ? 'Email phải chứa ký tự @' : 'Email must contain @ symbol'}
                          placeholder="subscriber@nexus.telecom"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className={`pl-10 pr-4 py-2.5 ${fieldClass}`}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="phone" className={labelClass}>
                        {t.auth.phoneLabel} <Required />
                      </label>
                      <div className="relative">
                        <Phone className={iconClass} />
                        <input
                          id="phone"
                          type="tel"
                          required
                          inputMode="numeric"
                          maxLength={10}
                          title={isVi ? 'Số điện thoại phải gồm đúng 10 chữ số' : 'Phone number must contain exactly 10 digits'}
                          placeholder="0912345678"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className={`pl-10 pr-4 py-2.5 ${fieldClass}`}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="idProofType" className={labelClass}>
                        {t.registrationPage.idProofTypeLabel} <Required />
                      </label>
                      <select
                        id="idProofType"
                        value={idProofType}
                        onChange={(e) => setIdProofType(e.target.value)}
                        className={`px-3.5 py-2.5 cursor-pointer ${fieldClass}`}
                      >
                        {ID_PROOF_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="idProofNumber" className={labelClass}>
                      {t.registrationPage.idProofNumberLabel} <Required />
                    </label>
                    <div className="relative">
                      <IdCard className={iconClass} />
                      <input
                        id="idProofNumber"
                        type="text"
                        required
                        inputMode={idRule.inputMode}
                        pattern={idRule.pattern}
                        maxLength={idRule.maxLength}
                        title={isVi ? idRule.vi : idRule.en}
                        placeholder={idRule.placeholder}
                        value={idProofNumber}
                        onChange={(e) => setIdProofNumber(e.target.value)}
                        className={`pl-10 pr-4 py-2.5 font-mono ${fieldClass}`}
                      />
                    </div>
                  </div>

                  <AddressPicker value={address} onChange={setAddress} />

                  {/* SECTION 2: PLAN & BRANCH */}
                  <h3 className="pt-2 text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300 flex items-center space-x-1.5">
                    <Package className="h-3.5 w-3.5" />
                    <span>{t.registrationPage.planSection}</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="planId" className={labelClass}>
                        {t.registrationPage.planLabel} <Required />
                      </label>
                      <select
                        id="planId"
                        value={planId}
                        onChange={(e) => setPlanId(e.target.value)}
                        className={`px-3.5 py-2.5 cursor-pointer ${fieldClass}`}
                      >
                        <option value="" disabled>
                          {isVi ? 'Vui lòng chọn gói cước' : 'Please select a plan'}
                        </option>
                        {activePlans.map((plan) => (
                          <option key={plan.id} value={plan.id}>
                            {plan.type} — {plan.name} (${plan.monthlyRental}
                            {plan.billingCycle ? ' / ' + plan.billingCycle : t.plans.perMonth})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="shopCode" className={labelClass}>
                        {t.registrationPage.branchLabel} <Required />
                      </label>
                      <select
                        id="shopCode"
                        value={shopCode}
                        onChange={(e) => setShopCode(e.target.value)}
                        className={`px-3.5 py-2.5 cursor-pointer ${fieldClass}`}
                      >
                        <option value="" disabled>
                          {isVi ? 'Vui lòng chọn chi nhánh (cơ sở)' : 'Please select a branch (facility)'}
                        </option>
                        {retailShops.map((shop) => (
                          <option key={shop.id} value={shop.shopCode}>
                            {shop.shopCode} — {shop.name} ({shop.city})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {(customerType === 'business' || selectedPlan?.type === 'Dial-Up') && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Bulk / corporate scheme: chỉ doanh nghiệp mới đặt nhiều kết nối */}
                      {customerType === 'business' && (
                        <div>
                          <label htmlFor="bulkCount" className={labelClass}>
                            {isVi
                              ? 'Số lượng kết nối (mặc định 50 kết nối / 50 router thiết bị)'
                              : 'Number of connections (default 50 connections / 50 routers)'}
                          </label>
                          <input
                            id="bulkCount"
                            type="number"
                            min="1"
                            value={bulkConnectionsCount}
                            onChange={(e) => setBulkConnectionsCount(e.target.value)}
                            className={`px-3.5 py-2.5 ${fieldClass}`}
                          />
                          <p className="mt-1 text-[11px] text-[#537292] dark:text-slate-400">
                            {isVi
                              ? '1 connection = 1 router thiết bị · Mặc định 50 kết nối (chiết khấu 75% cước & tiền cọc) · Trên 50: miễn phí 100%.'
                              : '1 connection = 1 router device · Default 50 lines (75% off rental & deposit) · Over 50: 100% free.'}
                          </p>
                        </div>
                      )}

                      {selectedPlan?.type === 'Dial-Up' && (
                        <div>
                          <span className={labelClass}>{isVi ? 'Đường dây cố định Nexus' : 'Existing Nexus landline'}</span>
                          <label className="flex items-center space-x-2 text-xs text-[#537292] dark:text-slate-300 mb-1.5">
                            <input
                              type="checkbox"
                              checked={hasExistingLandline}
                              onChange={(e) => setHasExistingLandline(e.target.checked)}
                              className="h-4 w-4 rounded border-[#CCE4F7] text-sky-600 focus:ring-sky-500"
                            />
                            <span>
                              {isVi
                                ? 'Khách hàng đã có landline Nexus (chỉ cần kiểm tra khả thi phần internet)'
                                : 'Customer already has a Nexus landline (only the internet leg needs a feasibility check)'}
                            </span>
                          </label>
                          {hasExistingLandline && (
                            <input
                              type="text"
                              placeholder={isVi ? 'Mã tài khoản landline (nếu có)' : 'Landline Account ID (optional)'}
                              value={existingLandlineAccountId}
                              onChange={(e) => setExistingLandlineAccountId(e.target.value)}
                              className={`px-3.5 py-2 font-mono ${fieldClass}`}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {selectedShop && (
                    <div className="p-3 rounded-xl bg-[#EDF6FF] dark:bg-[#101C29] border border-[#CCE4F7] dark:border-[#253D56] text-xs text-[#3A5B7E] dark:text-[#8DB0D4] flex items-start space-x-2.5">
                      <Store className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-[#0F1D2B] dark:text-white">{selectedShop.name}</div>
                        <div className="mt-0.5">{selectedShop.address}</div>
                        <div className="mt-0.5">
                          {selectedShop.operatingHours} · {selectedShop.phone}
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedPlan && (
                    <OrderSummary
                      plan={selectedPlan}
                      connections={effectiveBulkCount}
                      discountPercent={bulkDiscountPercent}
                      depositWaived={depositWaived}
                    />
                  )}

                  <div className="pt-1">
                    <label className="flex items-start space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={agreeTerms}
                        onChange={(e) => setAgreeTerms(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-[#CCE4F7] dark:border-[#253D56] text-sky-600 focus:ring-sky-500"
                      />
                      <span className="text-xs text-[#537292] dark:text-slate-400">{t.registrationPage.agreeTerms}</span>
                    </label>
                  </div>

                  <div className="pt-3">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white transition shadow-lg shadow-sky-600/30 flex items-center justify-center space-x-2 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      <span>
                        {isSubmitting ? (isVi ? 'Đang gửi đăng ký...' : 'Submitting...') : t.auth.registerButton}
                      </span>
                    </button>
                  </div>
                </form>

                <div className="mt-6 pt-5 border-t border-[#CCE4F7] dark:border-slate-800/80 text-center text-xs text-[#537292] dark:text-slate-400 flex items-center justify-center space-x-1.5">
                  <span>{t.auth.haveAccount}</span>
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="font-bold text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center space-x-1"
                  >
                    <span>{t.auth.loginLink}</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>

              <div className="mt-4 text-center text-xs text-[#537292] dark:text-slate-400">
                <span>{t.auth.securityNotice}</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
