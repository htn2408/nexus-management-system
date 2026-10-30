// Khu điểm bán lẻ: địa chỉ, giờ mở cửa và số điện thoại từng chi nhánh.
import { Clock, MapPin, PhoneCall } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { nexusStore } from '../../context/NexusContext';
import { useStore } from '../../lib/store';

export default function ShopsSection() {
  const t = useStore(languageStore.t);
  const retailShops = useStore(nexusStore.retailShops);

  return (
    <section id="shops" className="py-16 bg-white/60 dark:bg-[#152434]/60 border-t border-[#CCE4F7] dark:border-[#253D56]">
      <div className="w-full px-4 sm:px-6 lg:px-[40px]">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs uppercase font-bold tracking-wider text-sky-600 dark:text-sky-400">{t.shops.badge}</span>
          <h2 className="text-3xl font-bold text-[#0F1D2B] dark:text-white mt-1">{t.shops.title}</h2>
          <p className="text-sm text-[#537292] dark:text-[#8DB0D4] mt-2">{t.shops.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {retailShops.map((shop) => (
            <div
              key={shop.id}
              className="p-5 rounded-2xl bg-white dark:bg-[#152434] border border-[#CCE4F7] dark:border-[#253D56] shadow-xs hover:shadow-md transition"
            >
              <div className="flex items-center space-x-2 text-sky-600 dark:text-sky-400 mb-2">
                <MapPin className="h-4 w-4 shrink-0" />
                <span className="font-mono text-xs font-bold">{shop.shopCode}</span>
              </div>
              <h4 className="font-bold text-sm text-[#0F1D2B] dark:text-white">{shop.name}</h4>
              <p className="text-xs text-[#537292] dark:text-[#8DB0D4] mt-2">{shop.address}</p>

              <div className="mt-4 pt-3 border-t border-[#CCE4F7]/60 dark:border-[#253D56]/60 text-xs space-y-1.5 text-[#3A5B7E] dark:text-[#8DB0D4]">
                <div className="flex items-center space-x-1.5">
                  <Clock className="h-3.5 w-3.5 text-[#537292] dark:text-[#8DB0D4] shrink-0" />
                  <span className="truncate">{shop.operatingHours}</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <PhoneCall className="h-3.5 w-3.5 text-[#537292] dark:text-[#8DB0D4] shrink-0" />
                  <span>{shop.phone}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
