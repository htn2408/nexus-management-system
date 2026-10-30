// Thanh bên trái của dashboard: logo, danh sách tab và vai trò người đang đăng nhập.
//   navItems: [{ id, label, icon, badge?, badgeColor? }]
import { Calculator, ShieldCheck, ShoppingBag, Sparkles, User, Wrench } from 'lucide-react';
import { authStore } from '../../context/AuthContext';
import { languageStore } from '../../context/LanguageContext';
import { useStore } from '../../lib/store';

const ROLE_ICONS = {
  admin: ShieldCheck,
  retail: ShoppingBag,
  technical: Wrench,
  accounts: Calculator,
};

function NavButton({ item, isActive, onClick }) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center justify-between py-3 px-4 text-sm font-medium transition-all duration-200 group text-left border-l-4 ${
        isActive
          ? 'border-sky-600 dark:border-sky-400 bg-white/90 dark:bg-[#1E3349] text-sky-700 dark:text-sky-300 font-semibold shadow-xs'
          : 'border-transparent text-[#2C4764] dark:text-[#94B5D6] hover:text-[#0F1D2B] dark:hover:text-white hover:bg-white/60 dark:hover:bg-[#1E3349]/50'
      }`}
    >
      <div className="flex items-center space-x-3.5 min-w-0 truncate">
        <Icon
          className={`h-4 w-4 shrink-0 transition-colors ${
            isActive
              ? 'text-sky-600 dark:text-sky-400'
              : 'text-[#537292] dark:text-[#7A9BBF] group-hover:text-[#0F1D2B] dark:group-hover:text-white'
          }`}
        />
        <span className="truncate">{item.label}</span>
      </div>

      {item.badge !== undefined && (
        <span
          className={`text-xs px-2 py-0.5 rounded-full shrink-0 font-medium ${
            item.badgeColor ||
            (isActive
              ? 'bg-sky-600 dark:bg-sky-500 text-white'
              : 'bg-sky-100 dark:bg-[#1E3349] text-sky-800 dark:text-sky-200 border border-[#CCE4F7] dark:border-[#253D56]')
          }`}
        >
          {item.badge}
        </span>
      )}
    </button>
  );
}

export default function DashboardSidebar({ isOpen, navItems, activeTab, onTabChange, roleBadgeTitle }) {
  const user = useStore(authStore.currentUser);
  const t = useStore(languageStore.t);
  const RoleIcon = ROLE_ICONS[user?.role] ?? User;

  return (
    <aside
      className={`transition-all duration-300 ease-in-out shrink-0 bg-[#EDF6FF] dark:bg-[#152434] border-r border-[#CCE4F7] dark:border-[#253D56] flex flex-col justify-between z-30 h-full select-none overflow-hidden ${
        isOpen ? 'w-64 min-w-[16rem] opacity-100 shadow-sm' : 'w-0 min-w-0 opacity-0 overflow-hidden border-r-0'
      }`}
    >
      <div className="flex flex-col h-full overflow-hidden">
        <div className="h-16 border-b border-[#CCE4F7] dark:border-[#253D56] flex items-center px-5 space-x-3 shrink-0">
          <div className="h-9 w-9 rounded-full bg-[#D8ECFC] dark:bg-[#1E3349] border border-[#BBDDF5] dark:border-[#2A4460] flex items-center justify-center text-sky-700 dark:text-sky-300 shadow-xs shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1 truncate">
            <div className="font-bold text-base tracking-tight text-sky-900 dark:text-sky-300 leading-tight flex items-center gap-1">
              <span>Nexus</span>
              <span className="text-[10px] uppercase tracking-wider text-sky-800 dark:text-sky-200 font-semibold bg-sky-500/15 px-1 rounded">
                {user?.role || 'SMS'}
              </span>
            </div>
            <div className="text-[11px] text-[#537292] dark:text-[#8DB0D4] truncate">Nexus Marketing System</div>
          </div>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto space-y-0.5">
          {navItems.map((item) => (
            <NavButton key={item.id} item={item} isActive={activeTab === item.id} onClick={() => onTabChange(item.id)} />
          ))}
        </nav>

        <div className="p-3.5 border-t border-[#CCE4F7] dark:border-[#253D56] bg-[#E5F2FC]/70 dark:bg-[#111E2C]/70 text-xs text-[#537292] dark:text-[#88A9CB] space-y-1.5 shrink-0">
          <div className="flex items-center space-x-2 text-[#1B2D40] dark:text-[#E0F1FF] font-semibold truncate">
            <RoleIcon className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
            <span className="truncate">
              {roleBadgeTitle || (user?.role && t.roles[user.role]) || user?.title || 'Nexus User'}
            </span>
          </div>
          <div className="text-[10px] text-[#6B8FB5] dark:text-[#5E7F9F] flex items-center justify-between pt-0.5">
            <span>{t.common.stationReady}</span>
            <span>v2.4</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
