import { queryOne } from '../config/database.js';

/** Các con số tổng quan cho dashboard Kỹ thuật, gom trong một lượt truy vấn. */
export function technicalCounts() {
  return queryOne(`
    SELECT
      (SELECT COUNT(*) FROM dbo.Orders WHERE Status = 'Pending') AS pendingOrders,
      (SELECT COUNT(*) FROM dbo.Orders WHERE Status = 'Feasible') AS feasibleOrders,
      (SELECT COUNT(*) FROM dbo.CustomerConnection WHERE Status = 'Active') AS activeConnections,
      (SELECT COUNT(*) FROM dbo.CustomerConnection WHERE Status <> 'Active') AS inactiveConnections,
      (SELECT COUNT(*) FROM dbo.Equipment e
        WHERE e.Status = 'In Stock' AND e.AssignedAccountId IS NULL
          AND NOT EXISTS (SELECT 1 FROM dbo.CustomerConnection cc WHERE cc.EquipmentID = e.EquipmentID)) AS availableEquipment,
      (SELECT COUNT(*) FROM dbo.InventoryItem WHERE StockQuantity <= ReorderLevel) AS lowStockItems`);
}
