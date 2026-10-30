// Bảng danh mục dùng chung cho các tab Quản trị: tìm kiếm, lọc theo một trường, phân trang,
// nút thêm và cột thao tác sửa / xoá. Mỗi tab chỉ khai báo cột và cách tìm.
import { useState } from 'react';
import { Edit2, Plus, Search, Trash2, X } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { usePagination } from '../../hooks/usePagination';
import { useStore } from '../../lib/store';
import Pagination from '../common/Pagination';

export default function CatalogTable({
  items,
  rowKey = (item) => item.id,
  searchText,
  searchPlaceholder,
  filter,
  columns,
  pageSize = 8,
  addLabel,
  onAdd,
  onEdit,
  onDelete,
  deleteTitle,
  extraActions,
  emptyText,
}) {
  const isVi = useStore(languageStore.language) === 'vi';
  const [search, setSearch] = useState('');
  const [filterValue, setFilterValue] = useState('All');

  const q = search.trim().toLowerCase();
  const filtered = items.filter(
    (item) =>
      (!q || searchText(item).some((v) => (v ?? '').toString().toLowerCase().includes(q))) &&
      (!filter || filterValue === 'All' || filter.get(item) === filterValue),
  );
  const pager = usePagination(filtered, pageSize);
  const filterValues = filter ? [...new Set(items.map(filter.get).filter(Boolean))].sort() : [];

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              pager.setPage(1);
            }}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-9 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {filter && (
          <select
            value={filterValue}
            onChange={(e) => {
              setFilterValue(e.target.value);
              pager.setPage(1);
            }}
            className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="All">{filter.allLabel}</option>
            {filterValues.map((v) => (
              <option key={v} value={v}>
                {filter.label ? filter.label(v) : v}
              </option>
            ))}
          </select>
        )}
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            {addLabel}
          </button>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                {columns.map((c) => (
                  <th key={c.header} className={`px-4 py-3 ${c.align === 'right' ? 'text-right' : ''}`}>
                    {c.header}
                  </th>
                ))}
                {(onEdit || onDelete || extraActions) && (
                  <th className="px-4 py-3 text-right">{isVi ? 'Thao tác' : 'Actions'}</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-4 py-12 text-center text-slate-500">
                    {emptyText ?? (isVi ? 'Không có dữ liệu khớp.' : 'Nothing matches.')}
                  </td>
                </tr>
              ) : (
                pager.items.map((item) => (
                  <tr key={rowKey(item)} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    {columns.map((c) => (
                      <td key={c.header} className={`px-4 py-3 align-top ${c.align === 'right' ? 'text-right' : ''}`}>
                        {c.cell(item)}
                      </td>
                    ))}
                    {(onEdit || onDelete || extraActions) && (
                      <td className="px-4 py-3 align-top text-right whitespace-nowrap space-x-1">
                        {extraActions?.(item)}
                        {onEdit && (
                          <button
                            type="button"
                            onClick={() => onEdit(item)}
                            title={isVi ? 'Sửa' : 'Edit'}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            type="button"
                            onClick={() => onDelete(item)}
                            title={deleteTitle ?? (isVi ? 'Xoá' : 'Delete')}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination {...pager.props} />
    </div>
  );
}
