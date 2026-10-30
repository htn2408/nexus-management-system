// Bộ phận Kỹ thuật: khảo sát khả thi → lên lịch & cấp kết nối (gắn thiết bị) → quản lý trạng thái
// đường truyền → kho thiết bị và yêu cầu nhập hàng gửi Admin.
// Dữ liệu lấy thẳng từ /api/Technical; mọi thao tác ghi do server xử lý rồi tải lại.
// Người khảo sát / người cấp kết nối là nhân viên đang đăng nhập (mã nhân viên = user.id).
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { Activity, HardDrive, Plus, Radio, RefreshCw, Settings, Truck } from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import ProfileView from '../components/common/ProfileView';
import SettingsView from '../components/common/SettingsView';
import AddEquipmentModal from '../components/technical/AddEquipmentModal';
import ConnectionManagerTab from '../components/technical/ConnectionManagerTab';
import EquipmentRequestModal from '../components/technical/EquipmentRequestModal';
import EquipmentRequestsTab from '../components/technical/EquipmentRequestsTab';
import EquipmentTrackerTab from '../components/technical/EquipmentTrackerTab';
import FeasibilityQueueTab from '../components/technical/FeasibilityQueueTab';
import ProvisionModal from '../components/technical/ProvisionModal';
import ScheduleModal from '../components/technical/ScheduleModal';
import SurveyResultModal from '../components/technical/SurveyResultModal';
import { authStore } from '../context/AuthContext';
import { languageStore } from '../context/LanguageContext';
import { nexusStore } from '../context/NexusContext';
import { technicalErrorMessage, useTechnicalWorkspace } from '../hooks/useTechnicalWorkspace';
import { useStore } from '../lib/store';
import { exportTechnicalReportPdf } from '../lib/technicalReportPdf';

const TABS = [
  'feasibility-queue',
  'connection-manager',
  'equipment-tracker',
  'equipment-requests',
  'settings',
  'profile',
];

