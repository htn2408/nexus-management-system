// Khu gói cước: lọc theo loại, cuộn ngang bằng nút tròn hai bên hoặc kéo thanh cuộn.
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { nexusStore } from '../../context/NexusContext';
import { useStore } from '../../lib/store';
import PlanCard from './PlanCard';
import './PlansCarousel.css';

const CATEGORIES = [
  { id: 'all', labelKey: 'tabAll' },
  { id: 'Broadband', labelKey: 'tabBroadband' },
  { id: 'Landline', labelKey: 'tabLandline' },
  { id: 'Dial-Up', labelKey: 'tabDialup' },
];

const arrowClass =
  'shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-full border border-[#CCE4F7] dark:border-[#253D56] bg-white/95 dark:bg-[#152434]/95 hover:bg-sky-500 hover:text-white dark:hover:bg-sky-600 text-sky-700 dark:text-sky-300 shadow-md flex items-center justify-center transition-all duration-200 disabled:opacity-20 disabled:pointer-events-none cursor-pointer active:scale-95 group focus:outline-hidden';

export default function PlansSection() {
  const t = useStore(languageStore.t);
  const plans = useStore(nexusStore.plans);
  const [category, setCategory] = useState('all');
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const carouselRef = useRef(null);

  const visiblePlans = category === 'all' ? plans : plans.filter((p) => p.type === category);

  const updateScrollState = () => {
    const el = carouselRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(maxScroll > 0 && el.scrollLeft < maxScroll - 10);
  };

  const slide = (direction) => {
    const el = carouselRef.current;
    if (!el) return;
    const cardWidth = el.querySelector('.plan-card')?.clientWidth || 300;
    el.scrollBy({ left: direction * (cardWidth + 16), behavior: 'smooth' });
  };

  // Đổi loại gói thì cuộn về đầu. Trạng thái nút được cập nhật qua sự kiện scroll.
  useEffect(() => {
    carouselRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
    const timer = setTimeout(updateScrollState, 150);
    return () => clearTimeout(timer);
  }, [category, plans.length]);

  return (
    <section id="plans" className="py-16 sm:py-20">
      <div className="w-full px-4 sm:px-6 lg:px-[40px]">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <span className="text-xs uppercase font-bold tracking-wider text-sky-600 dark:text-sky-400">{t.plans.badge}</span>
          <h2 className="text-3xl font-bold text-[#0F1D2B] dark:text-white mt-1">{t.plans.title}</h2>
          <p className="text-sm text-[#537292] dark:text-[#8DB0D4] mt-2">{t.plans.subtitle}</p>

          <div className="mt-8 flex justify-center">
            <div className="inline-flex p-1 bg-white/80 dark:bg-[#152434]/80 border border-[#CCE4F7] dark:border-[#253D56] rounded-xl shadow-xs">
              {CATEGORIES.map(({ id, labelKey }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setCategory(id)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    category === id
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-[#537292] dark:text-[#8DB0D4] hover:text-[#0F1D2B] dark:hover:text-white'
                  }`}
                >
                  {t.plans[labelKey]}
                  {id === 'all' && ` (${plans.length})`}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 mt-6 w-full">
          <button
            type="button"
            onClick={() => slide(-1)}
            disabled={!canScrollLeft}
            className={arrowClass}
            aria-label={t.plans.slideLeft}
            title={t.plans.slideLeft}
          >
            <ChevronLeft className="h-6 w-6 sm:h-7 sm:w-7 transition-transform group-hover:-translate-x-0.5" />
          </button>

          <div
            ref={carouselRef}
            onScroll={updateScrollState}
            className="flex-1 min-w-0 flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pt-3 pb-5 px-1 plans-carousel-scrollbar"
          >
            {visiblePlans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>

          <button
            type="button"
            onClick={() => slide(1)}
            disabled={!canScrollRight}
            className={arrowClass}
            aria-label={t.plans.slideRight}
            title={t.plans.slideRight}
          >
            <ChevronRight className="h-6 w-6 sm:h-7 sm:w-7 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    </section>
  );
}
