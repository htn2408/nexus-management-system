// Quầy bán lẻ: tạo đơn → duyệt hồ sơ chi nhánh → theo dõi đơn đã chuyển kỹ thuật →
// tra cứu thuê bao và thu tiền tại quầy.
// Tab và từ khoá đang tra (?tab=order-tracking&q=B064...) nằm trên URL, nên chuyển giữa các tab
// ("Xem tiến độ", "Mở chi tiết thuê bao") mở đúng bản ghi và nút Back vẫn hoạt động.
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { Clock, CreditCard, FileText, Settings, ShoppingBag, Wifi } from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import ProfileView from '../components/common/ProfileView';
import SettingsView from '../components/common/SettingsView';
import ApprovalQueueTab from '../components/retail/ApprovalQueueTab';
import ConnectionDetailsTab from '../components/retail/ConnectionDetailsTab';
import NewOrderTab from '../components/retail/NewOrderTab';
import OrderTrackingTab from '../components/retail/OrderTrackingTab';
import PaymentRecordsTab from '../components/retail/PaymentRecordsTab';
import RecordPaymentModal from '../components/common/RecordPaymentModal';
import { languageStore } from '../context/LanguageContext';
import { nexusStore } from '../context/NexusContext';
import { useRetailBranch } from '../hooks/useRetailBranch';
import { useStore } from '../lib/store';
import { isReleasedToTechnical } from '../types/nexus';

const TABS = [
  'new-order',
  'approval-queue',
  'order-tracking',
  'connection-details',
  'payment-records',
  'settings',
  'profile',
];

export default function RetailDashboard() {
  const t = useStore(languageStore.t);
  const isVi = useStore(languageStore.language) === 'vi';
  const orders = useStore(nexusStore.orders);
  const connections = useStore(nexusStore.connections);
  const bills = useStore(nexusStore.bills);
  const { user, belongsToDesk } = useRetailBranch();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const activeTab = TABS.includes(requestedTab) ? requestedTab : 'approval-queue';
  const focus = searchParams.get('q') ?? '';

  const [payingInvoice, setPayingInvoice] = useState(null);
  // Lấy hoá đơn từ store mỗi lần render để modal luôn thấy số nợ mới nhất.
  const payingBill = payingInvoice ? bills.find((b) => b.invoiceNumber === payingInvoice) : null;

  const openTab = (tab, q) => {
    setPayingInvoice(null);
    setSearchParams(q ? { tab, q } : { tab });
  };

  const deskOrders = orders.filter(belongsToDesk);
  const navItems = [
    { id: 'new-order', label: t.retailNav.newOrder, icon: ShoppingBag },
    {
      id: 'approval-queue',
      label: isVi ? 'Duyệt hồ sơ chi nhánh' : 'Branch Approval Queue',
      icon: FileText,
      badge: deskOrders.filter((o) => o.status === 'PendingRetail').length || undefined,
      badgeColor: 'bg-amber-100 text-amber-900',
    },
    {
      id: 'order-tracking',
      label: t.retailNav.orderTracking,
      icon: Clock,
      badge: deskOrders.filter((o) => isReleasedToTechnical(o.status)).length || undefined,
    },
    {
      id: 'connection-details',
      label: t.retailNav.connectionDetails,
      icon: Wifi,
      badge: connections.length || undefined,
    },
    { id: 'payment-records', label: t.retailNav.paymentRecords, icon: CreditCard, badge: bills.length || undefined },
    { id: 'settings', label: t.retailNav.settings, icon: Settings },
  ];

  const payBill = (bill) => setPayingInvoice(bill.invoiceNumber);

  // key theo từ khoá: mở tab từ một liên kết khác thì tab khởi tạo lại với bản ghi được chọn.
  const tabContent = {
    'new-order': <NewOrderTab onReviewOrder={(id) => openTab('approval-queue', id)} />,
    'approval-queue': (
      <ApprovalQueueTab key={focus} initialSearch={focus} onViewProgress={(id) => openTab('order-tracking', id)} />
    ),
    'order-tracking': (
      <OrderTrackingTab
        key={focus}
        initialSearch={focus}
        onOpenApprovalQueue={() => openTab('approval-queue')}
        onOpenConnection={(accountId) => openTab('connection-details', accountId)}
      />
    ),
    'connection-details': <ConnectionDetailsTab key={focus} initialAccountId={focus} onOpenPayment={payBill} />,
    'payment-records': <PaymentRecordsTab onOpenPayment={payBill} />,
    settings: <SettingsView />,
    profile: <ProfileView />,
  };

  return (
    <DashboardLayout
      activeTab={activeTab}
      onTabChange={(tab) => openTab(tab)}
      navItems={navItems}
      pageTitle={activeTab === 'profile' ? undefined : navItems.find((n) => n.id === activeTab)?.label}
      roleBadgeTitle={t.roles.retail}
    >
      {tabContent[activeTab]}
      {payingBill && (
        <RecordPaymentModal
          key={payingBill.invoiceNumber}
          bill={payingBill}
          cashierName={user?.name || 'Retail Counter Cashier'}
          onClose={() => setPayingInvoice(null)}
        />
      )}
    </DashboardLayout>
  );
}
