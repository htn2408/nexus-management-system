// Các trạng thái phải khớp CHECK constraint trong DB và type bên frontend.

export const OrderStatuses = Object.freeze({
  // Vừa nộp, đang chờ Cửa hàng bán lẻ duyệt hồ sơ.
  PendingRetail: 'PendingRetail',
  // Cửa hàng bán lẻ từ chối hồ sơ.
  NotApproved: 'Not Approved',
  // Đã qua bán lẻ, đang chờ Kỹ thuật khảo sát tính khả thi.
  Pending: 'Pending',
  Feasible: 'Feasible',
  NotFeasible: 'Not Feasible',
  ConnectionProvided: 'Connection Provided',
});

// Các trạng thái còn thuộc khâu Cửa hàng bán lẻ.
export const RetailStageOrderStatuses = Object.freeze([
  OrderStatuses.PendingRetail,
  OrderStatuses.NotApproved,
]);

export const ConnectionStatuses = Object.freeze({
  Active: 'Active',
  TemporarilyInactive: 'Temporarily Inactive',
  PermanentlyInactive: 'Permanently Inactive',
});

export const EmployeeStatuses = Object.freeze({
  Active: 'Active',
});

export const EquipmentStatuses = Object.freeze({
  InStock: 'In Stock',
  InService: 'In Service',
  Maintenance: 'Maintenance',
  Faulty: 'Faulty',
});

export const InventoryStatuses = Object.freeze({
  InStock: 'In Stock',
  LowStock: 'Low Stock',
  OutOfStock: 'Out of Stock',
});

// Đúng các giá trị mà CK_Feedback_Category cho phép.
export const FeedbackCategories = Object.freeze([
  'Service Quality',
  'Installation',
  'Billing',
  'Support',
  'Other',
]);

// Đúng các giá trị mà CK_Feedback_Status cho phép ("Pending" KHÔNG hợp lệ).
export const FeedbackStatuses = Object.freeze({
  New: 'New',
  UnderReview: 'Under Review',
  Resolved: 'Resolved',
  Closed: 'Closed',
});
