import { handleUnauthorized } from './api';

export class TechnicalApiError extends Error {
  status;
  validationErrors;
  constructor(message, status, validationErrors) {
    super(message);
    this.status = status;
    this.validationErrors = validationErrors;
  }
}
async function request(path, init) {
  // Backend khoá /api/Technical theo [Authorize] nên mọi request phải mang JWT
  // lấy lúc đăng nhập (KeyClaim: Authorization: Bearer <token>). Request đi qua
  // Vite proxy cùng origin nên header được chuyển tiếp nguyên vẹn.
  const token = localStorage.getItem('nexus_jwt_token');
  const response = await fetch(path, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    if (response.status === 401 && token) {
      handleUnauthorized();
    }
    let body = null;
    try {
      body = await response.json();
    } catch {
      // The fallback below also handles empty and non-JSON error responses.
    }
    const validationMessage = body?.errors ? Object.values(body.errors).flat().join('; ') : undefined;
    throw new TechnicalApiError(
      validationMessage || body?.message || `API request failed (${response.status})`,
      response.status,
      body?.errors,
    );
  }
  if (response.status === 204) return undefined;
  return await response.json();
}
function queryString(values) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value));
  });
  const query = params.toString();
  return query ? `?${query}` : '';
}
export function searchOrdersAdvanced(filters = {}) {
  return request(`/api/Technical/orders${queryString(filters)}`);
}
export function getTechnicalOrders(filters = {}) {
  return request(`/api/Technical/orders${queryString(filters)}`);
}
export function getTechnicalConnections(filters = {}) {
  return request(`/api/Technical/connections${queryString(filters)}`);
}
export function getTechnicalEquipment(filters = {}) {
  return request(`/api/Technical/equipment${queryString(filters)}`);
}
export function getTechnicalInventory(filters = {}) {
  return request(`/api/Technical/inventory${queryString(filters)}`);
}
export async function loadTechnicalWorkspace() {
  const [orderDtos, connectionDtos, equipmentDtos, inventoryDtos] = await Promise.all([
    getTechnicalOrders(),
    getTechnicalConnections(),
    getTechnicalEquipment(),
    getTechnicalInventory(),
  ]);
  const connections = connectionDtos.map((item) => ({
    accountId: item.accountId,
    orderId: item.orderId,
    customerName: item.customerName,
    customerPhone: item.customerPhone,
    customerEmail: item.customerEmail ?? '',
    installationAddress: item.installationAddress,
    connectionType: item.connectionType,
    planName: item.planName,
    monthlyRental: item.monthlyRental,
    securityDeposit: item.securityDeposit,
    status: item.status,
    ipAddress: item.ipAddress ?? undefined,
    portNumber: item.portNumber ?? undefined,
    assignedDeviceSerial: item.equipmentSerialNumber ?? undefined,
    assignedDeviceModel: item.equipmentModel ?? undefined,
    installedDate: item.installedDate,
    suspensionStartDate: item.suspensionStartDate ?? undefined,
    suspensionEndDate: item.suspensionEndDate ?? undefined,
    terminatedDate: item.terminatedDate ?? undefined,
    lastUpdated: item.lastUpdated,
    lastStatusReason: item.lastStatusReason ?? undefined,
  }));
  return {
    orders: orderDtos.map((item) => ({
      id: item.orderId,
      customerName: item.customerName,
      customerPhone: item.customerPhone,
      customerEmail: item.customerEmail ?? '',
      installationAddress: item.installationAddress,
      // Lấy đúng giấy tờ khách đã khai (trước đây gán cứng "National ID Card" + số rỗng).
      idProofType: item.idProofType ?? 'National ID Card',
      idProofNumber: item.idProofNumber ?? '',
      connectionType: item.connectionType,
      planId: item.planId,
      planName: item.planName,
      retailOutletCode: item.storeId,
      retailEmployeeName: item.storeName,
      createdAt: item.applicationDate,
      status: item.status,
      feasibilityNotes: item.feasibilityNotes ?? item.rejectionReason ?? undefined,
      cableDistanceMeters: item.cableDistanceMeters ?? undefined,
      dpBoxCapacity: item.dpBoxCapacity ?? undefined,
      signalLossDbm: item.signalLossDbm ?? undefined,
      assignedAccountId: item.assignedAccountId ?? undefined,
      scheduledInstallDate: item.scheduledInstallDate ?? undefined,
      feasibilityCheckedBy: item.feasibilityCheckedBy ?? undefined,
      feasibilityCheckedDate: item.feasibilityCheckedDate ?? undefined,
      bulkConnectionsCount: Math.max(1, item.bulkConnectionsCount),
      bulkDiscountPercent: item.bulkDiscountPercent,
      depositWaived: item.depositWaived ?? undefined,
      existingLandlineAccountId: item.existingLandlineAccountId ?? undefined,
      landlineFeasible: item.landlineFeasible ?? undefined,
      internetFeasible: item.internetFeasible ?? undefined,
      retailApprovedBy: item.retailApprovedBy ?? undefined,
      retailApprovedAt: item.retailApprovedDate ?? undefined,
      retailApprovalNotes: item.retailApprovalNotes ?? undefined,
      assignedTechnician: item.assignedTechnicianName ?? undefined,
      assignedTechnicianPhone: item.assignedTechnicianPhone ?? undefined,
      assignedTechnicianDate: item.assignedTechnicianDate ?? undefined,
    })),
    connections,
    equipments: equipmentDtos.map((item) => {
      const linkedConnection = connectionDtos.find((connection) => connection.equipmentId === item.equipmentId);
      return {
        id: item.equipmentId,
        inventoryId: item.inventoryId ?? undefined,
        vendorId: item.vendorId,
        storeId: item.storeId ?? undefined,
        serialNumber: item.serialNumber ?? '',
        macAddress: item.macAddress ?? '',
        deviceModel: item.deviceModel,
        deviceType: item.deviceType,
        assignedAccountId: item.assignedAccountId ?? undefined,
        assignedCustomerName: linkedConnection?.customerName,
        firmwareVersion: item.firmwareVersion ?? '',
        status: item.status,
        assignedTechnician: item.technicianName ?? undefined,
        installedDate: item.installedDate ?? undefined,
      };
    }),
    inventory: inventoryDtos.map((item) => ({
      id: item.inventoryId,
      itemCode: item.itemCode,
      name: item.name,
      category: item.category,
      stockQuantity: item.stockQuantity,
      reorderLevel: item.reorderLevel,
      unitCost: item.unitCost,
      location: item.location ?? '',
      supplier: item.vendorName ?? '',
      vendorId: item.vendorId ?? undefined,
      status: item.status,
    })),
  };
}
export function updateFeasibility(orderId, payload) {
  return request(`/api/Technical/orders/${encodeURIComponent(orderId)}/feasibility`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
export function updateInstallationSchedule(orderId, payload) {
  return request(`/api/Technical/orders/${encodeURIComponent(orderId)}/installation-schedule`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
export function provideConnection(orderId, payload) {
  return request(`/api/Technical/orders/${encodeURIComponent(orderId)}/provide-connection`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
export function changeConnectionStatus(accountId, payload) {
  return request(`/api/Technical/connections/${encodeURIComponent(accountId)}/status`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
export function getConnectionActivityLogs(accountId) {
  return request(`/api/Technical/connections/${encodeURIComponent(accountId)}/activity-logs`);
}
export function createEquipment(payload) {
  return request('/api/Technical/equipment', { method: 'POST', body: JSON.stringify(payload) });
}
export function updateEquipment(equipmentId, payload) {
  return request(`/api/Technical/equipment/${encodeURIComponent(equipmentId)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
export function updateInventory(inventoryId, payload) {
  return request(`/api/Technical/inventory/${encodeURIComponent(inventoryId)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
export function adjustInventoryStock(inventoryId, payload) {
  return request(`/api/Technical/inventory/${encodeURIComponent(inventoryId)}/adjust-stock`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
