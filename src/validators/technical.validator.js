// Luật validate body cho các API nghiệp vụ kỹ thuật / đơn hàng (câu lỗi mặc định kiểu ASP.NET).
import { bodySchema, defaultMessages as m, rules } from './helpers.js';

const text = (field, max) => [rules.maxLength(max, m.maxLength(field, max))];
const MAX_INT = 2_147_483_647;

/** POST /api/Technical/orders và POST /api/public/orders */
export const createOrderSchema = bodySchema({
  customerName: [rules.required(m.required('CustomerName')), ...text('CustomerName', 150)],
  customerPhone: text('CustomerPhone', 50),
  customerEmail: [rules.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$|^$/, 'CustomerEmail must be a valid email address.')],
  installationAddress: text('InstallationAddress', 255),
  idProofType: text('IdProofType', 50),
  idProofNumber: text('IdProofNumber', 100),
  connectionType: text('ConnectionType', 50),
  planId: text('PlanId', 50),
  planName: text('PlanName', 150),
  retailOutletCode: text('RetailOutletCode', 50),
  retailEmployeeName: text('RetailEmployeeName', 100),
  assignedEmployeeId: text('AssignedEmployeeId', 50),
  assignedBranchName: text('AssignedBranchName', 150),
  status: text('Status', 50),
  bulkConnectionsCount: [rules.integer(m.integer('BulkConnectionsCount'))],
  bulkDiscountPercent: [rules.integer(m.integer('BulkDiscountPercent'))],
  existingLandlineAccountId: text('ExistingLandlineAccountId', 20),
});

/** PUT /api/Technical/orders/:id/status */
export const orderStatusSchema = bodySchema({
  status: [rules.required(m.required('Status'))],
});

/** PUT /api/Technical/orders/:id/feasibility */
export const feasibilitySchema = bodySchema({
  isFeasible: [rules.boolean('The value of IsFeasible is not a valid boolean.')],
  landlineFeasible: [rules.boolean('The value of LandlineFeasible is not a valid boolean.')],
  internetFeasible: [rules.boolean('The value of InternetFeasible is not a valid boolean.')],
  cableDistanceMeters: [
    rules.integer(m.integer('CableDistanceMeters')),
    rules.range(0, MAX_INT, m.range('CableDistanceMeters', 0, MAX_INT)),
  ],
  dpBoxCapacity: text('DpBoxCapacity', 100),
  signalLossDbm: [rules.range(-999.99, 999.99, m.range('SignalLossDbm', -999.99, 999.99))],
  checkedBy: [rules.required(m.required('CheckedBy')), ...text('CheckedBy', 20)],
  notes: text('Notes', 500),
  rejectionReason: text('RejectionReason', 500),
});

/** PUT /api/Technical/orders/:id/installation-schedule */
export const installationScheduleSchema = bodySchema({
  scheduledInstallDate: [
    rules.required(m.required('ScheduledInstallDate')),
    rules.date('The value of ScheduledInstallDate is not a valid date.'),
  ],
  technicianId: text('TechnicianId', 20),
});

/** PUT /api/Technical/inventory/:id */
export const updateTechnicalInventorySchema = bodySchema({
  stockQuantity: [rules.integer(m.integer('StockQuantity')), rules.range(0, MAX_INT, m.range('StockQuantity', 0, MAX_INT))],
  reorderLevel: [rules.integer(m.integer('ReorderLevel')), rules.range(0, MAX_INT, m.range('ReorderLevel', 0, MAX_INT))],
  unitCost: [rules.range(0, Number.MAX_SAFE_INTEGER, m.range('UnitCost', 0, '79228162514264337593543950335'))],
  location: text('Location', 100),
  vendorId: text('VendorId', 20),
});

/** POST /api/Technical/inventory/:id/adjust-stock */
export const adjustStockSchema = bodySchema({
  quantityChange: [
    rules.integer(m.integer('QuantityChange')),
    rules.range(-1_000_000, 1_000_000, m.range('QuantityChange', -1000000, 1000000)),
  ],
  reason: [rules.required(m.required('Reason')), ...text('Reason', 500)],
});

