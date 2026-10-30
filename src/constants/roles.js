// Giá trị cột Employee.Role trong DB, dùng cho requireRole(...) nên phải khớp
// chính xác chuỗi lưu trong bảng Employee.
export const Roles = Object.freeze({
  Manager: 'Manager',
  RetailStaff: 'Retail Staff',
  FieldEngineer: 'Field Engineer',
  Accounts: 'Senior Accountant',
  // Role trong JWT của khách hàng, khác 4 role nhân viên ở trên.
  Customer: 'Customer',
});

// Claim accountType trong JWT: phân biệt token của nhân viên và của khách hàng.
export const AccountTypes = Object.freeze({
  Employee: 'Employee',
  Customer: 'Customer',
});

export const EmployeeRoles = Object.freeze([
  Roles.Manager,
  Roles.RetailStaff,
  Roles.FieldEngineer,
  Roles.Accounts,
]);

// Các nhóm quyền dùng chung cho nhiều endpoint.
export const RoleGroups = Object.freeze({
  // Được ĐẶT ĐƠN: retail outlet (spec), Manager (admin) và khách self-service.
  PlaceOrder: [Roles.RetailStaff, Roles.Manager, Roles.Customer],

  // Được ĐỔI trạng thái đơn: Retail Staff (PendingRetail → Pending/Not Approved)
  // và Field Engineer (feasible/provided).
  UpdateOrderStatus: [Roles.RetailStaff, Roles.FieldEngineer, Roles.Manager],

  // Thao tác CHỈ kỹ thuật: feasibility, lên lịch lắp, provision kết nối,
  // đổi trạng thái kết nối, CRUD thiết bị, điều tồn kho.
  TechnicalWrite: [Roles.FieldEngineer, Roles.Manager],

  // Được ghi nhận thanh toán qua /api/retail/payments: nhân viên cửa hàng, Manager,
  // kế toán và khách tự trả online (bị chặn theo quyền sở hữu hoá đơn).
  RecordRetailPayment: [Roles.RetailStaff, Roles.Manager, Roles.Accounts, Roles.Customer],

  // Quầy bán lẻ đọc hoá đơn (thu tiền tại quầy) và danh bạ nhân viên chi nhánh (phân công khảo sát).
  RetailDesk: [Roles.RetailStaff, Roles.Manager],
});
