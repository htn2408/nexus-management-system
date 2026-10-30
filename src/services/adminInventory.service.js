// Kho vật tư phía Quản trị (tab Stock của Admin): xem, thêm, sửa, nhập thêm hàng, xoá.
import { InventoryStatuses } from '../constants/statuses.js';
import * as inventoryRepository from '../repositories/inventory.repository.js';
import { AppError } from '../utils/AppError.js';
import { isAllFilter } from '../utils/sqlFilters.js';
import { toNumber } from '../validators/helpers.js';
import * as notificationEvents from './notificationEvents.js';
import * as notificationService from './notification.service.js';

const DEFAULT_LOCATION = 'Central Depot NYC';
const DEFAULT_SUPPLIER = 'Nexus Central Supply';

export async function list({ search, category, isLowStock, vendorId, status }) {
  const items = await inventoryRepository.findAll({
    search: search?.trim() || null,
    category: isAllFilter(category, 'All Categories') ? null : category.trim(),
    lowStockOnly: String(isLowStock).toLowerCase() === 'true',
    vendorId: isAllFilter(vendorId) ? null : vendorId,
    status: isAllFilter(status) ? null : status.trim(),
  });
  return items.map(toDto);
}

export async function stats() {
  const items = await inventoryRepository.findAll();
  return buildStats(items.map(toDto));
}

export async function overview(search) {
  const items = (await inventoryRepository.findAll({ search: search?.trim() || null })).map(toDto);
  return { stats: buildStats(items), items };
}

export async function lowStock() {
  const items = await inventoryRepository.findAll({ lowStockOnly: true }, 'i.StockQuantity');
  return items.map(toDto);
}

export async function getById(id) {
  return toDto(await findOrThrow(id));
}

export async function create(input) {
  const total = await inventoryRepository.count();
  let inventoryId = `inv-${String(total + 1).padStart(2, '0')}`;
  if (await inventoryRepository.exists(inventoryId)) {
    inventoryId = `inv-${new Date().toISOString().replace(/[-:T]/g, '').slice(2, 14)}`;
  }

  const itemCode = input.itemCode?.trim() ? input.itemCode.trim() : `EQ-DEV-${String(total + 1).padStart(3, '0')}`;
  const vendorId =
    (await resolveVendorId(input, false)) ?? (await inventoryRepository.firstVendorId()) ?? 'vnd-02';

  const stockQuantity = toNumber(input.stockQuantity) ?? 10;
  const reorderLevel = toNumber(input.reorderLevel) ?? 5;

  await inventoryRepository.insert({
    inventoryId,
    itemCode,
    name: input.name.trim(),
    category: (input.category ?? 'Modem').trim(),
    stockQuantity,
    reorderLevel,
    unitCost: toNumber(input.unitCost) ?? 50,
    location: input.location?.trim() ? input.location.trim() : DEFAULT_LOCATION,
    vendorId,
    status: stockQuantity <= reorderLevel ? InventoryStatuses.LowStock : InventoryStatuses.InStock,
  });

  return toDto(await inventoryRepository.findById(inventoryId));
}

export async function update(id, input) {
  const item = await findOrThrow(id);

  const stockQuantity = toNumber(input.stockQuantity) ?? 0;
  const reorderLevel = toNumber(input.reorderLevel) ?? 0;

  await inventoryRepository.update(item.inventoryId, {
    itemCode: input.itemCode?.trim() ? input.itemCode.trim() : item.itemCode,
    name: input.name.trim(),
    category: input.category.trim(),
    stockQuantity,
    reorderLevel,
    unitCost: toNumber(input.unitCost) ?? 0,
    location: input.location?.trim() ? input.location.trim() : DEFAULT_LOCATION,
    vendorId: (await resolveVendorId(input, true)) ?? item.vendorId,
    // Trạng thái tự tính theo tồn kho, không lấy từ client.
    status: stockQuantity <= reorderLevel ? InventoryStatuses.LowStock : InventoryStatuses.InStock,
  });

  const updated = await inventoryRepository.findById(item.inventoryId);
  await notifyStock(updated);
  return toDto(updated);
}

