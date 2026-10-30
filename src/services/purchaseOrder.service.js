// Purchase List: đơn đặt mua thiết bị từ nhà cung cấp (Admin quản lý, theo spec).
// Đơn chuyển sang Received thì tự cộng tồn kho: vật tư đã có (cùng ItemCode) thì tăng
// StockQuantity, chưa có thì tạo dòng kho mới kế thừa vendor và đơn giá của đơn mua.
import { randomInt } from 'node:crypto';
import { withTransaction } from '../config/database.js';
import { InventoryStatuses } from '../constants/statuses.js';
import * as inventoryRepository from '../repositories/inventory.repository.js';
import * as purchaseOrderRepository from '../repositories/purchaseOrder.repository.js';
import * as retailStoreRepository from '../repositories/retailStore.repository.js';
import { AppError } from '../utils/AppError.js';
import { dotnetTicks } from '../utils/ids.js';
import { toNumber } from '../validators/helpers.js';
import * as notificationService from './notification.service.js';
import { localCompactDate } from '../utils/dates.js';
import { clean } from '../utils/text.js';

const STATUSES = ['Submitted', 'Received', 'Cancelled'];

export async function list({ status, vendorId, storeId, search }) {
  const orders = await purchaseOrderRepository.findAll({
    status: clean(status),
    vendorId: clean(vendorId),
    storeId: clean(storeId),
    search: clean(search),
  });
  return orders.map(toDto);
}

export async function getById(id) {
  return toDto(await findOrThrow(id));
}

export async function create(input, createdBy) {
  if (!(await purchaseOrderRepository.vendorExists(input.vendorId))) {
    throw AppError.badRequest(`Nhà cung cấp không tồn tại: ${input.vendorId}`);
  }

  const storeId = clean(input.storeId);
  if (storeId && !(await retailStoreRepository.exists(storeId))) {
    throw AppError.badRequest(`Chi nhánh nhận hàng không tồn tại: ${input.storeId}`);
  }

  const purchaseOrderId = clean(input.purchaseOrderId) ?? `PO-${localCompactDate()}-${randomInt(1000, 9999)}`;

  await purchaseOrderRepository.insert({
    purchaseOrderId,
    vendorId: input.vendorId,
    storeId,
    itemCode: input.itemCode.trim(),
    itemName: input.itemName.trim(),
    category: clean(input.category) ?? 'Modem',
    quantity: toNumber(input.quantity),
    unitCost: toNumber(input.unitCost) ?? 0,
    expectedDate: input.expectedDate ? new Date(input.expectedDate) : null,
    status: 'Submitted',
    notes: input.notes ?? null,
    createdBy: createdBy ?? 'Manager',
  });

  notificationService.notifyDataChanged('purchaseOrders', purchaseOrderId);
  return toDto(await purchaseOrderRepository.findById(purchaseOrderId));
}

/** Submitted → Received (cộng kho) hoặc Cancelled. */
export async function updateStatus(id, statusInput) {
  const status = statusInput?.trim();
  if (!STATUSES.includes(status)) {
    throw AppError.badRequest('Trạng thái chỉ nhận: Submitted, Received hoặc Cancelled.');
  }

  const order = await findOrThrow(id);
  if (order.status === 'Received' && status !== 'Received') {
    throw AppError.conflict('Đơn đã nhận hàng, không thể đổi sang trạng thái khác.');
  }
  if (order.status === 'Cancelled') {
    throw AppError.conflict('Đơn đã hủy, không thể đổi trạng thái.');
  }
  // Gửi lại đúng trạng thái hiện tại thì không làm gì (idempotent).
  if (order.status === status) return toDto(order);

  await withTransaction(async (tx) => {
    await purchaseOrderRepository.updateStatus(order.purchaseOrderId, status, tx);
    if (status === 'Received') await receiveIntoInventory(order, tx);
  });

  notificationService.notifyDataChanged('purchaseOrders', order.purchaseOrderId);
  return toDto(await purchaseOrderRepository.findById(order.purchaseOrderId));
}

export async function remove(id) {
  const order = await findOrThrow(id);
  if (order.status === 'Received') {
    throw AppError.conflict('Đơn đã nhận hàng nên không thể xóa (tồn kho đã được cộng).');
  }

  await purchaseOrderRepository.remove(order.purchaseOrderId);
  notificationService.notifyDataChanged('purchaseOrders', order.purchaseOrderId);
  return { message: `Đã xóa đơn đặt mua ${id} thành công` };
}

// ==================== Helpers ====================

async function receiveIntoInventory(order, tx) {
  const item = await inventoryRepository.findByItemCode(order.itemCode, tx);

  if (item) {
    await inventoryRepository.incrementStock(item.inventoryId, order.quantity, tx);
    return;
  }

  await inventoryRepository.insert(
    {
      inventoryId: `inv-${dotnetTicks().slice(8)}`,
      itemCode: order.itemCode,
      name: order.itemName,
      category: order.category,
      stockQuantity: order.quantity,
      reorderLevel: 10,
      unitCost: order.unitCost,
      vendorId: order.vendorId,
      status: InventoryStatuses.InStock,
    },
    tx
  );
}

async function findOrThrow(id) {
  const order = await purchaseOrderRepository.findById(id);
  if (!order) throw AppError.notFound(`Không tìm thấy đơn đặt mua với mã: ${id}`);
  return order;
}

/** Kèm object vendor như entity bản ASP.NET (frontend đọc vendor.companyName). */
function toDto(p) {
  return {
    purchaseOrderId: p.purchaseOrderId,
    vendorId: p.vendorId,
    storeId: p.storeId,
    itemCode: p.itemCode,
    itemName: p.itemName,
    category: p.category,
    quantity: p.quantity,
    unitCost: p.unitCost,
    totalCost: p.totalCost,
    orderDate: p.orderDate,
    expectedDate: p.expectedDate,
    receivedDate: p.receivedDate,
    status: p.status,
    notes: p.notes,
    createdBy: p.createdBy,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    vendor: p.vendorCompanyName
      ? {
          vendorId: p.vendorId,
          vendorCode: p.vendorCode,
          companyName: p.vendorCompanyName,
          contactPerson: p.vendorContactPerson,
          category: p.vendorCategory,
          phone: p.vendorPhone,
          email: p.vendorEmail,
          status: p.vendorStatus,
        }
      : null,
  };
}
