// Quản lý nhân viên (spec: chỉ Admin). Xoá = chuyển sang Inactive (backend giữ lịch sử).
// Mật khẩu: khi tạo để trống thì backend đặt mật khẩu mặc định; khi sửa để trống là GIỮ NGUYÊN.
import { useState } from 'react';
import { Users } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { nexusStore } from '../../context/NexusContext';
import { useServerAction } from '../../hooks/useServerAction';
import { useStore } from '../../lib/store';
import ConfirmDialog from '../common/ConfirmDialog';
import ModalShell from '../common/ModalShell';
import { CANCEL_BTN, FIELD_CLS, LABEL_CLS } from '../common/formStyles';
import CatalogTable from './CatalogTable';

// Chỉ 4 vai trò có trang làm việc; phòng ban mặc định theo vai trò.
const ROLES = [
  { role: 'Manager', department: 'Administration', vi: 'Quản trị' },
  { role: 'Retail Staff', department: 'Retail Outlets', vi: 'Bán lẻ' },
  { role: 'Field Engineer', department: 'Technical Operations', vi: 'Kỹ thuật' },
  { role: 'Senior Accountant', department: 'Finance & Accounts', vi: 'Kế toán' },
];
const STATUS_CHIP = {
  Active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  Inactive: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  Suspended: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
};

