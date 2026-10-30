// Khung báo lỗi đỏ dùng trong các form. className chỉnh khoảng cách quanh khung (mặc định mt-4).
export default function ErrorAlert({ message, className = 'mt-4' }) {
  if (!message) return null;

  return (
    <div
      className={`${className} p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2`}
    >
      <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping shrink-0"></span>
      <span>{message}</span>
    </div>
  );
}