export default function TechnicalDashboard() {
  const t = useStore(languageStore.t);
  const language = useStore(languageStore.language);
  const isVi = language === 'vi';
  const user = useStore(authStore.currentUser);
  const orders = useStore(nexusStore.orders);
  const connections = useStore(nexusStore.connections);
  const equipments = useStore(nexusStore.equipments);
  const inventory = useStore(nexusStore.inventory);
  const requests = useStore(nexusStore.equipmentRequests);
  const { isLoading, error, refresh } = useTechnicalWorkspace();

  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const activeTab = TABS.includes(requestedTab) ? requestedTab : 'feasibility-queue';
  const focus = searchParams.get('q') ?? '';

  // Modal đang mở: { kind, orderId?, feasible? }. Đơn lấy lại từ store để luôn là bản mới nhất.
  const [modal, setModal] = useState(null);
  const modalOrder = modal?.orderId ? orders.find((o) => o.id === modal.orderId) : null;
  const closeModal = () => setModal(null);

  const engineerId = user?.id ?? '';
  const engineerName = user?.name ?? '';

  // Sau mỗi thao tác ghi: tải lại; lỗi tải lại chỉ báo, thao tác trước đó đã lưu.
  const reload = async () => {
    try {
      await refresh();
    } catch (err) {
      toast.error(technicalErrorMessage(err));
    }
  };

  const openTab = (tab, q) => {
    setModal(null);
    setSearchParams(q ? { tab, q } : { tab });
  };

  const exportPdf = async () => {
    try {
      await exportTechnicalReportPdf({ orders, connections, equipments, inventory, language });
      toast.success(isVi ? 'Đã tải báo cáo PDF kỹ thuật.' : 'Technical PDF report downloaded.');
    } catch (err) {
      toast.error(technicalErrorMessage(err));
    }
  };

  const navItems = [
    {
      id: 'feasibility-queue',
      label: t.techNav.feasibilityQueue,
      icon: Activity,
      badge: orders.filter((o) => o.status === 'Pending').length || undefined,
      badgeColor: 'bg-amber-100 text-amber-900',
    },
    {
      id: 'connection-manager',
      label: t.techNav.connectionManager,
      icon: Radio,
      badge: connections.length || undefined,
    },
    {
      id: 'equipment-tracker',
      label: t.techNav.equipmentTracker,
      icon: HardDrive,
      badge: equipments.length || undefined,
    },
    {
      id: 'equipment-requests',
      label: isVi ? 'Yêu cầu nhập hàng' : 'Equipment Requests',
      icon: Truck,
      badge: requests.filter((r) => r.status === 'Pending').length || undefined,
      badgeColor: 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300',
    },
    { id: 'settings', label: t.techNav.settings, icon: Settings },
  ];

  const primaryAction =
    activeTab === 'equipment-tracker'
      ? {
          label: isVi ? 'Đăng ký thiết bị' : 'Register Hardware',
          onClick: () => setModal({ kind: 'add-equipment' }),
          icon: Plus,
        }
      : activeTab === 'equipment-requests'
        ? {
            label: isVi ? 'Gửi yêu cầu nhập hàng' : 'New Import Request',
            onClick: () => setModal({ kind: 'request' }),
            icon: Plus,
          }
        : undefined;

  const tabContent = {
    'feasibility-queue': (
      <FeasibilityQueueTab
        onSurvey={(order, feasible) => setModal({ kind: 'survey', orderId: order.id, feasible })}
        onSchedule={(order) => setModal({ kind: 'schedule', orderId: order.id })}
        onProvision={(order) => setModal({ kind: 'provision', orderId: order.id })}
      />
    ),
    'connection-manager': (
      <ConnectionManagerTab
        key={focus}
        initialAccountId={focus}
        engineerId={engineerId}
        engineerName={engineerName}
        onSaved={reload}
      />
    ),
    'equipment-tracker': <EquipmentTrackerTab onSaved={reload} />,
    'equipment-requests': <EquipmentRequestsTab onNewRequest={() => setModal({ kind: 'request' })} />,
    settings: <SettingsView />,
    profile: <ProfileView />,
  };

  return (
    <DashboardLayout
      activeTab={activeTab}
      onTabChange={(tab) => openTab(tab)}
      navItems={navItems}
      roleBadgeTitle={t.roles.technical}
      pageTitle={activeTab === 'profile' ? undefined : navItems.find((n) => n.id === activeTab)?.label}
      exportAction={{ label: isVi ? 'Xuất PDF' : 'Export PDF', onClick: exportPdf }}
      primaryAction={primaryAction}
    >
      {(isLoading || error) && (
        <div
          className={`mb-4 flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs ${
            error && !isLoading
              ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300'
              : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? (isVi ? 'Đang đồng bộ dữ liệu kỹ thuật...' : 'Syncing technical data...') : error}</span>
          </div>
          {error && !isLoading && (
            <button type="button" onClick={reload} className="font-semibold underline">
              {isVi ? 'Thử lại' : 'Retry'}
            </button>
          )}
        </div>
      )}

      {tabContent[activeTab]}

      {modal?.kind === 'survey' && modalOrder && (
        <SurveyResultModal
          order={modalOrder}
          feasible={modal.feasible}
          engineerId={engineerId}
          onClose={closeModal}
          onSaved={reload}
        />
      )}
      {modal?.kind === 'schedule' && modalOrder && (
        <ScheduleModal
          order={modalOrder}
          engineerId={engineerId}
          engineerName={engineerName}
          onClose={closeModal}
          onSaved={reload}
        />
      )}
      {modal?.kind === 'provision' && modalOrder && (
        <ProvisionModal
          order={modalOrder}
          engineerId={engineerId}
          onClose={closeModal}
          onSaved={reload}
          onRequestEquipment={(order) => setModal({ kind: 'request', orderId: order.id })}
        />
      )}
      {modal?.kind === 'request' && <EquipmentRequestModal order={modalOrder} onClose={closeModal} />}
      {modal?.kind === 'add-equipment' && <AddEquipmentModal onClose={closeModal} onSaved={reload} />}
    </DashboardLayout>
  );
}
