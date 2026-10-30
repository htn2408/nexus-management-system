// Phòng kế toán: lập hoá đơn cho kết nối, theo dõi công nợ, ghi nhận thanh toán tại văn phòng,
// sửa hoá đơn và biểu cước. Mọi con số hiển thị sau khi lưu là số server tính và trả về.
// Tab và kết nối đang lập hoá đơn nằm trên URL (?tab=bill-generation&q=B064...).
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Network, Plus, Receipt, Settings, Users } from 'lucide-react';
import { toast } from 'sonner';
import BillGenerationTab from '../components/accounts/BillGenerationTab';
import ChargeSettingsTab from '../components/accounts/ChargeSettingsTab';
import ConnectionsTab from '../components/accounts/ConnectionsTab';
import EditBillModal from '../components/accounts/EditBillModal';
import InvoiceModal from '../components/accounts/InvoiceModal';
import PaymentHistoryModal from '../components/accounts/PaymentHistoryModal';
import ReceiptModal from '../components/accounts/ReceiptModal';
import SubscriberTrackingTab from '../components/accounts/SubscriberTrackingTab';
import ProfileView from '../components/common/ProfileView';
import RecordPaymentModal from '../components/common/RecordPaymentModal';
import SettingsView from '../components/common/SettingsView';
import DashboardLayout from '../components/layout/DashboardLayout';
import { authStore } from '../context/AuthContext';
import { languageStore } from '../context/LanguageContext';
import { nexusStore } from '../context/NexusContext';
import { fetchBillingSettingsApi } from '../lib/api';
import { useStore } from '../lib/store';
import { accountKey } from '../components/accounts/billMath';

const TABS = ['connections', 'bill-generation', 'subscriber-tracking', 'charge-settings', 'settings', 'profile'];

export default function AccountsDashboard() {
  const t = useStore(languageStore.t);
  const isVi = useStore(languageStore.language) === 'vi';
  const user = useStore(authStore.currentUser);
  const connections = useStore(nexusStore.connections);
  const bills = useStore(nexusStore.bills);
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const activeTab = TABS.includes(requestedTab) ? requestedTab : 'connections';
  const focus = searchParams.get('q') ?? '';

  // Biểu cước từ server; null khi chưa tải xong (nút phát hành hoá đơn chờ có thuế suất).
  const [billingSettings, setBillingSettings] = useState(null);
  useEffect(() => {
    fetchBillingSettingsApi().then(setBillingSettings, (err) =>
      toast.error(isVi ? 'Không tải được biểu cước' : 'Could not load charge settings', { description: err.message }),
    );
  }, [isVi]);

  // Modal đang mở: { kind, invoiceNumber?, payment?, title? }. Hoá đơn lấy lại từ store để luôn mới nhất.
  const [modal, setModal] = useState(null);
  const modalBill = modal?.invoiceNumber ? bills.find((b) => b.invoiceNumber === modal.invoiceNumber) : null;
  const open = (kind) => (bill) => setModal({ kind, invoiceNumber: bill.invoiceNumber });
  const close = () => setModal(null);

  const openTab = (tab, q) => {
    setModal(null);
    setSearchParams(q ? { tab, q } : { tab });
  };

  const billedKeys = new Set(bills.map((b) => accountKey(b.accountId)));
  const unbilled = connections.filter((c) => !billedKeys.has(accountKey(c.accountId))).length;
  const navItems = [
    {
      id: 'connections',
      label: t.accountsNav.connections,
      icon: Network,
      badge: unbilled || undefined,
      badgeColor: 'bg-amber-100 text-amber-900',
    },
    { id: 'bill-generation', label: t.accountsNav.billGeneration, icon: Receipt },
    {
      id: 'subscriber-tracking',
      label: isVi ? 'Theo dõi công nợ' : 'Subscriber Tracking',
      icon: Users,
      badge: bills.filter((b) => b.dueAmount > 0).length || undefined,
    },
    { id: 'charge-settings', label: t.accountsNav.chargeSettings, icon: Settings },
    { id: 'settings', label: t.accountsNav.settings, icon: Settings },
  ];

  const tabContent = {
    connections: <ConnectionsTab onBill={(c) => openTab('bill-generation', c.accountId)} />,
    'bill-generation': (
      <BillGenerationTab
        key={focus}
        initialAccountId={focus}
        taxRate={billingSettings?.serviceTaxRate ?? null}
        onCreated={(bill) =>
          setModal({
            kind: 'view',
            invoiceNumber: bill.invoiceNumber,
            title: isVi ? 'Hoá đơn vừa phát hành' : 'Invoice issued',
          })
        }
      />
    ),
    'subscriber-tracking': (
      <SubscriberTrackingTab
        onView={open('view')}
        onEdit={open('edit')}
        onHistory={open('history')}
        onPay={open('pay')}
        onReceipt={(payment) => setModal({ kind: 'receipt', payment })}
      />
    ),
    'charge-settings': billingSettings ? (
      <ChargeSettingsTab settings={billingSettings} onSaved={setBillingSettings} />
    ) : (
      <p className="text-sm text-slate-500">{isVi ? 'Đang tải biểu cước...' : 'Loading charge settings...'}</p>
    ),
    settings: <SettingsView />,
    profile: <ProfileView />,
  };

  return (
    <DashboardLayout
      activeTab={activeTab}
      onTabChange={(tab) => openTab(tab)}
      navItems={navItems}
      roleBadgeTitle={t.roles.accounts}
      pageTitle={activeTab === 'profile' ? undefined : navItems.find((n) => n.id === activeTab)?.label}
      primaryAction={
        activeTab === 'bill-generation'
          ? undefined
          : { label: t.actions.newInvoice, onClick: () => openTab('bill-generation'), icon: Plus }
      }
    >
      {tabContent[activeTab]}

      {modal?.kind === 'view' && modalBill && <InvoiceModal bill={modalBill} title={modal.title} onClose={close} />}
      {modal?.kind === 'edit' && modalBill && (
        <EditBillModal bill={modalBill} lateFeePercent={billingSettings?.latePaymentFeePercent ?? 0} onClose={close} />
      )}
      {modal?.kind === 'history' && modalBill && <PaymentHistoryModal bill={modalBill} onClose={close} />}
      {modal?.kind === 'pay' && modalBill && (
        <RecordPaymentModal
          key={modalBill.invoiceNumber}
          bill={modalBill}
          cashierName={user?.name || 'Accounts'}
          title={isVi ? 'Ghi nhận thanh toán' : 'Record payment'}
          onClose={close}
        />
      )}
      {modal?.kind === 'receipt' && <ReceiptModal payment={modal.payment} onClose={close} />}
    </DashboardLayout>
  );
}
