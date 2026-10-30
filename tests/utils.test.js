import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { bulkDiscountPercent, isDepositWaived } from '../src/constants/bulkDiscounts.js';
import { groupForAccount, groupForRole } from '../src/constants/realtime.js';
import { maskEmail } from '../src/services/email.service.js';
import { formatAccountId, normalizeAccountId } from '../src/utils/accountId.js';
import { createAttemptLimiter } from '../src/utils/attemptLimiter.js';
import { roundCurrency, toMoney } from '../src/utils/money.js';
import { signToken, verifyToken } from '../src/utils/jwt.js';

describe('accountId', () => {
  it('chuẩn hoá mọi cách gõ về cùng một mã', () => {
    assert.equal(normalizeAccountId('t064-000000000001'), 'T064000000000001');
    assert.equal(normalizeAccountId(' T064 000000000001 '), 'T064000000000001');
    assert.equal(normalizeAccountId(null), '');
  });

  it('định dạng hiển thị có gạch sau 4 ký tự đầu', () => {
    assert.equal(formatAccountId('T064000000000001'), 'T064-000000000001');
    assert.equal(formatAccountId('b064-000000000002'), 'B064-000000000002');
    assert.equal(formatAccountId('T06'), 'T06');
  });
});

describe('bulkDiscountPercent', () => {
  it('đúng các bậc chiết khấu đã chốt theo spec', () => {
    const cases = [
      [0, 0], [9, 0], [10, 25], [14, 25], [15, 50], [24, 50],
      [25, 75], [50, 75], [51, 100], [200, 100],
    ];
    for (const [connections, expected] of cases) {
      assert.equal(bulkDiscountPercent(connections), expected, `${connections} kết nối`);
    }
  });

  it('chỉ miễn cọc khi trên 50 kết nối', () => {
    assert.equal(isDepositWaived(50), false);
    assert.equal(isDepositWaived(51), true);
  });
});

describe('realtime groups', () => {
  it('chỉ nhận role nhân viên hợp lệ', () => {
    assert.equal(groupForRole(' Admin '), 'role:admin');
    assert.equal(groupForRole('hacker'), null);
  });

  it('group khách hàng dùng mã tài khoản đã chuẩn hoá', () => {
    assert.equal(groupForAccount('b064-000000000002'), 'account:B064000000000002');
  });
});

describe('maskEmail', () => {
  it('che phần tên, giữ tên miền', () => {
    assert.equal(maskEmail('nguyenvan@gmail.com'), 'ng*******@gmail.com');
    assert.equal(maskEmail('ab@x.com'), 'a*@x.com');
    assert.equal(maskEmail('khongcoacong'), '***');
    assert.equal(maskEmail(''), '(trống)');
  });
});

describe('jwt', () => {
  it('ký rồi giải mã ra đúng thông tin', () => {
    const token = signToken({ id: 'E001', role: 'Manager', accountType: 'Employee' });
    assert.deepEqual(verifyToken(token), { id: 'E001', role: 'Manager', accountType: 'Employee' });
  });

  it('từ chối token bị sửa', () => {
    const token = signToken({ id: 'E001', role: 'Manager', accountType: 'Employee' });
    assert.throws(() => verifyToken(`${token}x`));
  });
});

describe('attemptLimiter', () => {
  it('khoá khi đủ số lần sai, mở lại khi hết cửa sổ thời gian', () => {
    const limiter = createAttemptLimiter({ maxAttempts: 3, windowMs: 60_000 });
    const t0 = 1_000_000;
    for (let i = 0; i < 2; i++) limiter.recordFailure('a', t0);
    assert.equal(limiter.retryAfterSeconds('a', t0), 0);
    limiter.recordFailure('a', t0);
    assert.equal(limiter.retryAfterSeconds('a', t0 + 10_000), 50);
    assert.equal(limiter.retryAfterSeconds('a', t0 + 60_000), 0);
  });

  it('reset xoá bộ đếm; các khoá độc lập với nhau', () => {
    const limiter = createAttemptLimiter({ maxAttempts: 1, windowMs: 60_000 });
    limiter.recordFailure('a');
    assert.ok(limiter.retryAfterSeconds('a') > 0);
    assert.equal(limiter.retryAfterSeconds('b'), 0);
    limiter.reset('a');
    assert.equal(limiter.retryAfterSeconds('a'), 0);
  });
});

describe('money', () => {
  it('làm tròn .5 ra xa số 0 như bản ASP.NET, không lỗi số thực', () => {
    assert.equal(toMoney(roundCurrency('66.555')), 66.56);
    assert.equal(toMoney(roundCurrency('-0.125')), -0.13);
    assert.equal(toMoney(roundCurrency(0.1 + 0.2)), 0.3);
  });
});
