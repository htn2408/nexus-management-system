import { queryOne, queryRows, query } from '../config/database.js';
import { containsPattern, likeAny, whereClause } from '../utils/sqlFilters.js';

const COLUMNS = `
  PlanID AS planId, PlanCode AS planCode, Name AS name, ConnectionType AS connectionType,
  SpeedOrBandwidth AS speedOrBandwidth, MonthlyRental AS monthlyRental, HourlyCharge AS hourlyCharge,
  SecurityDeposit AS securityDeposit, DataLimit AS dataLimit, BillingCycle AS billingCycle,
  Validity AS validity, IncludedHours AS includedHours, CallRates AS callRates,
  Description AS description, IsPopular AS isPopular, Status AS status,
  CreatedAt AS createdAt, UpdatedAt AS updatedAt`;

// Tìm theo: mã gói, tên, tốc độ, mô tả, giá cước cuộc gọi.
const SEARCH_COLUMNS = ['PlanID', 'PlanCode', 'Name', 'SpeedOrBandwidth', 'Description', 'CallRates'];

/** filters: { search?, connectionType?, status? }; mỗi field null = không lọc. */
export function findAll({ search, connectionType, status } = {}, orderBy = 'ConnectionType, MonthlyRental') {
  const conditions = [];
  const params = {};

  if (search) {
    conditions.push(likeAny(SEARCH_COLUMNS));
    params.search = containsPattern(search);
  }
  if (connectionType) {
    conditions.push('ConnectionType = @connectionType');
    params.connectionType = connectionType;
  }
  if (status) {
    conditions.push('Status = @status');
    params.status = status;
  }

  return queryRows(
    `SELECT ${COLUMNS} FROM dbo.ServicePlan ${whereClause(conditions)} ORDER BY ${orderBy}`,
    params
  );
}

export function countStats() {
  return queryOne(`
    SELECT COUNT(*) AS totalPlans,
           SUM(CASE WHEN ConnectionType = 'Broadband' THEN 1 ELSE 0 END) AS broadbandPlansCount,
           SUM(CASE WHEN ConnectionType = 'Dial-Up' THEN 1 ELSE 0 END) AS dialUpPlansCount,
           SUM(CASE WHEN ConnectionType = 'Landline' THEN 1 ELSE 0 END) AS landlinePlansCount,
           SUM(CASE WHEN Status = 'Active' THEN 1 ELSE 0 END) AS activePlansCount,
           SUM(CASE WHEN Status = 'Archived' THEN 1 ELSE 0 END) AS archivedPlansCount
    FROM dbo.ServicePlan`);
}

/** Tìm theo PlanID hoặc PlanCode. */
export function findByIdOrCode(id) {
  return queryOne(`SELECT TOP 1 ${COLUMNS} FROM dbo.ServicePlan WHERE PlanID = @id OR PlanCode = @id`, { id });
}

export function findById(id) {
  return queryOne(`SELECT ${COLUMNS} FROM dbo.ServicePlan WHERE PlanID = @id`, { id });
}

const WRITABLE = [
  'name', 'connectionType', 'speedOrBandwidth', 'monthlyRental', 'securityDeposit', 'billingCycle',
  'validity', 'dataLimit', 'status', 'includedHours', 'hourlyCharge', 'description', 'callRates', 'isPopular',
];

function pick(plan) {
  return Object.fromEntries(WRITABLE.map((key) => [key, plan[key]]));
}

export async function insert(plan) {
  await query(
    `INSERT INTO dbo.ServicePlan
       (PlanID, PlanCode, Name, ConnectionType, SpeedOrBandwidth, MonthlyRental, SecurityDeposit,
        BillingCycle, Validity, DataLimit, Status, IncludedHours, HourlyCharge, Description,
        CallRates, IsPopular, CreatedAt, UpdatedAt)
     VALUES
       (@planId, @planCode, @name, @connectionType, @speedOrBandwidth, @monthlyRental, @securityDeposit,
        @billingCycle, @validity, @dataLimit, @status, @includedHours, @hourlyCharge, @description,
        @callRates, @isPopular, @now, @now)`,
    { ...pick(plan), planId: plan.planId, planCode: plan.planCode, now: new Date() }
  );
}

export async function update(planId, plan) {
  await query(
    `UPDATE dbo.ServicePlan SET
       Name = @name, ConnectionType = @connectionType, SpeedOrBandwidth = @speedOrBandwidth,
       MonthlyRental = @monthlyRental, SecurityDeposit = @securityDeposit, BillingCycle = @billingCycle,
       Validity = @validity, DataLimit = @dataLimit, Status = @status, IncludedHours = @includedHours,
       HourlyCharge = @hourlyCharge, Description = @description, CallRates = @callRates,
       IsPopular = @isPopular, UpdatedAt = @now
     WHERE PlanID = @planId`,
    { ...pick(plan), planId, now: new Date() }
  );
}

/** Trả về số dòng bị xoá. */
export async function remove(planId) {
  const result = await query('DELETE FROM dbo.ServicePlan WHERE PlanID = @planId', { planId });
  return result.rowsAffected[0];
}
