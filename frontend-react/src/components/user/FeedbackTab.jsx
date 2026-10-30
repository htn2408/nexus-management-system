// Tab phản hồi: khách gửi đánh giá về dịch vụ và xem các phản hồi đã gửi (kèm trả lời của Nexus).
import { useState } from 'react';
import { toast } from 'sonner';
import { MessageSquare, Star } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { nexusStore } from '../../context/NexusContext';
import { useCustomerAccount } from '../../hooks/useCustomerAccount';
import { useStore } from '../../lib/store';

const CATEGORIES = [
  ['Service Quality', 'Chất lượng dịch vụ'],
  ['Installation', 'Lắp đặt'],
  ['Billing', 'Hóa đơn / Cước'],
  ['Support', 'Hỗ trợ'],
  ['Other', 'Khác'],
];

const fieldClass =
  'w-full px-3.5 py-2.5 text-sm bg-[#EDF6FF] dark:bg-[#101C29] border border-[#CCE4F7] dark:border-[#253D56] rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-[#0F1D2B] dark:text-white';
const labelClass = 'block text-xs font-semibold text-[#305070] dark:text-slate-300 uppercase tracking-wider mb-1.5';

export default function FeedbackTab() {
  const isVi = useStore(languageStore.language) === 'vi';
  const { user, accountId, order, myFeedbacks } = useCustomerAccount();
  const [rating, setRating] = useState(5);
  const [category, setCategory] = useState('Service Quality');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.error(isVi ? 'Vui lòng nhập nội dung phản hồi.' : 'Please enter your feedback.');
      return;
    }
    setIsSending(true);
    try {
      await nexusStore.addFeedback({
        accountId: accountId || undefined,
        orderId: order?.id,
        customerName: user?.name || 'Customer',
        rating,
        category,
        message: message.trim(),
      });
      setMessage('');
      toast.success(isVi ? 'Đã gửi phản hồi. Cảm ơn bạn!' : 'Feedback submitted. Thank you!');
    } catch (err) {
      toast.error(isVi ? 'Chưa gửi được phản hồi' : 'Feedback was not sent', {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={submit}
        className="rounded-xl bg-white dark:bg-[#152434] border border-[#CCE4F7] dark:border-[#253D56] shadow-sm p-6 space-y-4"
      >
        <h3 className="font-bold text-base text-[#0F1D2B] dark:text-white flex items-center space-x-2">
          <MessageSquare className="h-4 w-4 text-sky-600 dark:text-sky-400" />
          <span>{isVi ? 'Gửi phản hồi về dịch vụ' : 'Send service feedback'}</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className={labelClass}>{isVi ? 'Đánh giá' : 'Rating'}</div>
            <div className="flex items-center space-x-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setRating(n)} className="p-1" aria-label={`${n} star`}>
                  <Star
                    className={`h-6 w-6 ${n <= rating ? 'text-amber-500 fill-amber-500' : 'text-slate-300 dark:text-slate-600'}`}
                  />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="fbCat" className={labelClass}>
              {isVi ? 'Hạng mục' : 'Category'}
            </label>
            <select id="fbCat" value={category} onChange={(e) => setCategory(e.target.value)} className={fieldClass}>
              {CATEGORIES.map(([value, vi]) => (
                <option key={value} value={value}>
                  {isVi ? vi : value}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="fbMsg" className={labelClass}>
            {isVi ? 'Nội dung' : 'Message'}
          </label>
          <textarea id="fbMsg" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} className={fieldClass}></textarea>
        </div>

        <button
          type="submit"
          disabled={isSending}
          className="px-5 py-2.5 rounded-xl text-sm font-bold bg-sky-600 hover:bg-sky-700 text-white transition shadow disabled:opacity-60"
        >
          {isSending ? (isVi ? 'Đang gửi...' : 'Sending...') : isVi ? 'Gửi phản hồi' : 'Submit feedback'}
        </button>
      </form>

      <div className="rounded-xl bg-white dark:bg-[#152434] border border-[#CCE4F7] dark:border-[#253D56] shadow-sm p-6">
        <h3 className="font-bold text-sm text-[#0F1D2B] dark:text-white mb-3">
          {isVi ? 'Phản hồi đã gửi' : 'Your feedback history'}
        </h3>
        {myFeedbacks.length > 0 ? (
          <div className="divide-y divide-[#CCE4F7] dark:divide-[#253D56] text-xs">
            {myFeedbacks.map((f) => (
              <div key={f.id} className="py-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#0F1D2B] dark:text-white">
                    {f.category} · {'★'.repeat(f.rating)}
                    {'☆'.repeat(5 - f.rating)}
                  </span>
                  <span className="text-slate-400">{f.createdAt}</span>
                </div>
                <p className="text-[#537292] dark:text-[#8DB0D4]">{f.message}</p>
                {f.response && (
                  <p className="mt-1 pl-3 border-l-2 border-sky-400 text-sky-700 dark:text-sky-300">
                    <strong>{isVi ? 'Phản hồi từ Nexus' : 'Nexus response'}:</strong> {f.response}
                    <span className="text-slate-400"> — {f.respondedBy}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#537292] dark:text-[#8DB0D4]">
            {isVi ? 'Bạn chưa gửi phản hồi nào.' : 'You have not submitted any feedback yet.'}
          </p>
        )}
      </div>
    </div>
  );
}
