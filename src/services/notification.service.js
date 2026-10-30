// Lưu thông báo vào MongoDB rồi đẩy ngay xuống trình duyệt qua Socket.IO.
//
// Nguyên tắc: thông báo là việc phụ, KHÔNG được làm hỏng nghiệp vụ chính. Vì vậy mọi lỗi
// (Mongo sập, socket lỗi) đều bị nuốt và chỉ ghi log — đơn hàng hay hoá đơn đã lưu xong
// trước đó vẫn đứng vững.
import {
  EVERYONE_GROUP,
  NotificationAudiences,
  RealtimeEvents,
  groupForChatSession,
} from '../constants/realtime.js';
import * as notificationRepository from '../repositories/notification.repository.js';
import { emitToGroup } from '../sockets/index.js';
import { guidN } from '../utils/ids.js';

// Thông báo chỉ giữ 30 ngày, quá hạn Mongo tự xoá bằng TTL index.
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
export const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

// ==================== Phát thông báo ====================

/**
 * Gửi cùng một nội dung tới một hoặc nhiều người nhận. Mỗi người nhận có bản ghi riêng.
 * draft: { type, titleVi, titleEn, descVi, descEn, targetPath, targetTab?, targetRole?,
 *          sectionVi, sectionEn, entityId?, replaceKey? }
 */
export async function publish(draft, audiences) {
  const list = Array.isArray(audiences) ? audiences : [audiences];
  const seen = new Set();
  const targets = [];
  for (const audience of list) {
    const value = audience?.trim();
    if (!value || seen.has(value.toLowerCase())) continue;
    seen.add(value.toLowerCase());
    targets.push(value);
  }

  const now = new Date();

  for (const audience of targets) {
    const doc = {
      _id: `NTF-${guidN()}`,
      Audience: audience,
      Type: draft.type,
      TitleVi: draft.titleVi,
      TitleEn: draft.titleEn,
      DescVi: draft.descVi,
      DescEn: draft.descEn,
      TargetPath: draft.targetPath,
      TargetTab: draft.targetTab ?? '',
      TargetRole: draft.targetRole ?? null,
      SectionVi: draft.sectionVi,
      SectionEn: draft.sectionEn,
      EntityId: draft.entityId ?? null,
      ReplaceKey: draft.replaceKey ?? null,
      Read: false,
      CreatedAt: now,
      ExpiresAt: new Date(now.getTime() + RETENTION_MS),
    };

    try {
      // Tin lặp lại thì dọn bản chưa đọc cũ để hộp thông báo không bị một sự kiện chiếm hết chỗ.
      if (doc.ReplaceKey) {
        await notificationRepository.deleteUnreadByReplaceKey(audience, doc.ReplaceKey);
      }
      await notificationRepository.insert(doc);
    } catch (err) {
      // Không lưu được vẫn đẩy đi: người đang mở máy vẫn thấy, chỉ mất lịch sử.
      console.warn(`[notification] Không lưu được thông báo cho ${audience}:`, err.message);
    }

    safeEmit(audience, RealtimeEvents.Notification, toDto(doc));
  }
}

// ==================== Đọc / đánh dấu đã đọc ====================

export async function list(audience, limit = DEFAULT_LIMIT) {
  const safeLimit = Math.min(Math.max(Number.isFinite(limit) ? limit : DEFAULT_LIMIT, 1), MAX_LIMIT);
  const docs = await notificationRepository.findByAudience(audience, safeLimit);
  return docs.map(toDto);
}

export function count(audience) {
  return notificationRepository.countByAudience(audience);
}

/** Đánh dấu đã đọc rồi báo các tab khác của cùng người nhận để chấm đỏ tắt đồng loạt. */
export async function markRead(audience, id) {
  const matched = await notificationRepository.markRead(audience, id);
  if (matched === 0) return false;

  safeEmit(audience, RealtimeEvents.NotificationRead, { id });
  return true;
}

export async function markAllRead(audience) {
  const updated = await notificationRepository.markAllRead(audience);
  safeEmit(audience, RealtimeEvents.NotificationsRead, { audience });
  return updated;
}

// ==================== Sự kiện realtime khác (không lưu lịch sử) ====================

/** Báo mọi client "bảng dữ liệu X vừa đổi" để dashboard tự tải lại, không cần F5. */
export function notifyDataChanged(entity, id = null) {
  safeEmit(EVERYONE_GROUP, RealtimeEvents.DataChanged, { entity, id });
}

/** Đẩy một tin nhắn chat tới đúng phiên của khách và tới Admin. */
export function pushChatMessage(sessionId, message) {
  safeEmit([groupForChatSession(sessionId), NotificationAudiences.Admin], RealtimeEvents.ChatMessage, message);
}

/** Đẩy trạng thái mới của một phiên chat (tin cuối, số chưa đọc) cho Admin. */
export function pushChatSession(session) {
  safeEmit(NotificationAudiences.Admin, RealtimeEvents.ChatSession, session);
}

// ==================== Hạ tầng ====================

/** Mất kết nối socket không được ném lên tầng nghiệp vụ. */
function safeEmit(groups, event, payload) {
  try {
    emitToGroup(groups, event, payload);
  } catch (err) {
    console.warn('[notification] Không đẩy được sự kiện realtime:', err.message);
  }
}

/** Dạng trả về cho frontend (khớp interface NotificationDto bên Svelte). */
function toDto(n) {
  return {
    id: n._id,
    audience: n.Audience,
    type: n.Type,
    titleVi: n.TitleVi,
    titleEn: n.TitleEn,
    descVi: n.DescVi,
    descEn: n.DescEn,
    targetPath: n.TargetPath,
    targetTab: n.TargetTab,
    targetRole: n.TargetRole ?? null,
    sectionVi: n.SectionVi,
    sectionEn: n.SectionEn,
    entityId: n.EntityId ?? null,
    replaceKey: n.ReplaceKey ?? null,
    read: n.Read,
    createdAt: new Date(n.CreatedAt).toISOString(),
  };
}