function EmployeeModal({ employee, shops, onClose }) {
  const isVi = useStore(languageStore.language) === 'vi';
  const isNew = !employee.id;
  const [form, setForm] = useState(() => ({
    name: employee.name ?? '',
    email: employee.email ?? '',
    phone: employee.phone ?? '',
    role: employee.role ?? 'Retail Staff',
    storeId: employee.retailShopAssigned ?? '',
    status: employee.status ?? 'Active',
    dateOfJoining: employee.dateOfJoining || new Date().toISOString().slice(0, 10),
    password: '',
  }));
  const { busy, run } = useServerAction(isVi);
  const set = (f) => (e) => setForm((prev) => ({ ...prev, [f]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const department = ROLES.find((r) => r.role === form.role)?.department;
    const data = { ...form, department, retailShopAssigned: form.storeId };
    const ok = await run(
      () =>
        isNew
          ? nexusStore.addEmployee(data, form.password)
          : nexusStore.updateEmployee(employee.id, data, form.password),
      isVi ? `Đã lưu nhân viên ${form.name}.` : `Saved ${form.name}.`,
    );
    if (ok) onClose();
  };

  return (
    <ModalShell
      icon={Users}
      iconClass="text-indigo-500"
      title={isNew ? (isVi ? 'Thêm nhân viên' : 'Add employee') : isVi ? 'Sửa nhân viên' : 'Edit employee'}
      subtitle={employee.employeeCode}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={LABEL_CLS}>{isVi ? 'Họ tên *' : 'Full name *'}</label>
            <input required maxLength={100} value={form.name} onChange={set('name')} className={FIELD_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>Email *</label>
            <input
              required
              type="email"
              maxLength={100}
              value={form.email}
              onChange={set('email')}
              className={FIELD_CLS}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>{isVi ? 'Điện thoại *' : 'Phone *'}</label>
            <input required maxLength={20} value={form.phone} onChange={set('phone')} className={FIELD_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>{isVi ? 'Vai trò' : 'Role'}</label>
            <select value={form.role} onChange={set('role')} className={FIELD_CLS}>
              {ROLES.map((r) => (
                <option key={r.role} value={r.role}>
                  {isVi ? `${r.vi} (${r.role})` : r.role}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL_CLS}>{isVi ? 'Chi nhánh' : 'Branch'}</label>
            <select value={form.storeId} onChange={set('storeId')} className={FIELD_CLS}>
              <option value="">{isVi ? 'Văn phòng chính (không thuộc chi nhánh)' : 'Head office (no branch)'}</option>
              {shops.map((s) => (
                <option key={s.shopCode} value={s.shopCode}>
                  {s.name} ({s.shopCode})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL_CLS}>{isVi ? 'Trạng thái' : 'Status'}</label>
            <select value={form.status} onChange={set('status')} className={FIELD_CLS}>
              {Object.keys(STATUS_CHIP).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL_CLS}>{isVi ? 'Ngày vào làm' : 'Date of joining'}</label>
            <input type="date" value={form.dateOfJoining} onChange={set('dateOfJoining')} className={FIELD_CLS} />
          </div>
          <div className="col-span-2">
            <label className={LABEL_CLS}>
              {isNew ? (isVi ? 'Mật khẩu' : 'Password') : isVi ? 'Đặt mật khẩu mới' : 'Set a new password'}
            </label>
            <input
              type="password"
              autoComplete="new-password"
              minLength={6}
              value={form.password}
              onChange={set('password')}
              className={FIELD_CLS}
            />
            <p className="text-[10px] text-slate-500 mt-0.5">
              {isNew
                ? isVi
                  ? 'Để trống thì dùng mật khẩu mặc định của hệ thống; nhân viên nên đổi sau lần đăng nhập đầu.'
                  : 'Leave blank to use the system default; the employee should change it after first sign-in.'
                : isVi
                  ? 'Để trống thì mật khẩu hiện tại giữ nguyên.'
                  : 'Leave blank to keep the current password.'}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className={CANCEL_BTN}>
            {isVi ? 'Hủy' : 'Cancel'}
          </button>
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 rounded-lg text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow disabled:opacity-60"
          >
            {busy ? (isVi ? 'Đang lưu...' : 'Saving...') : isVi ? 'Lưu' : 'Save'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export default function EmployeesTab() {
  const isVi = useStore(languageStore.language) === 'vi';
  const employees = useStore(nexusStore.employees);
  const shops = useStore(nexusStore.retailShops);
  const [editing, setEditing] = useState(null);
  const [deactivating, setDeactivating] = useState(null);
  const { busy, run } = useServerAction(isVi);
  const shopName = (code) => shops.find((s) => s.shopCode === code)?.name;

  const deactivate = async () => {
    const ok = await run(
      () => nexusStore.deleteEmployee(deactivating.id),
      isVi ? `${deactivating.name} đã chuyển sang Inactive.` : `${deactivating.name} is now inactive.`,
    );
    if (ok) setDeactivating(null);
  };

  return (
    <>
      <CatalogTable
        items={employees}
        searchText={(e) => [e.name, e.email, e.employeeCode, e.phone]}
        searchPlaceholder={isVi ? 'Tìm theo tên, email, mã nhân viên, SĐT...' : 'Search name, email, code, phone...'}
        filter={{ get: (e) => e.role, allLabel: isVi ? 'Tất cả vai trò' : 'All roles' }}
        addLabel={isVi ? 'Thêm nhân viên' : 'Add employee'}
        onAdd={() => setEditing({})}
        onEdit={setEditing}
        onDelete={(e) => e.status !== 'Inactive' && setDeactivating(e)}
        deleteTitle={isVi ? 'Ngừng hoạt động' : 'Deactivate'}
        columns={[
          {
            header: isVi ? 'Nhân viên' : 'Employee',
            cell: (e) => (
              <>
                <div className="font-semibold text-slate-900 dark:text-white">{e.name}</div>
                <div className="font-mono text-[10px] text-slate-500">{e.employeeCode}</div>
              </>
            ),
          },
          {
            header: isVi ? 'Liên hệ' : 'Contact',
            cell: (e) => (
              <>
                <div>{e.email}</div>
                <div className="text-slate-500">{e.phone}</div>
              </>
            ),
          },
          { header: isVi ? 'Vai trò' : 'Role', cell: (e) => e.role },
          {
            header: isVi ? 'Chi nhánh' : 'Branch',
            cell: (e) =>
              e.retailShopAssigned
                ? `${shopName(e.retailShopAssigned) ?? ''} (${e.retailShopAssigned})`
                : isVi
                  ? 'Văn phòng chính'
                  : 'Head office',
          },
          {
            header: isVi ? 'Trạng thái' : 'Status',
            cell: (e) => (
              <span
                className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_CHIP[e.status] ?? STATUS_CHIP.Inactive}`}
              >
                {e.status}
              </span>
            ),
          },
        ]}
      />
      {editing && (
        <EmployeeModal key={editing.id ?? 'new'} employee={editing} shops={shops} onClose={() => setEditing(null)} />
      )}
      {deactivating && (
        <ConfirmDialog
          title={isVi ? 'Ngừng hoạt động nhân viên' : 'Deactivate employee'}
          message={
            isVi
              ? `${deactivating.name} (${deactivating.employeeCode}) sẽ không đăng nhập được nữa. Lịch sử công việc vẫn được giữ.`
              : `${deactivating.name} (${deactivating.employeeCode}) will no longer be able to sign in. Work history is kept.`
          }
          confirmLabel={isVi ? 'Ngừng hoạt động' : 'Deactivate'}
          busy={busy}
          onConfirm={deactivate}
          onCancel={() => setDeactivating(null)}
        />
      )}
    </>
  );
}
