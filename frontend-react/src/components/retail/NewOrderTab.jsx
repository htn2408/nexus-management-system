// Tab tạo đơn tại quầy: thông tin khách, loại kết nối, gói cước, số kết nối; xác nhận rồi tạo đơn.
// Đơn tạo xong vào hàng đợi Duyệt hồ sơ chi nhánh như mọi đơn khác.
import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowRight, CheckCircle2, FileText, Phone, Radio, User, Wifi } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { nexusStore } from '../../context/NexusContext';
import { useRetailBranch } from '../../hooks/useRetailBranch';
import { ID_PROOF_RULES, ID_PROOF_TYPES } from '../../lib/idProof';
import { getPlanDescription, getPlanName, getPlanSpeedOrBandwidth } from '../../lib/planI18n';
import { useStore } from '../../lib/store';
import { isValidEmail, isValidPhone } from '../../lib/validation';
import AddressPicker from '../register/AddressPicker';
import { formatAddress } from '../register/address';
import ConfirmOrderModal from './ConfirmOrderModal';
import OrderCreatedModal from './OrderCreatedModal';

const CONNECTION_TYPES = [
  { type: 'Broadband', icon: Wifi, desc: 'High-Speed Fiber FTTH', descVi: 'Cáp quang tốc độ cao FTTH', labelVi: 'Cáp quang (Broadband)' },
  { type: 'Dial-Up', icon: Radio, desc: '56k Analog PSTN Modem', descVi: 'Modem quay số tương tự 56k', labelVi: 'Quay số (Dial-Up)' },
  { type: 'Landline', icon: Phone, desc: 'Fixed Voice / VoIP Phone', descVi: 'Điện thoại cố định / Thoại VoIP', labelVi: 'Cố định (Landline)' },
];

const ID_OPTION_LABELS = {
  'National ID Card': ['CCCD (12 số)', 'National ID (12 digits)'],
  Passport: ['Hộ chiếu (7-9 ký tự)', 'Passport (7-9 chars)'],
  "Driver's License": ['Giấy phép lái xe (12 số)', "Driver's License (12 digits)"],
};

const fieldClass =
  'w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white';
const labelClass = 'block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1';

const EMPTY_FORM = {
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  address: { province: '', district: '', ward: '', specific: '' },
  idProofType: 'National ID Card',
  idProofNumber: '',
  connectionType: 'Broadband',
  planId: '',
  bulkConnectionsCount: '1',
  hasExistingLandline: false,
  existingLandlineAccountId: '',
};

function StepHeading({ icon: Icon, children }) {
  return (
    <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-2 mb-4">
      <Icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
      <h3 className="font-semibold text-sm uppercase tracking-wider text-slate-900 dark:text-white">{children}</h3>
    </div>
  );
}

