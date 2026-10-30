import { Notification } from '../models/notification.model.js';

export function insert(doc) {
  return Notification.collection.insertOne(doc);
}

/** Xoá các bản chưa đọc cùng ReplaceKey của một người nhận. */
export function deleteUnreadByReplaceKey(audience, replaceKey) {
  return Notification.deleteMany({ Audience: audience, ReplaceKey: replaceKey, Read: false });
}

export function findByAudience(audience, limit) {
  return Notification.find({ Audience: audience }).sort({ CreatedAt: -1 }).limit(limit).lean();
}

export async function countByAudience(audience) {
  const [total, unread] = await Promise.all([
    Notification.countDocuments({ Audience: audience }),
    Notification.countDocuments({ Audience: audience, Read: false }),
  ]);
  return { total, unread };
}

/** Trả về số document khớp (0 = không có thông báo này của người nhận này). */
export async function markRead(audience, id) {
  const result = await Notification.updateOne({ _id: id, Audience: audience }, { $set: { Read: true } });
  return result.matchedCount;
}

export async function markAllRead(audience) {
  const result = await Notification.updateMany({ Audience: audience, Read: false }, { $set: { Read: true } });
  return result.modifiedCount;
}
