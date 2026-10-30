// Cổng thuê bao: mọi dữ liệu lấy theo mã tài khoản khách dùng để đăng nhập.
// Tab đang mở nằm trên URL (?tab=billing), nên nút Back và link từ thông báo đều mở đúng tab.
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { CreditCard, LayoutDashboard, MessageSquare, Send, Settings, ShoppingBag, Wallet } from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import ProfileView from '../components/common/ProfileView';
import SettingsView from '../components/common/SettingsView';
import BillingTab from '../components/user/BillingTab';
import FeedbackTab from '../components/user/FeedbackTab';
import LiveChatTab from '../components/user/LiveChatTab';
import NewServiceTab from '../components/user/NewServiceTab';
import OverviewTab from '../components/user/OverviewTab';
import PayBalanceTab from '../components/user/PayBalanceTab';
import PaymentModal from '../components/user/PaymentModal';
import { loadLastOrder, saveLastOrder } from '../components/user/lastOrder';
import { languageStore } from '../context/LanguageContext';
import { useCustomerAccount } from '../hooks/useCustomerAccount';
import { useStore } from '../lib/store';

const TABS = ['overview', 'new-service', 'billing', 'pay-balance', 'livechat', 'feedback', 'settings', 'profile'];

export default function UserDashboard() {
  const t = useStore(languageStore.t);
  const isVi = useStore(languageStore.language) === 'vi';
  const { shop, myFeedbacks } = useCustomerAccount();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const activeTab = TABS.includes(requestedTab) ? requestedTab : 'overview';

  const [payingBill, setPayingBill] = useState(null);
  // Đơn vừa đặt thêm: hiện banner ở tab Tổng quan và tab Đăng ký dịch vụ.
  const [lastOrder, setLastOrder] = useState(loadLastOrder);

  const openTab = (tab) => {
    setPayingBill(null);
    setSearchParams({ tab });
  };

  const rememberOrder = (order) => {
    saveLastOrder(order);
    setLastOrder(order);
  };

  const payBill = (bill) => {
    setSearchParams({ tab: 'pay-balance' });
    setPayingBill(bill);
  };

  const navItems = [
    { id: 'overview', label: t.userNav.overview, icon: LayoutDashboard },
    { id: 'new-service', label: isVi ? 'Đăng ký gói mới' : 'Order New Service', icon: ShoppingBag },
    { id: 'billing', label: t.userNav.billing, icon: CreditCard },
    { id: 'pay-balance', label: isVi ? 'Thanh toán' : 'Pay Balance', icon: Wallet },
    { id: 'livechat', label: 'Live Chat', icon: MessageSquare },
    { id: 'feedback', label: isVi ? 'Phản hồi' : 'Feedback', icon: Send, badge: myFeedbacks.length || undefined },
    { id: 'settings', label: t.userNav.settings, icon: Settings },
  ];

  const tabContent = {
    overview: <OverviewTab lastOrder={lastOrder} onDismissLastOrder={() => rememberOrder(null)} onOpenTab={openTab} />,
    'new-service': (
      <NewServiceTab lastOrder={lastOrder} onOrderPlaced={rememberOrder} onDismissLastOrder={() => rememberOrder(null)} />
    ),
    billing: <BillingTab onPayBill={payBill} onOpenTab={openTab} />,
    'pay-balance': <PayBalanceTab onPayBill={payBill} />,
    livechat: <LiveChatTab />,
    feedback: <FeedbackTab />,
    settings: <SettingsView showBranchSwitcher={false} />,
    profile: <ProfileView />,
  };

  return (
    <DashboardLayout
      activeTab={activeTab}
      onTabChange={openTab}
      navItems={navItems}
      pageTitle={activeTab === 'profile' ? undefined : navItems.find((n) => n.id === activeTab)?.label}
      roleBadgeTitle={t.roles.user}
    >
      {tabContent[activeTab]}
      {payingBill && <PaymentModal bill={payingBill} branch={shop} onClose={() => setPayingBill(null)} />}
    </DashboardLayout>
  );
}