export default function NewOrderTab({ onReviewOrder }) {
  const language = useStore(languageStore.language);
  const isVi = language === 'vi';
  const plans = useStore(nexusStore.plans);
  const { user, branchCode, branchShop } = useRetailBranch();

  const [form, setForm] = useState(EMPTY_FORM);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createdOrder, setCreatedOrder] = useState(null);
  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const availablePlans = plans.filter((p) => p.type === form.connectionType && p.status === 'Active');
  // Gói đang chọn không thuộc loại kết nối hiện tại thì lấy gói đầu tiên của loại đó.
  const plan = availablePlans.find((p) => p.id === form.planId) ?? availablePlans[0] ?? null;
  const idRule = ID_PROOF_RULES[form.idProofType];
  const installationAddress = formatAddress(form.address);
  const connections = Math.max(1, Number(form.bulkConnectionsCount) || 1);
  const outletCode = branchCode ?? 'SH-01';
  const branchLabel = branchShop ? `${branchShop.name} (${branchShop.shopCode})` : outletCode;

  const validate = () => {
    if (!form.customerName.trim() || !form.customerPhone.trim() || !form.customerEmail.trim() || !installationAddress.trim()) {
      return isVi
        ? 'Vui lòng nhập đầy đủ thông tin khách hàng (họ tên, SĐT, email) và địa chỉ lắp đặt.'
        : 'Please enter all required customer information (name, phone, email) and installation address.';
    }
    if (!isValidPhone(form.customerPhone)) {
      return isVi ? 'Số điện thoại phải gồm đúng 10 chữ số.' : 'Customer phone must contain exactly 10 digits.';
    }
    if (!isValidEmail(form.customerEmail)) return isVi ? 'Email phải có dạng ten@mien.com.' : 'Email must have the form name@domain.com.';
    if (!form.idProofNumber.trim()) {
      return isVi ? 'Vui lòng nhập số giấy tờ tùy thân xác thực.' : 'Please enter customer ID proof verification number.';
    }
    if (!idRule.isValid(form.idProofNumber)) return isVi ? idRule.vi : idRule.en;
    if (!plan) return isVi ? 'Vui lòng chọn một gói cước dịch vụ.' : 'Please select an active service plan.';
    if (
      form.connectionType === 'Dial-Up' &&
      (!form.hasExistingLandline || !form.existingLandlineAccountId.trim().toUpperCase().startsWith('T'))
    ) {
      return isVi
        ? 'Bắt buộc phải cung cấp mã tài khoản Landline (bắt đầu bằng chữ T) để đăng ký mạng Dial-Up!'
        : "An existing Landline account ID (starting with 'T') is compulsory to register for Dial-Up internet!";
    }
    return '';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const problem = validate();
    if (problem) {
      toast.error(problem);
      return;
    }
    setIsConfirming(true);
  };

  const createOrder = async () => {
    if (!plan || isCreating) return;
    setIsCreating(true);
    try {
      const order = await nexusStore.placeOrder({
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim(),
        customerEmail: form.customerEmail.trim(),
        installationAddress: installationAddress.trim(),
        idProofType: form.idProofType,
        idProofNumber: form.idProofNumber.trim(),
        connectionType: form.connectionType,
        planId: plan.id,
        planName: plan.name,
        // Đơn thuộc quầy của nhân viên đang tạo; không xác định được thì về chi nhánh SH-01.
        retailOutletCode: outletCode,
        retailEmployeeName: user?.name || 'Retail Desk',
        bulkConnectionsCount: connections,
        ...(form.connectionType === 'Dial-Up' && form.hasExistingLandline && form.existingLandlineAccountId.trim()
          ? { existingLandlineAccountId: form.existingLandlineAccountId.trim().toUpperCase() }
          : {}),
      });
      setIsConfirming(false);
      setCreatedOrder(order);
      setForm(EMPTY_FORM);
      toast.success(isVi ? `Tạo đơn hàng ${order.id} thành công!` : `Order ${order.id} successfully created!`);
    } catch (err) {
      toast.error(err?.message || (isVi ? 'Có lỗi xảy ra khi tạo đơn hàng.' : 'Failed to create order.'));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="w-full">
      <form
        onSubmit={handleSubmit}
        className="w-full space-y-6 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm"
      >
        <div>
          <StepHeading icon={User}>{isVi ? 'Bước 1: Thông tin cá nhân khách hàng' : 'Step 1: Customer Personal Details'}</StepHeading>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{isVi ? 'Họ và tên đầy đủ *' : 'Full Legal Name *'}</label>
              <input
                type="text"
                required
                placeholder={isVi ? 'Ví dụ: Nguyễn Văn Nam' : 'e.g. Julian Thorne'}
                value={form.customerName}
                onChange={set('customerName')}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>{isVi ? 'Số điện thoại liên hệ *' : 'Contact Phone *'}</label>
              <input
                type="tel"
                required
                inputMode="numeric"
                maxLength={10}
                title={isVi ? 'Số điện thoại phải gồm 10 chữ số' : 'Phone number must contain 10 digits'}
                placeholder="0912345678"
                value={form.customerPhone}
                onChange={set('customerPhone')}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>{isVi ? 'Địa chỉ Email *' : 'Email Address *'}</label>
              <input
                type="email"
                required
                placeholder="nam.nguyen@example.com"
                value={form.customerEmail}
                onChange={set('customerEmail')}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>{isVi ? 'Giấy tờ tùy thân xác thực *' : 'Identity Proof Document *'}</label>
              <div className="grid grid-cols-2 gap-2">
                <select value={form.idProofType} onChange={set('idProofType')} className={`${fieldClass} text-xs px-2`}>
                  {ID_PROOF_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {isVi ? ID_OPTION_LABELS[type][0] : ID_OPTION_LABELS[type][1]}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  required
                  inputMode={idRule.inputMode}
                  pattern={idRule.pattern}
                  maxLength={idRule.maxLength}
                  title={isVi ? idRule.vi : idRule.en}
                  placeholder={idRule.placeholder}
                  value={form.idProofNumber}
                  onChange={set('idProofNumber')}
                  className={`${fieldClass} text-xs font-mono`}
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <AddressPicker value={form.address} onChange={(address) => setForm({ ...form, address })} />
            </div>
          </div>
        </div>

        <div>
          <StepHeading icon={Wifi}>{isVi ? 'Bước 2: Loại kết nối mạng' : 'Step 2: Connection Type'}</StepHeading>
          <div className="grid grid-cols-3 gap-3">
            {CONNECTION_TYPES.map(({ type, icon: Icon, desc, descVi, labelVi }) => {
              const isSelected = form.connectionType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setForm({ ...form, connectionType: type, planId: '' })}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-slate-900 dark:text-white ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Icon className={`h-5 w-5 ${isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                    {isSelected && <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
                  </div>
                  <div>
                    <div className="font-bold text-sm">{isVi ? labelVi : type}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{isVi ? descVi : desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <StepHeading icon={FileText}>{isVi ? 'Bước 3: Chọn gói cước' : 'Step 3: Plan Selection'}</StepHeading>
          <div className="space-y-2.5">
            {availablePlans.map((p) => {
              const isSelected = plan?.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setForm({ ...form, planId: p.id })}
                  className={`w-full text-left p-4 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 ring-1 ring-emerald-500'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2.5">
                      <span className="font-bold text-base text-slate-900 dark:text-white">{getPlanName(p, language)}</span>
                      <span className="text-sm px-2.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                        {getPlanSpeedOrBandwidth(p.speedOrBandwidth, language)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{getPlanDescription(p, language)}</p>
                  </div>
                  <div className="text-right shrink-0 pl-4">
                    <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      ${p.monthlyRental.toFixed(2)}
                      <span className="text-sm font-normal text-slate-400">/{isVi ? 'th' : 'mo'}</span>
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      {isVi ? 'Cọc:' : 'Deposit:'} ${p.securityDeposit.toFixed(2)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <StepHeading icon={FileText}>
            {isVi
              ? `Bước 4: Số kết nối${form.connectionType === 'Dial-Up' ? ' & Đường dây cố định' : ''}`
              : `Step 4: Connections${form.connectionType === 'Dial-Up' ? ' & Landline' : ''}`}
          </StepHeading>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                {isVi ? 'Số lượng kết nối (1 kết nối = 1 router thiết bị)' : 'Number of connections (1 connection = 1 router)'}
              </label>
              <input type="number" min="1" value={form.bulkConnectionsCount} onChange={set('bulkConnectionsCount')} className={fieldClass} />
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                {isVi
                  ? 'Chiết khấu: từ 10 kết nối 25%, từ 15 là 50%, từ 25 là 75%; trên 50 kết nối miễn 100% và miễn tiền cọc.'
                  : 'Discount: 25% from 10 connections, 50% from 15, 75% from 25; over 50 it is 100% and the deposit is waived.'}
              </p>
            </div>
            {form.connectionType === 'Dial-Up' && (
              <div>
                <label className={labelClass}>{isVi ? 'Đường dây cố định Nexus *' : 'Existing Nexus landline *'}</label>
                <label className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-300 py-1.5">
                  <input
                    type="checkbox"
                    checked={form.hasExistingLandline}
                    onChange={(e) => setForm({ ...form, hasExistingLandline: e.target.checked })}
                    className="h-4 w-4 rounded"
                  />
                  <span>{isVi ? 'Khách đã có landline Nexus (chỉ khảo sát phần internet)' : 'Customer has a Nexus landline (only the internet leg is surveyed)'}</span>
                </label>
                {form.hasExistingLandline && (
                  <input
                    type="text"
                    placeholder={isVi ? 'Mã tài khoản landline (bắt đầu bằng T)' : 'Landline Account ID (starts with T)'}
                    value={form.existingLandlineAccountId}
                    onChange={set('existingLandlineAccountId')}
                    className={`${fieldClass} font-mono`}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
          <button
            type="submit"
            className="px-7 py-3 rounded-lg text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-md flex items-center space-x-2 cursor-pointer"
          >
            <span>{isVi ? 'Tạo đơn hàng' : 'Place Order'}</span>
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </form>

      {isConfirming && plan && (
        <ConfirmOrderModal
          draft={{ ...form, installationAddress, bulkConnectionsCount: connections }}
          plan={plan}
          branchLabel={branchLabel}
          isCreating={isCreating}
          onCancel={() => setIsConfirming(false)}
          onConfirm={createOrder}
        />
      )}
      {createdOrder && (
        <OrderCreatedModal
          order={createdOrder}
          onClose={() => setCreatedOrder(null)}
          onReview={() => {
            const id = createdOrder.id;
            setCreatedOrder(null);
            onReviewOrder(id);
          }}
        />
      )}
    </div>
  );
}
