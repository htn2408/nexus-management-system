import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { previewBill, recentBillingPeriods, money, accountKey } from '../frontend-react/src/components/accounts/billMath.js';
import { normalizeSearchText, orderMatchesSearch } from '../frontend-react/src/components/retail/orderSearch.js';
import {
  isValidEmail,
  isValidCccd,
  isValidPassport,
  isValidDriverLicense,
  isValidPhone,
  digitsOnly,
} from '../frontend-react/src/lib/validation.js';

describe('Frontend calculation: billMath', () => {
  it('previewBill tính đúng chiết khấu, tạm tính, thuế và tổng tiền', () => {
    // cọc: 500, thuê bao: 200, cước giờ: 50, chiết khấu: 10%, thuế: 12.24%, trễ: 15
    // chiết khấu = (500 + 200) * 10% = 70 (không áp lên 50 cước giờ)
    // tạm tính = 500 + 200 + 50 - 70 = 680
    // thuế = 680 * 12.24% = 83.23
    // tổng = 680 + 83.23 + 15 = 778.23
    const result = previewBill({
      securityDeposit: 500,
      monthlyRental: 200,
      hourlyCharges: 50,
      discountPercent: 10,
      taxRate: 12.24,
      lateFee: 15,
    });
    assert.equal(result.discountAmount, 70);
    assert.equal(result.subtotal, 680);
    assert.equal(result.serviceTaxAmount, 83.23);
    assert.equal(result.totalAmount, 778.23);
  });

  it('previewBill với giá trị mặc định bằng 0 trả về 0', () => {
    const empty = previewBill({});
    assert.equal(empty.discountAmount, 0);
    assert.equal(empty.subtotal, 0);
    assert.equal(empty.serviceTaxAmount, 0);
    assert.equal(empty.totalAmount, 0);
  });

  it('recentBillingPeriods sinh đúng 3 kỳ cước liên tiếp', () => {
    const fixedDate = new Date(2026, 9, 15); // Tháng 10/2026
    const periods = recentBillingPeriods(fixedDate);
    assert.equal(periods.length, 3);
    assert.equal(periods[0].value, 'October 2026');
    assert.equal(periods[0].vi, 'Tháng 10/2026');
    assert.equal(periods[0].current, true);
    assert.equal(periods[1].value, 'September 2026');
    assert.equal(periods[1].vi, 'Tháng 9/2026');
    assert.equal(periods[1].current, false);
    assert.equal(periods[2].value, 'August 2026');
    assert.equal(periods[2].vi, 'Tháng 8/2026');
  });

  it('money định dạng số có ký hiệu $ và 2 chữ số thập phân', () => {
    assert.equal(money(125), '$125.00');
    assert.equal(money(99.5), '$99.50');
    assert.equal(money(0), '$0.00');
    assert.equal(money(null), '$0.00');
  });

  it('accountKey loại bỏ dấu gạch ngang và viết hoa', () => {
    assert.equal(accountKey('b064-000000000002'), 'B064000000000002');
    assert.equal(accountKey('T064000000000001'), 'T064000000000001');
    assert.equal(accountKey(null), '');
  });
});

describe('Frontend search: orderSearch', () => {
  it('normalizeSearchText bỏ dấu tiếng Việt và chữ hoa/thường', () => {
    assert.equal(normalizeSearchText('Nguyễn Văn Nam'), 'nguyen van nam');
    assert.equal(normalizeSearchText('Đà Nẵng City'), 'da nang city');
    assert.equal(normalizeSearchText('  Hồ Chí Minh  '), 'ho chi minh');
  });

  it('orderMatchesSearch tìm thấy đơn hàng theo tên, địa chỉ, số điện thoại, hoá đơn', () => {
    const order = {
      id: 'B0000000001',
      assignedAccountId: 'B064-000000000001',
      customerName: 'Nguyễn Văn Nam',
      customerPhone: '0912345678',
      customerEmail: 'nam.nv@example.com',
      idProofNumber: '079090001234',
      installationAddress: '123 Lê Lợi, Quận 1, TP. Hồ Chí Minh',
      planName: 'Broadband Fiber 100M',
      connectionType: 'Broadband',
      retailOutletCode: 'SH-01',
      status: 'Connection Provided',
    };
    const bills = [
      {
        id: 'bill-101',
        invoiceNumber: 'NEX-INV-2026-001',
        accountId: 'B064-000000000001',
        customerName: 'Nguyễn Văn Nam',
      },
    ];
    const opts = { bills, language: 'vi' };

    // Tìm không dấu khớp tên có dấu
    assert.ok(orderMatchesSearch(order, 'nguyen nam', opts));
    // Tìm theo mã đơn
    assert.ok(orderMatchesSearch(order, 'B0000000001', opts));
    // Tìm theo mã tài khoản
    assert.ok(orderMatchesSearch(order, 'B064', opts));
    // Tìm theo số điện thoại
    assert.ok(orderMatchesSearch(order, '0912345678', opts));
    // Tìm theo địa chỉ
    assert.ok(orderMatchesSearch(order, 'le loi', opts));
    // Tìm theo số hoá đơn
    assert.ok(orderMatchesSearch(order, 'NEX-INV-2026-001', opts));
    // Chuỗi không liên quan không khớp
    assert.equal(orderMatchesSearch(order, 'Tran Thi Hoa', opts), false);
  });
});

describe('Frontend validation: validation.js', () => {
  it('isValidEmail kiểm tra đúng định dạng email cơ bản', () => {
    assert.equal(isValidEmail('user@nexus.telecom'), true);
    assert.equal(isValidEmail('invalid-email'), false);
    assert.equal(isValidEmail(''), false);
  });

  it('isValidCccd kiểm tra CCCD đủ 12 chữ số', () => {
    assert.equal(isValidCccd('079090001234'), true);
    assert.equal(isValidCccd('07909000123'), false); // 11 số
    assert.equal(isValidCccd('0790900012345'), false); // 13 số
    assert.equal(isValidCccd('07909000123a'), false);
  });

  it('isValidPassport kiểm tra hộ chiếu từ 7 đến 9 ký tự chữ hoặc số', () => {
    assert.equal(isValidPassport('B1234567'), true);
    assert.equal(isValidPassport('B12345678'), true);
    assert.equal(isValidPassport('B123'), false); // Quá ngắn
    assert.equal(isValidPassport('B1234567890'), false); // Quá dài
  });

  it('isValidDriverLicense kiểm tra GPLX đủ 12 chữ số', () => {
    assert.equal(isValidDriverLicense('123456789012'), true);
    assert.equal(isValidDriverLicense('12345678901'), false);
  });

  it('isValidPhone kiểm tra SĐT đúng 10 chữ số', () => {
    assert.equal(isValidPhone('0912345678'), true);
    assert.equal(isValidPhone('091234567'), false); // 9 số
    assert.equal(isValidPhone('09123456789'), false); // 11 số
    assert.equal(isValidPhone('+84912345678'), false); // Có dấu +
  });

  it('digitsOnly giữ lại chỉ các chữ số và giới hạn độ dài', () => {
    assert.equal(digitsOnly('abc123def456', 5), '12345');
    assert.equal(digitsOnly('090-123-4567', 10), '0901234567');
  });
});
