// Luật validate body cho các API quản trị. Câu lỗi mặc định theo kiểu DataAnnotations của
// bản ASP.NET (các DTO bên đó không tự đặt ErrorMessage).
import { bodySchema, defaultMessages as m, rules } from './helpers.js';

const text = (field, max) => [rules.maxLength(max, m.maxLength(field, max))];
const requiredText = (field, max) => [rules.required(m.required(field)), ...text(field, max)];
const money = (field) => [rules.range(0, 1_000_000, m.range(field, 0, 1000000))];

/** POST / PUT /api/admin/plan */
export const planSchema = bodySchema({
  name: requiredText('Name', 150),
  connectionType: text('ConnectionType', 50),
  speedOrBandwidth: text('SpeedOrBandwidth', 100),
  monthlyRental: money('MonthlyRental'),
  securityDeposit: money('SecurityDeposit'),
  billingCycle: text('BillingCycle', 50),
  validity: text('Validity', 50),
  dataLimit: text('DataLimit', 100),
  status: text('Status', 50),
  includedHours: [rules.integer(m.integer('IncludedHours'))],
  hourlyCharge: [rules.number(m.number('HourlyCharge'))],
  description: text('Description', 500),
  callRates: text('CallRates', 500),
});

/** POST / PUT /api/admin/vendor */
export const vendorSchema = bodySchema({
  vendorCode: text('VendorCode', 50),
  companyName: requiredText('CompanyName', 150),
  contactPerson: text('ContactPerson', 100),
  category: text('Category', 100),
  phone: text('Phone', 50),
  email: text('Email', 150),
  address: text('Address', 255),
  rating: [rules.range(1, 5, m.range('Rating', 1, 5))],
  status: text('Status', 50),
});

/** POST / PUT /api/admin/retailshop */
export const retailShopSchema = bodySchema({
  name: requiredText('Name', 150),
  city: requiredText('City', 100),
  cityCode: text('CityCode', 50),
  address: requiredText('Address', 255),
  phone: text('Phone', 50),
  email: text('Email', 150),
  managerName: text('ManagerName', 100),
  operatingHours: text('OperatingHours', 100),
  activeEmployeesCount: [rules.integer(m.integer('ActiveEmployeesCount'))],
  totalSubscribersServed: [rules.integer(m.integer('TotalSubscribersServed'))],
  status: text('Status', 50),
});

const employeeFields = {
  fullName: [rules.required('Họ và tên không được để trống'), ...text('FullName', 100)],
  email: [
    rules.required('Email không được để trống'),
    rules.email('Email không đúng định dạng'),
    ...text('Email', 100),
  ],
  phone: text('Phone', 20),
  storeId: text('StoreId', 20),
  retailShopAssigned: text('RetailShopAssigned', 150),
  status: [rules.notBlank('Trạng thái không được để trống'), ...text('Status', 20)],
};

/** POST /api/admin/employee (role/department có mặc định nếu không gửi). */
export const createEmployeeSchema = bodySchema({
  ...employeeFields,
  employeeCode: text('EmployeeCode', 30),
  role: [rules.notBlank('Chức vụ không được để trống'), ...text('Role', 50)],
  department: [rules.notBlank('Phòng ban không được để trống'), ...text('Department', 50)],
});

/** PUT /api/admin/employee/:id */
export const updateEmployeeSchema = bodySchema({
  ...employeeFields,
  role: [rules.required('Chức vụ không được để trống'), ...text('Role', 50)],
  department: [rules.required('Phòng ban không được để trống'), ...text('Department', 50)],
});

/** POST /api/admin/feedback */
export const createFeedbackSchema = bodySchema({
  customerName: [
    rules.required('Thiếu tên khách hàng.'),
    rules.maxLength(100, 'Tên khách hàng không được quá 100 ký tự.'),
  ],
  rating: [rules.range(1, 5, 'Số sao phải từ 1 đến 5.')],
  category: [rules.required('Thiếu danh mục phản hồi.')],
  message: [rules.required('Nội dung phản hồi không được để trống.')],
});

/** POST /api/admin/purchaseorder */
export const createPurchaseOrderSchema = bodySchema({
  vendorId: [rules.required('Thiếu nhà cung cấp.')],
  itemCode: [rules.required('Thiếu mã vật tư.'), ...text('ItemCode', 50)],
  itemName: [rules.required('Thiếu tên vật tư.'), ...text('ItemName', 150)],
  category: text('Category', 50),
  quantity: [
    rules.required('Số lượng phải từ 1 trở lên.'),
    rules.integer('Số lượng phải từ 1 trở lên.'),
    rules.range(1, 100000, 'Số lượng phải từ 1 trở lên.'),
  ],
  unitCost: money('UnitCost'),
  expectedDate: [rules.date('The value of ExpectedDate is not a valid date.')],
  notes: text('Notes', 500),
});

/** PUT /api/admin/purchaseorder/:id/status */
export const purchaseOrderStatusSchema = bodySchema({
  status: [rules.required(m.required('Status'))],
});

const inventoryText = {
  itemCode: text('ItemCode', 50),
  location: text('Location', 100),
  vendorId: text('VendorId', 50),
  supplier: text('Supplier', 150),
};

/** POST /api/admin/inventory */
export const createInventorySchema = bodySchema({
  ...inventoryText,
  name: [rules.required('Tên vật tư thiết bị không được để trống'), ...text('Name', 150)],
  category: [rules.notBlank('Danh mục không được để trống'), ...text('Category', 50)],
  stockQuantity: [rules.integer(m.integer('StockQuantity')), rules.range(0, 1_000_000, m.range('StockQuantity', 0, 1000000))],
  reorderLevel: [rules.integer(m.integer('ReorderLevel')), rules.range(0, 1_000_000, m.range('ReorderLevel', 0, 1000000))],
  unitCost: [rules.range(0, 1_000_000_000, m.range('UnitCost', 0, 1000000000))],
});

/** PUT /api/admin/inventory/:id */
export const updateInventorySchema = bodySchema({
  ...inventoryText,
  name: [rules.required('Tên vật tư thiết bị không được để trống'), ...text('Name', 150)],
  category: [rules.required('Danh mục không được để trống'), ...text('Category', 50)],
  stockQuantity: [rules.integer('Số lượng tồn kho phải >= 0'), rules.range(0, 1_000_000, 'Số lượng tồn kho phải >= 0')],
  reorderLevel: [rules.integer('Ngưỡng đặt hàng lại phải >= 0'), rules.range(0, 1_000_000, 'Ngưỡng đặt hàng lại phải >= 0')],
  unitCost: [rules.range(0, 1_000_000_000, 'Đơn giá phải >= 0')],
  status: text('Status', 30),
});

/** POST /api/admin/inventory/:id/restock */
export const restockSchema = bodySchema({
  quantity: [
    rules.required('Số lượng nhập thêm phải lớn hơn 0'),
    rules.integer('Số lượng nhập thêm phải lớn hơn 0'),
    rules.range(1, 100000, 'Số lượng nhập thêm phải lớn hơn 0'),
  ],
  note: text('Note', 250),
});

/** PUT /api/admin/systemsettings/:key */
export const systemSettingSchema = bodySchema({
  settingValue: [rules.required(m.required('SettingValue')), ...text('SettingValue', 255)],
});