const MAC_PATTERN = /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/;
const MAC_MESSAGE = "The field MacAddress must match the regular expression '^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$'.";

/** POST /api/Technical/equipment */
export const createEquipmentSchema = bodySchema({
  equipmentId: text('EquipmentId', 20),
  inventoryId: text('InventoryId', 30),
  serialNumber: [rules.required(m.required('SerialNumber')), ...text('SerialNumber', 50)],
  macAddress: [rules.required(m.required('MacAddress')), ...text('MacAddress', 50), rules.pattern(MAC_PATTERN, MAC_MESSAGE)],
  deviceModel: [rules.required(m.required('DeviceModel')), ...text('DeviceModel', 150)],
  deviceType: [rules.required(m.required('DeviceType')), ...text('DeviceType', 50)],
  vendorId: text('VendorId', 20),
  storeId: text('StoreId', 20),
  status: [rules.notBlank(m.required('Status')), ...text('Status', 30)],
  firmwareVersion: text('FirmwareVersion', 50),
});

/** PUT /api/Technical/equipment/:id */
export const updateEquipmentSchema = bodySchema({
  serialNumber: text('SerialNumber', 50),
  macAddress: [...text('MacAddress', 50), rules.pattern(MAC_PATTERN, MAC_MESSAGE)],
  deviceModel: text('DeviceModel', 150),
  deviceType: text('DeviceType', 50),
  storeId: text('StoreId', 20),
  status: text('Status', 30),
  firmwareVersion: text('FirmwareVersion', 50),
  assignedAccountId: text('AssignedAccountId', 20),
  assignedTechnicianId: text('AssignedTechnicianId', 20),
  installedDate: [rules.date('The value of InstalledDate is not a valid date.')],
});

/** POST /api/Technical/orders/:id/provide-connection */
export const provideConnectionSchema = bodySchema({
  equipmentId: [rules.required(m.required('EquipmentId')), ...text('EquipmentId', 20)],
  ipAddress: text('IpAddress', 50),
  portNumber: text('PortNumber', 50),
  installedDate: [rules.date('The value of InstalledDate is not a valid date.')],
  performedBy: text('PerformedBy', 20),
});

/** POST /api/Technical/connections */
export const upsertConnectionSchema = bodySchema({
  accountId: [rules.required(m.required('AccountId')), ...text('AccountId', 20)],
  orderId: text('OrderId', 11),
  monthlyRental: [rules.number(m.number('MonthlyRental'))],
  securityDeposit: [rules.number(m.number('SecurityDeposit'))],
  status: text('Status', 30),
  ipAddress: text('IpAddress', 50),
  portNumber: text('PortNumber', 50),
  equipmentId: text('EquipmentId', 20),
  assignedDeviceSerial: text('AssignedDeviceSerial', 50),
  installedDate: [rules.date('The value of InstalledDate is not a valid date.')],
  lastStatusReason: text('LastStatusReason', 500),
});

/** PUT /api/Technical/connections/:accountId/status */
export const connectionStatusSchema = bodySchema({
  status: [rules.required(m.required('Status')), ...text('Status', 30)],
  reason: text('Reason', 500),
  performedBy: text('PerformedBy', 20),
});

/** POST /api/technical/equipment-requests */
export const createEquipmentRequestSchema = bodySchema({
  orderId: text('OrderId', 11),
  storeId: [rules.required(m.required('StoreId')), ...text('StoreId', 20)],
  inventoryId: text('InventoryId', 30),
  itemName: [rules.required(m.required('ItemName')), ...text('ItemName', 150)],
  deviceType: [rules.required(m.required('DeviceType')), ...text('DeviceType', 50)],
  quantity: [rules.integer(m.integer('Quantity')), rules.range(1, 1000, m.range('Quantity', 1, 1000))],
  urgency: text('Urgency', 20),
  reason: text('Reason', 500),
});

/** PUT /api/technical/equipment-requests/:id/status */
export const equipmentRequestStatusSchema = bodySchema({
  status: [rules.required(m.required('Status')), ...text('Status', 30)],
  adminNotes: text('AdminNotes', 500),
});