/** Nhập thêm hàng vào kho. */
export async function restock(id, quantity) {
  const item = await findOrThrow(id);

  const stockQuantity = item.stockQuantity + quantity;
  const status =
    stockQuantity > item.reorderLevel && item.status === InventoryStatuses.LowStock ? InventoryStatuses.InStock : item.status;
  await inventoryRepository.setStock(item.inventoryId, stockQuantity, status);

  const updated = await inventoryRepository.findById(item.inventoryId);
  await notifyStock(updated);
  return toDto(updated);
}

/** Vật tư đã gắn với thiết bị thì chỉ ngừng kinh doanh, chưa gắn thì xoá hẳn. */
export async function remove(id) {
  const item = await findOrThrow(id);

  if (await inventoryRepository.hasEquipment(item.inventoryId)) {
    await inventoryRepository.setStatus(item.inventoryId, 'Discontinued');
    return { message: 'Vật tư đang được gắn với thiết bị phần cứng, đã chuyển trạng thái sang Discontinued.' };
  }

  await inventoryRepository.remove(item.inventoryId);
  return { message: `Đã xóa vật tư ${item.name} (${item.itemCode}) khỏi kho thành công.` };
}

// ==================== Helpers ====================

async function findOrThrow(id) {
  const item = await inventoryRepository.findByIdOrCode(id);
  if (!item) throw AppError.notFound(`Không tìm thấy vật tư / thiết bị với mã: ${id}`);
  return item;
}

/** vendorId gửi thẳng, hoặc suy ra từ chuỗi tên nhà cung cấp (supplier). */
async function resolveVendorId(input, matchVendorCode) {
  if (input.vendorId?.trim()) return input.vendorId.trim();
  if (input.supplier?.trim()) return inventoryRepository.findVendorMentionedIn(input.supplier, matchVendorCode);
  return null;
}

/** Chạm ngưỡng đặt lại ⇒ báo Quản trị; luôn báo các dashboard tải lại bảng kho. */
async function notifyStock(item) {
  if (item.stockQuantity <= item.reorderLevel) {
    await notificationEvents.lowStock(item.inventoryId, item.name, item.itemCode, item.stockQuantity, item.reorderLevel);
  }
  notificationService.notifyDataChanged('inventory', item.inventoryId);
}

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

function buildStats(items) {
  const lowStockItems = items.filter((item) => item.isLowStock);
  return {
    totalStockUnits: items.reduce((sum, item) => sum + item.stockQuantity, 0),
    lowStockCount: lowStockItems.length,
    totalValuation: roundMoney(items.reduce((sum, item) => sum + item.stockQuantity * item.unitCost, 0)),
    totalCategoriesCount: items.length,
    lowStockItems,
  };
}

/** Trả nhiều tên cho cùng một giá trị vì các màn hình frontend dùng lẫn lộn. */
function toDto(item) {
  const supplier = item.vendorName ?? DEFAULT_SUPPLIER;
  const location = item.location ?? 'Central Depot';
  return {
    id: item.inventoryId,
    inventoryId: item.inventoryId,
    itemCode: item.itemCode,
    name: item.name,
    deviceName: item.name,
    category: item.category,
    location,
    depotLocation: location,
    stockQuantity: item.stockQuantity,
    stockUnits: item.stockQuantity,
    reorderLevel: item.reorderLevel,
    reorderThreshold: item.reorderLevel,
    unitCost: item.unitCost,
    supplier,
    supplierName: supplier,
    vendorId: item.vendorId,
    isLowStock: item.stockQuantity <= item.reorderLevel,
    totalValue: roundMoney(item.stockQuantity * item.unitCost),
    status: item.status,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}
