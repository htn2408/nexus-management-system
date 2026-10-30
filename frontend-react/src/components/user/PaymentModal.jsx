// Khách tự trả một hoá đơn online.
// Hệ thống chưa nối cổng thanh toán thật: bấm xác nhận sẽ ghi nhận khoản thanh toán vào CSDL
// (đúng số còn nợ) với hình thức khách chọn, không trừ tiền ở đâu cả. Tiền mặt thì phải nộp
// tại quầy, nhân viên chi nhánh mới ghi nhận được.
import { useState } from 'react';
import { toast } from 'sonner';
import { Banknote, Building, CreditCard, Info, Smartphone, Wallet, X } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { nexusStore } from '../../context/NexusContext';
import { useStore } from '../../lib/store';

const METHODS = [
  { mode: 'Bank Transfer/NEFT', icon: Building, vi: 'Chuyển khoản', en: 'Bank transfer', prefix: 'BANK' },
  { mode: 'Credit/Debit Card', icon: CreditCard, vi: 'Thẻ ngân hàng', en: 'Card', prefix: 'CARD' },
  { mode: 'UPI/Digital Wallet', icon: Smartphone, vi: 'Ví điện tử', en: 'E-wallet', prefix: 'WALLET' },
  { mode: 'Cash', icon: Banknote, vi: 'Tiền mặt tại quầy', en: 'Cash at a branch', prefix: 'CASH' },
];

export default function PaymentModal({ bill, branch, onClose }) {
  const isVi = useStore(languageStore.language) === 'vi';
  const [method, setMethod] = useState(METHODS[0]);
  const [isPaying, setIsPaying] = useState(false);
  const amount = bill.dueAmount;
  const isCash = method.mode === 'Cash';

  const confirm = async () => {
    if (isPaying || isCash) return;
    setIsPaying(true);
    try {
      await nexusStore.recordPayment(
        bill.invoiceNumber,
        amount,
        method.mode,
        `${method.prefix}-${Date.now().toString().slice(-6)}`,
        isVi ? 'User Portal (Khách hàng)' : 'User Portal (Customer)',
      );
      toast.success(
        isVi
          ? `Đã ghi nhận thanh toán $${amount.toFixed(2)} cho hóa đơn ${bill.invoiceNumber}.`
          : `Recorded a $${amount.toFixed(2)} payment for invoice ${bill.invoiceNumber}.`,
      );
      onClose();
    } catch (err) {
      toast.error(isVi ? 'Chưa ghi nhận được thanh toán' : 'Payment was not recorded', {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#152434] rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-sky-500/20 text-sky-600 dark:text-sky-400 rounded-lg">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {isVi ? 'Thanh toán hóa đơn' : 'Pay Invoice'}
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                {isVi ? 'Hóa đơn' : 'Invoice'}: #{bill.invoiceNumber}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          <div className="p-4 rounded-xl bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-blue-500/10 border border-sky-200 dark:border-sky-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                {isVi ? 'Thông tin thanh toán' : 'Payment Details'}
              </div>
              <div className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">
                {bill.planName} · {bill.customerName}
              </div>
              <div className="text-xs text-slate-500">
                {isVi ? 'Kỳ cước' : 'Billing month'}: {bill.billingMonth} · {isVi ? 'Hạn' : 'Due'} {bill.dueDate}
              </div>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-xs text-slate-500">{isVi ? 'Số tiền còn nợ' : 'Amount due'}</div>
              <div className="text-2xl font-black font-mono text-sky-600 dark:text-sky-400">${amount.toFixed(2)}</div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {isVi ? 'Hình thức thanh toán' : 'Payment method'}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {METHODS.map((m) => {
                const Icon = m.icon;
                const active = m.mode === method.mode;
                return (
                  <button
                    key={m.mode}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition cursor-pointer ${
                      active
                        ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 ring-2 ring-sky-500/20'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-center">{isVi ? m.vi : m.en}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {isCash ? (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 space-y-1">
              <div className="font-bold">{isVi ? 'Nộp tiền mặt tại chi nhánh' : 'Pay cash at a branch'}</div>
              <p>
                {isVi
                  ? `Mang mã hóa đơn #${bill.invoiceNumber} (hoặc mã tài khoản ${bill.accountId}) tới quầy${branch ? ` ${branch.name}, ${branch.address}` : ''}. Nhân viên sẽ thu tiền và ghi nhận vào hệ thống.`
                  : `Bring invoice #${bill.invoiceNumber} (or Account ID ${bill.accountId}) to the counter${branch ? ` at ${branch.name}, ${branch.address}` : ''}. Staff will take the payment and record it.`}
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2.5">
              <Info className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
              <span>
                {isVi
                  ? 'Bản demo chưa nối cổng thanh toán thật: bấm xác nhận sẽ ghi nhận khoản thanh toán vào hệ thống, không trừ tiền ở đâu cả.'
                  : 'This demo is not connected to a real payment gateway: confirming records the payment in the system without charging anything.'}
              </span>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5 bg-slate-50/50 dark:bg-slate-800/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            {isCash ? (isVi ? 'Đóng' : 'Close') : isVi ? 'Hủy' : 'Cancel'}
          </button>
          {!isCash && (
            <button
              type="button"
              onClick={confirm}
              disabled={isPaying}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white shadow-md transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isPaying
                ? isVi
                  ? 'Đang ghi nhận...'
                  : 'Recording...'
                : isVi
                  ? `Xác nhận thanh toán $${amount.toFixed(2)}`
                  : `Confirm $${amount.toFixed(2)} payment`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
