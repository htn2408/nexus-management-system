// Ô nhập địa chỉ lắp đặt: Tỉnh -> Quận -> Phường (dữ liệu hành chính từ esgoo.net),
// cộng địa chỉ cụ thể và nút chọn trên bản đồ.
//   value = { province, district, ward, specific }; onChange nhận object mới.
import { useEffect, useState } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { useStore } from '../../lib/store';
import MapAddressModal from './MapAddressModal';
import { formatAddress } from './address';

const ADMIN_API = 'https://esgoo.net/api-tinhthanh';

const selectClass =
  'w-full pl-3 pr-8 py-2.5 text-sm bg-[#EDF6FF] dark:bg-[#101C29] border border-[#CCE4F7] dark:border-[#253D56] rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 dark:focus:ring-blue-500 text-[#0F1D2B] dark:text-white transition cursor-pointer appearance-none disabled:opacity-50';

// level 1 = tỉnh (parentId 0), 2 = quận theo tỉnh, 3 = phường theo quận.
async function fetchAdminUnits(level, parentId) {
  const res = await fetch(`${ADMIN_API}/${level}/${parentId}.htm`);
  const data = await res.json();
  return data.error === 0 ? data.data : [];
}

const findByName = (list, name) => list.find((x) => x.name === name || x.full_name === name);

export default function AddressPicker({ value, onChange }) {
  const t = useStore(languageStore.t);
  const isVi = useStore(languageStore.language) === 'vi';
  const { province, district, ward, specific } = value;
  const [showMap, setShowMap] = useState(false);

  // Danh sách lưu theo mã cha, nên đổi tỉnh nhanh cũng không hiện nhầm quận của tỉnh khác.
  const [provinces, setProvinces] = useState([]);
  const [districtsByProvince, setDistrictsByProvince] = useState({});
  const [wardsByDistrict, setWardsByDistrict] = useState({});

  const selectedProvince = findByName(provinces, province);
  const districts = (selectedProvince && districtsByProvince[selectedProvince.id]) || [];
  const selectedDistrict = findByName(districts, district);
  const wards = (selectedDistrict && wardsByDistrict[selectedDistrict.id]) || [];

  useEffect(() => {
    fetchAdminUnits(1, 0).then(setProvinces).catch(console.error);
  }, []);

  const provinceId = selectedProvince?.id;
  useEffect(() => {
    if (!provinceId) return;
    fetchAdminUnits(2, provinceId)
      .then((list) => setDistrictsByProvince((prev) => ({ ...prev, [provinceId]: list })))
      .catch(console.error);
  }, [provinceId]);

  const districtId = selectedDistrict?.id;
  useEffect(() => {
    if (!districtId) return;
    fetchAdminUnits(3, districtId)
      .then((list) => setWardsByDistrict((prev) => ({ ...prev, [districtId]: list })))
      .catch(console.error);
  }, [districtId]);

  return (
    <div>
      <label className="block text-xs font-semibold text-[#305070] dark:text-slate-300 uppercase tracking-wider mb-1.5 flex justify-between items-end">
        <span>
          {t.registrationPage.addressLabel} <span className="text-rose-500">*</span>
        </span>
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        <div className="relative">
          <select
            value={province}
            // Đổi tỉnh thì quận / phường cũ không còn đúng nữa.
            onChange={(e) => onChange({ ...value, province: e.target.value, district: '', ward: '' })}
            className={selectClass}
          >
            <option value="">{isVi ? 'Tỉnh / Thành phố' : 'Province / City'}</option>
            {provinces.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="relative">
          <select
            value={district}
            disabled={!province}
            onChange={(e) => onChange({ ...value, district: e.target.value, ward: '' })}
            className={selectClass}
          >
            <option value="">{isVi ? 'Quận / Huyện' : 'District'}</option>
            {districts.map((d) => (
              <option key={d.id} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="relative">
          <select
            value={ward}
            disabled={!district}
            onChange={(e) => onChange({ ...value, ward: e.target.value })}
            className={selectClass}
          >
            <option value="">{isVi ? 'Phường / Xã' : 'Ward'}</option>
            {wards.map((w) => (
              <option key={w.id} value={w.name}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="relative">
        <MapPin className="absolute left-3.5 top-3 h-4 w-4 text-[#7899B8] dark:text-slate-500" />
        <input
          id="address"
          type="text"
          required
          value={specific}
          onChange={(e) => onChange({ ...value, specific: e.target.value })}
          placeholder={isVi ? 'Địa chỉ cụ thể (số nhà, tên đường)' : 'Specific address (house no, street)'}
          className="w-full pl-10 pr-12 py-2.5 text-sm bg-[#EDF6FF] dark:bg-[#101C29] border border-[#CCE4F7] dark:border-[#253D56] rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 dark:focus:ring-blue-500 text-[#0F1D2B] dark:text-white placeholder-[#7899B8] dark:placeholder-slate-500 transition"
        />
        <button
          type="button"
          onClick={() => setShowMap(true)}
          className="absolute right-1.5 top-1.5 px-2.5 py-1.5 bg-sky-600 dark:bg-sky-500 hover:bg-sky-700 dark:hover:bg-[#1C2C3D] text-white rounded-lg transition cursor-pointer flex items-center space-x-1 shadow-sm text-[11px] font-semibold"
          title={isVi ? 'Chọn trên bản đồ' : 'Pick on map'}
        >
          <Navigation className="h-3 w-3" />
          <span>{isVi ? 'Bản đồ' : 'Map'}</span>
        </button>
      </div>

      {showMap && (
        <MapAddressModal
          initialQuery={formatAddress(value)}
          onClose={() => setShowMap(false)}
          // Địa chỉ lấy từ bản đồ đã đầy đủ, nên bỏ phần tỉnh / quận / phường chọn tay.
          onPick={(picked) => {
            onChange({ province: '', district: '', ward: '', specific: picked });
            setShowMap(false);
          }}
        />
      )}
    </div>
  );
}
