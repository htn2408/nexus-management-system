// Quản trị (Manager): nhân viên, kho, nhà cung cấp, mua hàng, chi nhánh, gói cước,
// chat với khách và phản hồi. Mọi thao tác ghi lên server trước rồi mới đổi màn hình.
// Tab nằm trên URL (?tab=plans); thông báo chat mở thẳng phiên (?tab=livechat&session=...).
import { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import {
  Headset,
  Layers,
  LayoutDashboard,
  MessageSquare,
  Package,
  Settings,
  ShoppingCart,
  Store,
  Truck,
  Users,
} from 'lucide-react';
import AdminChatTab from '../components/admin/AdminChatTab';
import EmployeesTab from '../components/admin/EmployeesTab';
import FeedbackTab from '../components/admin/FeedbackTab';
import OverviewTab from '../components/admin/OverviewTab';
import PlansTab from '../components/admin/PlansTab';
import PurchasesTab from '../components/admin/PurchasesTab';
import ShopsTab from '../components/admin/ShopsTab';
import StockTab from '../components/admin/StockTab';
import VendorsTab from '../components/admin/VendorsTab';
import ProfileView from '../components/common/ProfileView';
import SettingsView from '../components/common/SettingsView';
import DashboardLayout from '../components/layout/DashboardLayout';
import { languageStore } from '../context/LanguageContext';
import { nexusStore } from '../context/NexusContext';
import { useChatSessions } from '../hooks/useChatSessions';
import { useStore } from '../lib/store';

const TABS = [
  'overview',
  'employees',
  'stock',
  'vendors',
  'purchases',
  'shops',
  'plans',
  'livechat',
  'feedback',
  'settings',
  'profile',
];

export default function AdminDashboard() {
  const t = useStore(languageStore.t);
  const isVi = useStore(languageStore.language) === 'vi';
  const inventory = useStore(nexusStore.inventory);
  const requests = useStore(nexusStore.equipmentRequests);
  const feedbacks = useStore(nexusStore.feedbacks);
  const { sessions, markReadLocally, unread } = useChatSessions();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const activeTab = TABS.includes(requestedTab) ? requestedTab : 'overview';

  // Đơn mua và yêu cầu nhập hàng không nằm trong lần đồng bộ chung: tải khi mở trang.
  useEffect(() => {
    nexusStore.refreshPurchaseOrders();
    nexusStore.refreshEquipmentRequests();
  }, []);

  const openTab = (tab) => setSearchParams({ tab });

  const navItems = [
    { id: 'overview', label: t.adminNav.overview, icon: LayoutDashboard },
    { id: 'employees', label: t.adminNav.employees, icon: Users },
    {
      id: 'stock',
      label: t.adminNav.stock,
      icon: Package,
      badge: inventory.filter((i) => i.stockQuantity <= i.reorderLevel).length || undefined,
      badgeColor: 'bg-rose-100 text-rose-800',
    },
    { id: 'vendors', label: t.adminNav.vendors, icon: Truck },
    {
      id: 'purchases',
      label: isVi ? 'Mua hàng & nhập kho' : 'Purchasing',
      icon: ShoppingCart,
      badge: requests.filter((r) => r.status === 'Pending').length || undefined,
      badgeColor: 'bg-amber-100 text-amber-900',
    },
    { id: 'shops', label: t.adminNav.shops, icon: Store },
    { id: 'plans', label: t.adminNav.plans, icon: Layers },
    {
      id: 'livechat',
      label: 'Live Chat',
      icon: Headset,
      badge: unread || undefined,
      badgeColor: 'bg-rose-100 text-rose-800',
    },
    {
      id: 'feedback',
      label: isVi ? 'Phản hồi khách hàng' : 'Customer Feedback',
      icon: MessageSquare,
      badge: feedbacks.filter((f) => !f.response).length || undefined,
    },
    { id: 'settings', label: t.adminNav.settings, icon: Settings },
  ];

  const tabContent = {
    overview: <OverviewTab onOpenTab={openTab} chatUnread={unread} />,
    employees: <EmployeesTab />,
    stock: <StockTab />,
    vendors: <VendorsTab />,
    purchases: <PurchasesTab />,
    shops: <ShopsTab />,
    plans: <PlansTab />,
    livechat: (
      <AdminChatTab sessions={sessions} initialSessionId={searchParams.get('session')} onRead={markReadLocally} />
    ),
    feedback: <FeedbackTab />,
    settings: <SettingsView />,
    profile: <ProfileView />,
  };

  return (
    <DashboardLayout
      activeTab={activeTab}
      onTabChange={openTab}
      navItems={navItems}
      roleBadgeTitle={t.roles.admin}
      pageTitle={activeTab === 'profile' ? undefined : navItems.find((n) => n.id === activeTab)?.label}
    >
      {tabContent[activeTab]}
    </DashboardLayout>
  );
}
