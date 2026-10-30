import { bodySchema, defaultMessages as m, rules } from './helpers.js';

const amount = (field) => [rules.number(m.number(field))];
const dateOnly = (field) => [rules.date(`The value of ${field} is not a valid date.`)];

const MONEY_FIELDS = ['securityDeposit', 'monthlyRental', 'hourlyCharges', 'discountPercent', 'discountAmount', 'serviceTaxRate'];

/** POST /api/billing/bills */
export const createBillSchema = bodySchema({
  ...Object.fromEntries(MONEY_FIELDS.map((field) => [field, amount(field)])),
  dueDate: dateOnly('DueDate'),
});

/** PUT /api/billing/bills/:id */
export const updateBillSchema = bodySchema({
  ...Object.fromEntries([...MONEY_FIELDS, 'lateFeeAmount'].map((field) => [field, amount(field)])),
  dueDate: dateOnly('DueDate'),
});

/** POST /api/billing/bills/payments và POST /api/retail/payments */
export const paymentSchema = bodySchema({
  amountPaid: amount('AmountPaid'),
});

/** PUT /api/billing/settings */
export const billingSettingsSchema = bodySchema({
  serviceTaxRate: [
    rules.required(m.required('ServiceTaxRate')),
    rules.number(m.number('ServiceTaxRate')),
    rules.range(0, 100, m.range('ServiceTaxRate', 0, 100)),
  ],
  latePaymentFeePercent: [
    rules.required(m.required('LatePaymentFeePercent')),
    rules.number(m.number('LatePaymentFeePercent')),
    rules.range(0, 100, m.range('LatePaymentFeePercent', 0, 100)),
  ],
});
