// Form đặt thêm một gói cước cho khách đang đăng nhập. Điền sẵn thông tin từ hồ sơ / đường truyền hiện có.
import { useState } from 'react';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { nexusStore } from '../../context/NexusContext';
import { useCustomerAccount } from '../../hooks/useCustomerAccount';
import { ID_PROOF_RULES, ID_PROOF_TYPES } from '../../lib/idProof';
import { useStore } from '../../lib/store';
import { isValidEmail, isValidPhone } from '../../lib/validation';
import AddressPicker from '../register/AddressPicker';
import { formatAddress } from '../register/address';

const fieldClass =
  'w-full px-3 py-2 text-xs bg-[#EDF6FF] dark:bg-[#101C29] border border-[#CCE4F7] dark:border-[#253D56] rounded-xl text-[#0F1D2B] dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-sky-500';
const labelClass = 'block font-semibold text-[#305070] dark:text-slate-300 mb-1';

export default function NewServiceOrderModal({ plan, onClose, onPlaced }) {
  const isVi = useStore(languageStore.language) === 'vi';
  const retailShops = useStore(nexusStore.retailShops);
  const { user, accountId, connection, order, shop } = useCustomerAccount();

  const [name, setName] = useState(() => user?.name || connection?.customerName || '');
  const [email, setEmail] = useState(() => user?.email || connection?.customerEmail || '');
  const [phone, setPhone] = useState(() => connection?.customerPhone || '');
  const [address, setAddress] = useState(() => ({
    province: '',
    district: '',
    ward: '',
    specific: connection?.installationAddress || '',
  }));
  const [shopCode, setShopCode] = useState(() => shop?.shopCode || retailShops[0]?.shopCode || '');
  const [idProofType, setIdProofType] = useState('National ID Card');
  const [idProofNumber, setIdProofNumber] = useState(() => order?.idProofNumber || '');
  const [hasLandline, setHasLandline] = useState(false);
  const [isPlacing, setIsPlacing] = useState(false);
  const idRule = ID_PROOF_RULES[idProofType];
  const fullAddress = formatAddress(address);
  // Dial-Up cần một đường thoại cố định: tài khoản đang dùng phải là Landline (mã bắt đầu bằng T).
  const ownsLandline = accountId.startsWith('T');

  const validate = () => {
    if (!name || !phone || !fullAddress || !idProofNumber || !shopCode) {
      return isVi ? 'Vui lòng điền các trường bắt buộc' : 'Please fill required fields';
    }
    if (email && !isValidEmail(email)) return isVi ? 'Email phải có dạng ten@mien.com.' : 'Email must have the form name@domain.com.';
    if (!isValidPhone(phone)) return isVi ? 'Số điện thoại phải gồm đúng 10 chữ số.' : 'Phone number must contain exactly 10 digits.';
    if (!idRule.isValid(idProofNumber)) return isVi ? idRule.vi : idRule.en;
    if (plan.type === 'Dial-Up' && (!hasLandline || !ownsLandline)) {
      return isVi
        ? 'Bạn bắt buộc phải có tài khoản Điện thoại Cố định (Landline) để đăng ký mạng Quay số (Dial-Up)!'
        : 'A Landline account is compulsory to register for Dial-Up internet!';
    }
    return '';
  };

  const submit = async (e) => {
    e.preventDefault();
    // Chặn gửi đơn 2 lần (bấm đúp / Enter + click) khi request trước chưa xong.
    if (isPlacing) return;
    const problem = validate();
    if (problem) {
      toast.error(problem);
      return;
    }

    setIsPlacing(true);
    try {
      // Không dùng email giả làm dự phòng: backend nhận diện khách theo email, đơn thiếu email
      // từng bị gom chung vào MỘT hồ sơ khách.
      const created = await nexusStore.placeOrder({
        customerName: name.trim(),
        customerPhone: phone.trim(),
        customerEmail: email.trim() || user?.email || connection?.customerEmail || '',
        installationAddress: fullAddress.trim(),
        idProofType,
        idProofNumber: idProofNumber.trim(),
        connectionType: plan.type,
        planId: plan.id,
        planName: plan.name,
        retailOutletCode: shopCode,
        retailEmployeeName: 'Customer Self-Service',
        bulkConnectionsCount: 1,
        ...(plan.type === 'Dial-Up' && hasLandline && ownsLandline ? { existingLandlineAccountId: accountId } : {}),
      });
      toast.success(
        isVi
          ? `Đã gửi đơn hàng #${created.id} thành công! Hồ sơ đang chờ nhân viên chi nhánh xét duyệt.`
          : `Order #${created.id} submitted! Awaiting retail branch verification.`,
      );
      onPlaced(created);
    } catch (err) {
      // Đơn không vào được CSDL thì phải nói thật, không hiện biên nhận giả.
      toast.error(isVi ? 'Chưa gửi được đơn hàng' : 'Order was not submitted', {
        description:
          err instanceof Error && err.message !== 'network'
            ? err.message
            : isVi
              ? 'Không kết nối được máy chủ. Vui lòng thử lại.'
              : 'Could not reach the server. Please try again.',
      });
    } finally {
      setIsPlacing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#152434] border border-[#CCE4F7] dark:border-[#253D56] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-[#CCE4F7] dark:border-[#253D56]">
          <div>
            <h3 className="text-base font-bold text-[#0F1D2B] dark:text-white">
              {isVi ? 'Xác nhận đăng ký gói cước' : 'Confirm Subscription'}
            </h3>
            <p className="text-xs text-sky-600 dark:text-sky-400 font-semibold mt-0.5">
              {plan.name} ({plan.type} · ${plan.monthlyRental}/{plan.billingCycle})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>{isVi ? 'Họ và tên khách hàng' : 'Customer Full Name'} *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Nguyễn Văn A" className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>{isVi ? 'Email liên hệ' : 'Contact Email'}</label>
              <input
                type="email"
                pattern="[^\s@]+@[^\s@]+\.[^\s@]+"
                title={isVi ? 'Email phải có dạng ten@mien.com' : 'Email must have the form name@domain.com'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className={fieldClass}
              />
            </div>
          </div>

          <AddressPicker value={address} onChange={setAddress} />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>{isVi ? 'Số điện thoại liên hệ' : 'Contact Phone'} *</label>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                title={isVi ? 'Số điện thoại phải gồm đúng 10 chữ số' : 'Phone number must contain exactly 10 digits'}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>{isVi ? 'Chi nhánh xử lý' : 'Servicing Branch'} *</label>
              <select value={shopCode} onChange={(e) => setShopCode(e.target.value)} className={fieldClass}>
                {retailShops.map((s) => (
                  <option key={s.shopCode} value={s.shopCode}>
                    {s.name} ({s.shopCode})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>{isVi ? 'Loại giấy tờ' : 'ID Proof Type'}</label>
              <select value={idProofType} onChange={(e) => setIdProofType(e.target.value)} className={fieldClass}>
                {ID_PROOF_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {isVi ? ID_PROOF_RULES[type].labelVi : type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>{isVi ? 'Số giấy tờ (CCCD/Passport)' : 'ID Proof Number'} *</label>
              <input
                type="text"
                inputMode={idRule.inputMode}
                pattern={idRule.pattern}
                maxLength={idRule.maxLength}
                title={isVi ? idRule.vi : idRule.en}
                value={idProofNumber}
                onChange={(e) => setIdProofNumber(e.target.value)}
                required
                className={fieldClass}
              />
            </div>
          </div>

          {plan.type === 'Dial-Up' && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-2">
              <label className="flex items-center space-x-2 text-amber-800 dark:text-amber-300 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasLandline}
                  onChange={(e) => setHasLandline(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span>
                  {isVi ? 'Tôi đã có đường thoại Nexus Landline sẵn tại địa chỉ này' : 'I already have an active Nexus Landline here'}
                </span>
              </label>
              {hasLandline && (
                <p className="text-[11px] text-amber-700 dark:text-amber-400 pl-5">
                  {isVi
                    ? `Sẽ liên kết với mã thuê bao hiện tại: ${accountId} (chỉ cần khảo sát tầng Internet).`
                    : `Will link to your existing Landline account: ${accountId} (only internet leg surveyed).`}
                </p>
              )}
            </div>
          )}

          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {isVi
              ? 'Sau khi đặt, hệ thống gửi email xác nhận và thông báo vào tài khoản của bạn.'
              : 'After you order, a confirmation email and an in-app notification are sent to you.'}
          </p>

          <div className="pt-3 border-t border-[#CCE4F7] dark:border-[#253D56] flex items-center justify-end space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            >
              {isVi ? 'Hủy' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isPlacing}
              className="px-5 py-2 rounded-xl font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isPlacing ? (isVi ? 'Đang gửi đơn...' : 'Submitting...') : isVi ? 'Xác nhận đặt đơn' : 'Submit Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
