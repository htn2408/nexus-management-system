// Cửa sổ chọn địa chỉ lắp đặt trên Google Maps (bản nhúng, tìm theo chữ).
import { useState } from 'react';
import { toast } from 'sonner';
import { MapPin, Navigation, Search, X } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { useStore } from '../../lib/store';

export default function MapAddressModal({ initialQuery, onPick, onClose }) {
  const isVi = useStore(languageStore.language) === 'vi';
  const [query, setQuery] = useState(initialQuery);

  const pickFromPin = () => {
    if (!query.trim()) {
      toast.error(isVi ? 'Vui lòng nhập địa chỉ vào ô tìm kiếm' : 'Please search for an address first');
      return;
    }
    onPick(query);
    toast.success(isVi ? 'Đã lấy vị trí thành công!' : 'Location retrieved successfully!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#0B141E] w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-[#101C29]">
          <h3 className="font-bold text-slate-800 dark:text-white flex items-center space-x-2">
            <Navigation className="h-4 w-4 text-sky-500" />
            <span>{isVi ? 'Cài đặt địa chỉ lắp đặt' : 'Set Installation Address'}</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isVi ? 'Tìm kiếm địa chỉ trên bản đồ...' : 'Search address on map...'}
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-100 dark:bg-[#152333] border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 dark:text-white transition"
            />
          </div>

          <div className="relative w-full h-[300px] sm:h-[400px] bg-slate-200 dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
            <iframe
              title="Google Maps"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(query || 'Hanoi, Vietnam')}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
            ></iframe>
            {/* Center Pin overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <button
                type="button"
                onClick={pickFromPin}
                className="mb-8 relative flex flex-col items-center pointer-events-auto cursor-pointer group"
              >
                <div className="bg-rose-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md mb-1 group-hover:scale-110 transition-transform">
                  {isVi ? 'Chọn vị trí này' : 'Pick this location'}
                </div>
                <MapPin className="h-8 w-8 text-rose-500 drop-shadow-md group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#101C29] flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            {isVi ? 'Huỷ' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={() => onPick(query)}
            disabled={!query.trim()}
            className="px-5 py-2 text-sm font-bold text-white bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 rounded-xl shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isVi ? 'Xác nhận địa chỉ' : 'Confirm Address'}
          </button>
        </div>
      </div>
    </div>
  );
}
