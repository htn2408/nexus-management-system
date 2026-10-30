import { LoginOtp } from '../models/loginOtp.model.js';

/** Mã mới nhất còn chưa dùng của một tài khoản. */
export function findLatestActive(accountKey) {
  return LoginOtp.findOne({ AccountKey: accountKey, Used: false }).sort({ CreatedAt: -1 }).lean();
}

/** Vô hiệu mọi mã chưa dùng của tài khoản (khi xin mã mới). */
export function invalidateActive(accountKey) {
  return LoginOtp.updateMany({ AccountKey: accountKey, Used: false }, { $set: { Used: true } });
}

export function create(otp) {
  return LoginOtp.create(otp);
}

export function incrementAttempts(id) {
  return LoginOtp.updateOne({ _id: id }, { $inc: { Attempts: 1 } });
}

export function markUsed(id) {
  return LoginOtp.updateOne({ _id: id }, { $set: { Used: true } });
}
