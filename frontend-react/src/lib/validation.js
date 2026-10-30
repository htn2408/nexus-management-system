/** Shared customer/contact validation rules used by auth and customer forms. */
export const EMAIL_REGEX = /.*@.*/;
export const CCCD_REGEX = /^\d{12}$/;
export const PASSPORT_REGEX = /^[A-Z0-9]{7,9}$/;
export const DRIVER_LICENSE_REGEX = /^\d{12}$/;
export const isValidEmail = (value) => EMAIL_REGEX.test(value.trim());
export const isValidCccd = (value) => CCCD_REGEX.test(value.trim());
export const isValidPassport = (value) => PASSPORT_REGEX.test(value.trim().toUpperCase());
export const isValidDriverLicense = (value) => DRIVER_LICENSE_REGEX.test(value.trim());
/**
 * Phone validation deliberately avoids a regex and checks the raw value:
 * exactly 10 ASCII digits, with no spaces, signs, or punctuation.
 */
export const isValidPhone = (value) => {
  const phone = value.trim();
  return phone.length === 10 && [...phone].every((char) => char >= '0' && char <= '9');
};
export const digitsOnly = (value, maxLength) => value.replace(/\D/g, '').slice(0, maxLength);
