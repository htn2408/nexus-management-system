// Quy tắc của từng loại giấy tờ tuỳ thân khi đăng ký dịch vụ:
// CCCD và bằng lái 12 chữ số, hộ chiếu 7-9 ký tự chữ / số.
import { isValidCccd, isValidDriverLicense, isValidPassport } from './validation';

export const ID_PROOF_RULES = {
  'National ID Card': {
    isValid: isValidCccd,
    pattern: '[0-9]{12}',
    maxLength: 12,
    inputMode: 'numeric',
    placeholder: '012345678901',
    labelVi: 'Căn cước công dân (CCCD)',
    vi: 'Số CCCD phải gồm đúng 12 chữ số.',
    en: 'National ID number must contain exactly 12 digits.',
  },
  Passport: {
    isValid: isValidPassport,
    pattern: '[A-Za-z0-9]{7,9}',
    maxLength: 9,
    inputMode: 'text',
    placeholder: 'C1234567',
    labelVi: 'Hộ chiếu (Passport)',
    vi: 'Số Passport không hợp lệ (7-9 ký tự chữ và số).',
    en: 'Invalid Passport number (7-9 alphanumeric characters).',
  },
  "Driver's License": {
    isValid: isValidDriverLicense,
    pattern: '[0-9]{12}',
    maxLength: 12,
    inputMode: 'numeric',
    placeholder: '012345678901',
    labelVi: 'Bằng lái xe',
    vi: 'Số Bằng lái xe phải gồm đúng 12 chữ số.',
    en: "Driver's License must contain exactly 12 digits.",
  },
};

export const ID_PROOF_TYPES = Object.keys(ID_PROOF_RULES);
