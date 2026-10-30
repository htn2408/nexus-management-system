// Tab thanh toán: nhắc hạn của hoá đơn gần nhất và danh sách hoá đơn còn nợ để trả.
import { ArrowRight, Bell, Clock, CreditCard, ShieldCheck, Wallet } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { useCustomerAccount } from '../../hooks/useCustomerAccount';
import { useStore } from '../../lib/store';
import BillStatusBadge from './BillStatusBadge';

function DueReminder({ bill, isVi }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/10 via-sky-500/10 to-indigo-500/10 border border-amber-300 dark:border-amber-700/60 p-6 shadow-sm">
      <div className="flex items-start space-x-4">
        <div className="p-3 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl shrink-0 mt-0.5">
          <Bell className="h-6 w-6 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            <h3 className="text-base font-bold text-[#0F1D2B] dark:text-white">
              {isVi ? 'Nhắc nhở thanh toán cước đúng hạn' : 'On-Time Payment Reminder'}
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>{isVi ? `Hạn chót: ${bill.dueDate}` : `Due by: ${bill.dueDate}`}</span>
            </span>
          </div>
          <p className="text-xs text-[#537292] dark:text-[#8DB0D4] mt-1.5 max-w-2xl leading-relaxed">
            {isVi
              ? 'Quý khách vui lòng thanh toán trước ngày đến hạn để đường truyền không bị tạm ngừng và tránh phí trễ hạn (5% mỗi kỳ).'
              : 'Please pay before the due date so your line is not suspended and to avoid the late fee (5% per period).'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PayBalanceTab({ onPayBill }) {
  const isVi = useStore(languageStore.language) === 'vi';
  const { unpaidBills } = useCustomerAccount();
  const nextDue = unpaidBills[0] ?? null;

  return (
    <div className="space-y-6">
      {nextDue ? (
        <DueReminder bill={nextDue} isVi={isVi} />
      ) : (
        <div className="rounded-2xl bg-gradient-to-r from-emerald-500/10 to-sky-500/10 border border-emerald-200 dark:border-emerald-800/60 p-5 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-emerald-900 dark:text-emerald-200">
              {isVi ? 'Tất cả hóa đơn đã được thanh toán đầy đủ!' : 'All invoices are fully paid!'}
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              {isVi
                ? 'Cảm ơn quý khách đã luôn duy trì thói quen thanh toán cước đúng hạn cùng Nexus.'
                : 'Thank you for keeping your account in good standing with on-time payments.'}
            </p>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-white dark:bg-[#152434] border border-[#CCE4F7] dark:border-[#253D56] shadow-sm p-6">
        <h3 className="font-bold text-base text-[#0F1D2B] dark:text-white flex items-center space-x-2 mb-4">
          <Wallet className="h-5 w-5 text-sky-600 dark:text-sky-400" />
          <span>{isVi ? 'Hóa đơn & Cước phí chưa thanh toán' : 'Invoices Pending Payment'}</span>
        </h3>

        {unpaidBills.length > 0 ? (
          <div className="space-y-4">
            {unpaidBills.map((bill) => (
              <div
                key={bill.id}
                className="p-5 border border-[#CCE4F7] dark:border-[#253D56] rounded-2xl flex flex-col lg:flex-row lg:justify-between lg:items-center gap-5 bg-gradient-to-br from-[#EDF6FF] to-white dark:from-[#101C29] dark:to-[#152434]"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <span className="font-bold text-base text-[#0F1D2B] dark:text-white">
                      {isVi ? 'Hóa đơn' : 'Invoice'} #{bill.invoiceNumber}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                      {bill.planName}
                    </span>
                    <BillStatusBadge bill={bill} isVi={isVi} />
                  </div>
                  <div className="text-xs text-[#537292] dark:text-[#8DB0D4] flex items-center space-x-3 flex-wrap">
                    <span>
                      {isVi ? 'Kỳ cước' : 'Billing month'}: <strong className="text-slate-800 dark:text-slate-200">{bill.billingMonth}</strong>
                    </span>
                    <span>•</span>
                    <span className="text-rose-500 dark:text-rose-400 font-semibold">
                      {isVi ? 'Hạn thanh toán' : 'Due'}: {bill.dueDate}
                    </span>
                    {bill.status === 'Partially Paid' && (
                      <>
                        <span>•</span>
                        <span>
                          {isVi ? 'Đã thanh toán:' : 'Already paid:'}{' '}
                          <strong className="text-emerald-600 dark:text-emerald-400 font-mono">${bill.amountPaid.toFixed(2)}</strong>
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4 lg:text-right">
                  <div>
                    <div className="text-xs text-slate-500">{isVi ? 'Số tiền còn nợ' : 'Amount due'}</div>
                    <div className="text-2xl font-black font-mono text-sky-600 dark:text-sky-400">${bill.dueAmount.toFixed(2)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onPayBill(bill)}
                    className="px-5 py-2.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center space-x-2 shrink-0"
                  >
                    <CreditCard className="h-4 w-4" />
                    <span>{isVi ? 'Thanh toán ngay' : 'Pay Now'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-10 text-center border-t border-[#CCE4F7] dark:border-[#253D56]">
            <Wallet className="h-12 w-12 mx-auto text-sky-600 dark:text-sky-400 mb-3" />
            <p className="text-[#0F1D2B] dark:text-white font-bold text-sm">
              {isVi ? 'Không có hóa đơn chưa thanh toán' : 'No Outstanding Invoices'}
            </p>
            <p className="text-[#537292] dark:text-[#8DB0D4] text-xs mt-1">
              {isVi
                ? 'Tất cả các dịch vụ viễn thông của quý khách đang hoạt động bình thường.'
                : 'All telecom services are running normally and fully settled.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
