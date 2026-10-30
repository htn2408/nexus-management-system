// Đếm số lần thất bại theo khoá (email, IP...) trong một cửa sổ thời gian, để chặn dò mật khẩu.
// Lưu trong bộ nhớ của tiến trình: đủ cho một instance API; chạy nhiều instance thì cần Redis.

const PRUNE_THRESHOLD = 10_000;

export function createAttemptLimiter({ maxAttempts, windowMs }) {
  // key → { count, resetAt }
  const entries = new Map();

  function active(key, now) {
    const entry = entries.get(key);
    if (entry && entry.resetAt <= now) {
      entries.delete(key);
      return null;
    }
    return entry ?? null;
  }

  function prune(now) {
    for (const [key, entry] of entries) {
      if (entry.resetAt <= now) entries.delete(key);
    }
  }

  return {
    /** Số giây còn bị khoá (0 = được phép thử). */
    retryAfterSeconds(key, now = Date.now()) {
      const entry = active(key, now);
      return entry && entry.count >= maxAttempts ? Math.ceil((entry.resetAt - now) / 1000) : 0;
    },

    recordFailure(key, now = Date.now()) {
      const entry = active(key, now);
      if (entry) {
        entry.count += 1;
      } else {
        if (entries.size >= PRUNE_THRESHOLD) prune(now);
        entries.set(key, { count: 1, resetAt: now + windowMs });
      }
    },

    reset(key) {
      entries.delete(key);
    },
  };
}
