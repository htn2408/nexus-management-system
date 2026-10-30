// Chân trang chủ: giới thiệu, sản phẩm, các cổng đăng nhập theo vai trò, liên hệ hỗ trợ.
import { useNavigate } from 'react-router';
import { Layers } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { useStore } from '../../lib/store';
import { scrollToSection } from './scroll';

const PRODUCTS = [
  'Broadband Fiber Ultra Giga',
  'Enterprise VoIP & Landline',
  'Dial-Up Telemetry Channels',
  'Dedicated Leased Lines',
];

const ROLE_PORTALS = [
  '1. Executive Admin (Manager)',
  '2. Retail Staff (Outlets)',
  '3. Technical NOC (Field Ops)',
  '4. Billing & Accounts (Finance)',
  '5. Subscriber Portal (Customer)',
];

const headingClass = 'font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white mb-3';

export default function SiteFooter() {
  const navigate = useNavigate();
  const t = useStore(languageStore.t);

  return (
    <footer className="bg-white/80 dark:bg-[#111E2C] border-t border-[#CCE4F7] dark:border-[#253D56] py-12 transition-colors">
      <div className="w-full px-4 sm:px-6 lg:px-[40px]">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-sky-600 text-white flex items-center justify-center">
                <Layers className="h-4 w-4" />
              </div>
              <span className="font-extrabold text-base tracking-tight text-[#0F1D2B] dark:text-white">
                {t.common.brandName} {t.common.brandTag}
              </span>
            </div>
            <p className="text-xs text-[#537292] dark:text-[#8DB0D4] leading-relaxed">{t.footer.aboutText}</p>
          </div>

          <div>
            <h4 className={headingClass}>{t.footer.productsCol}</h4>
            <ul className="text-xs space-y-2 text-[#537292] dark:text-[#8DB0D4]">
              {PRODUCTS.map((name) => (
                <li key={name}>
                  <button
                    type="button"
                    onClick={() => scrollToSection('plans')}
                    className="hover:underline text-left cursor-pointer bg-transparent border-0 p-0 text-xs text-[#537292] dark:text-[#8DB0D4]"
                  >
                    {name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className={headingClass}>{t.footer.rolesCol}</h4>
            <ul className="text-xs space-y-2 text-[#537292] dark:text-[#8DB0D4]">
              {ROLE_PORTALS.map((name) => (
                <li key={name}>
                  <button type="button" onClick={() => navigate('/login')} className="hover:underline">
                    {name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className={headingClass}>{t.footer.supportCol}</h4>
            <div className="text-xs space-y-2 text-[#537292] dark:text-[#8DB0D4]">
              <p>
                NOC Hotline: <strong>1900 6868</strong> (24/7)
              </p>
              <p>
                Enterprise Support: <strong>+1 (800) 555-NEXUS</strong>
              </p>
              <p>
                Email: <strong>support@nexus.telecom</strong>
              </p>
              <p>Corporate HQ: 452 Broadway, Manhattan, NY</p>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-[#CCE4F7]/60 dark:border-[#253D56]/60 text-center text-xs text-[#537292] dark:text-[#8DB0D4] flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>© 2026 {t.footer.rights}</div>
          <div className="flex items-center space-x-4">
            <span className="hover:underline cursor-pointer">{t.footer.terms}</span>
            <span className="hover:underline cursor-pointer">{t.footer.privacy}</span>
            <span className="hover:underline cursor-pointer">{t.footer.sla}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
