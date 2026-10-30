import { Roles } from '../constants/roles.js';
import { FeedbackCategories, FeedbackStatuses } from '../constants/statuses.js';
import * as feedbackRepository from '../repositories/feedback.repository.js';
import { AppError } from '../utils/AppError.js';
import { normalizeAccountId } from '../utils/accountId.js';
import { dotnetTicks } from '../utils/ids.js';
import { toNumber } from '../validators/helpers.js';
import * as notificationEvents from './notificationEvents.js';
import * as notificationService from './notification.service.js';
import { clean, matchIgnoreCase } from '../utils/text.js';
import { resolveCustomer } from './customerPortal.service.js';

const FEEDBACK_STATUSES = Object.values(FeedbackStatuses);

export function list() {
  return feedbackRepository.findAll();
}

export async function create(input, user = null) {
  // Danh mục phải khớp CHECK constraint, nếu không INSERT sẽ lỗi.
  const category = matchIgnoreCase(FeedbackCategories, input.category);
  if (!category) {
    throw AppError.badRequest(`Danh mục không hợp lệ. Cho phép: ${FeedbackCategories.join(', ')}`);
  }
  const status = matchIgnoreCase(FEEDBACK_STATUSES, input.status) ?? FeedbackStatuses.New;

  let verifiedCustomerId = clean(input.customerId);
  let verifiedAccountId = input.accountId;
  let verifiedCustomerName = input.customerName?.trim();

  // Bảo mật: Nếu người gửi là khách hàng đã đăng nhập, lấy danh tính thật từ token
  // để tránh việc mạo danh mã khách / mã tài khoản của người khác.
  if (user?.role === Roles.Customer) {
    const customer = await resolveCustomer(user.id);
    if (customer) {
      verifiedCustomerId = customer.customerId;
      verifiedCustomerName = customer.fullName || verifiedCustomerName;
      const rawId = (user.id || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (rawId.length === 16 && 'DBT'.includes(rawId[0])) {
        verifiedAccountId = user.id;
      }
    }
  }

  // Ba khoá ngoại đều cho phép NULL: chỉ gán khi bản ghi thật sự tồn tại,
  // tránh việc một mã sai làm hỏng cả lần gửi phản hồi.
  const [accountId, orderId, customerId] = await Promise.all([
    resolveAccountId(verifiedAccountId),
    keepIfExists(clean(input.orderId), feedbackRepository.orderExists),
    keepIfExists(verifiedCustomerId, feedbackRepository.customerExists),
  ]);

  const rating = Math.min(Math.max(Math.trunc(toNumber(input.rating) ?? 5), 1), 5);
  // 8 chữ số cuối của ticks: các chữ số đầu gần như không đổi nên sẽ trùng khoá chính.
  const feedbackId = clean(input.feedbackId) ?? `FB-${dotnetTicks().slice(10)}`;

  const feedback = {
    feedbackId,
    accountId,
    orderId,
    customerId,
    customerName: verifiedCustomerName || input.customerName.trim(),
    rating,
    category,
    message: input.message.trim(),
    status,
  };
  await feedbackRepository.insert(feedback);

  // Phản hồi mới ⇒ báo ngay cho Quản trị để trả lời khách.
  await notificationEvents.feedbackCreated(feedbackId, feedback.customerName, rating, feedback.message);
  notificationService.notifyDataChanged('feedbacks', feedbackId);

  return feedbackRepository.findById(feedbackId);
}

export async function respond(id, input) {
  const feedback = await feedbackRepository.findById(id);
  if (!feedback) throw AppError.notFound('Không tìm thấy feedback');

  const response = clean(input.response);
  // RespondedBy có khoá ngoại sang Employee: mã không có thật sẽ làm UPDATE lỗi FK.
  const respondedBy = await keepIfExists(clean(input.respondedBy), feedbackRepository.employeeExists);

  // Có câu trả lời ⇒ coi như đã xử lý xong; không thì chỉ đổi trạng thái nếu hợp lệ.
  const status = response
    ? FeedbackStatuses.Resolved
    : (matchIgnoreCase(FEEDBACK_STATUSES, input.status) ?? feedback.status);

  await feedbackRepository.updateResponse(id, {
    response,
    respondedBy,
    status,
    respondedAt: response ? new Date() : null,
  });

  if (response) {
    // Trả lời xong ⇒ khách nhận được thông báo ngay trong cổng khách hàng.
    await notificationEvents.feedbackAnswered(id, feedback.accountId, response);
  }
  notificationService.notifyDataChanged('feedbacks', id);

  return feedbackRepository.findById(id);
}

export async function remove(id) {
  const deleted = await feedbackRepository.remove(id);
  if (deleted === 0) throw AppError.notFound('Không tìm thấy feedback');
  return { message: 'Đã xóa phản hồi' };
}

// ==================== Helpers ====================

async function keepIfExists(value, exists) {
  return value && (await exists(value)) ? value : null;
}

/**
 * Giao diện hiển thị "B064-000000000002" còn CSDL có thể lưu kiểu có hoặc không có gạch,
 * nên so khớp cả hai dạng rồi giữ đúng giá trị đang lưu.
 */
async function resolveAccountId(value) {
  const key = normalizeAccountId(value);
  if (!key) return null;

  const dashed = key.length === 16 && 'DBT'.includes(key[0]) ? `${key.slice(0, 4)}-${key.slice(4)}` : key;
  return feedbackRepository.findStoredAccountId(dashed === key ? [key] : [key, dashed]);
}
