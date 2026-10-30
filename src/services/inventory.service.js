// Tồn kho phía Kỹ thuật: xem kho, sửa thông số, nhập/xuất điều chỉnh số lượng.
import { withTransaction } from '../config/database.js';
import { InventoryStatuses } from '../constants/statuses.js';
import * as inventoryRepository from '../repositories/inventory.repository.js';
import { AppError } from '../utils/AppError.js';
import { toNumber } from '../validators/helpers.js';
import * as notificationEvents from './notificationEvents.js';
import * as notificationService from './notification.service.js';
import { clean } from '../utils/text.js';

const NOT_FOUND = 'Không tìm thấy vật tư/tồn kho';
const MAX_INT = 2_147_483_647;

export async function list(category, lowStockOnly) {
  const items = await inventoryRepository.findAll(
    { category: category?.trim() || null, lowStockOnly },
    'i.Name'
  );
  return items.map(toResponse);
}

export async function getById(id) {
  const item = await inventoryRepository.findById(id);
  if (!item) throw AppError.notFound(NOT_FOUND);
  return toResponse(item);
}

/** Sửa thông số kho; field không gửi thì giữ nguyên. */
export async function update(id, input) {
  const item = await inventoryRepository.findById(id);
  if (!item) throw AppError.notFound(NOT_FOUND);

  const stockQuantity = toNumber(input.stockQuantity);
  const reorderLevel = toNumber(input.reorderLevel);
  const unitCost = toNumber(input.unitCost);
  if ([stockQuantity, reorderLevel, unitCost].some((value) => value !== null && value < 0)) {
    throw AppError.badRequest('Số lượng, mức đặt lại và đơn giá không được âm');
  }

  const vendorId = clean(input.vendorId);
  if (vendorId && !(await inventoryRepository.vendorExists(vendorId))) {
    throw AppError.badRequest('Nhà cung cấp không tồn tại');
  }

  const next = {
    itemCode: item.itemCode,
    name: item.name,
    category: item.category,
    stockQuantity: stockQuantity ?? item.stockQuantity,
    reorderLevel: reorderLevel ?? item.reorderLevel,
    unitCost: unitCost ?? item.unitCost,
    location: clean(input.location) ?? item.location,
    vendorId: vendorId ?? item.vendorId,
  };
  next.status = statusFor(next.stockQuantity, next.reorderLevel);
  await inventoryRepository.update(item.inventoryId, next);

  await warnIfLowStock({ ...item, ...next });

  return {
    message: 'Cập nhật tồn kho thành công',
    inventoryId: item.inventoryId,
    stockQuantity: next.stockQuantity,
    reorderLevel: next.reorderLevel,
    isLowStock: next.stockQuantity <= next.reorderLevel,
    status: next.status,
  };
}

/**
 * Nhập (+) hoặc xuất (−) kho. Khoá dòng trong transaction để hai lần điều chỉnh cùng lúc
 * không ghi đè lẫn nhau.
 */
export async function adjustStock(id, quantityChange, reason) {
  const result = await withTransaction(async (tx) => {
    const item = await inventoryRepository.findById(id, tx, true);
    if (!item) throw AppError.notFound(NOT_FOUND);

    if (quantityChange === 0) throw AppError.badRequest('Số lượng điều chỉnh phải khác 0');

    const newQuantity = item.stockQuantity + quantityChange;
    if (newQuantity < 0) throw AppError.badRequest('Số lượng xuất vượt quá tồn kho hiện tại');
    if (!clean(reason)) throw AppError.badRequest('Phải nhập lý do điều chỉnh tồn kho');
    if (newQuantity > MAX_INT) throw AppError.badRequest('Số lượng tồn kho vượt quá giới hạn cho phép');

    const status = statusFor(newQuantity, item.reorderLevel);
    await inventoryRepository.setStock(item.inventoryId, newQuantity, status, tx);

    console.log(
      `[inventory] ${item.inventoryId} điều chỉnh từ ${item.stockQuantity} thành ${newQuantity}. Lý do: ${clean(reason)}`
    );
    return { ...item, stockQuantity: newQuantity, status };
  });

  await warnIfLowStock(result);

  return {
    message: 'Điều chỉnh tồn kho thành công',
    inventoryId: result.inventoryId,
    quantityChange,
    stockQuantity: result.stockQuantity,
    status: result.status,
  };
}

// ==================== Helpers ====================

export function statusFor(stockQuantity, reorderLevel) {
  if (stockQuantity === 0) return InventoryStatuses.OutOfStock;
  return stockQuantity <= reorderLevel ? InventoryStatuses.LowStock : InventoryStatuses.InStock;
}

async function warnIfLowStock(item) {
  if (item.stockQuantity > item.reorderLevel) return;

  await notificationEvents.lowStock(item.inventoryId, item.name, item.itemCode, item.stockQuantity, item.reorderLevel);
  notificationService.notifyDataChanged('inventory', item.inventoryId);
}

function toResponse(item) {
  return {
    inventoryId: item.inventoryId,
    itemCode: item.itemCode,
    name: item.name,
    category: item.category,
    stockQuantity: item.stockQuantity,
    reorderLevel: item.reorderLevel,
    unitCost: item.unitCost,
    totalStockValue: Math.round(item.stockQuantity * item.unitCost * 100) / 100,
    isLowStock: item.stockQuantity <= item.reorderLevel,
    location: item.location,
    vendorId: item.vendorId,
    vendorName: item.vendorName,
    status: item.status,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}
