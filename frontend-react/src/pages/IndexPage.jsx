// Trang chủ công khai: giới thiệu, bảng giá gói cước, điểm bán và chat với Admin.
import { useRef } from 'react';
import ChatBox from '../components/chat/ChatBox';
import HeroSection from '../components/home/HeroSection';
import HomeHeader from '../components/home/HomeHeader';
import IntroSection from '../components/home/IntroSection';
import PlansSection from '../components/home/PlansSection';
import ShopsSection from '../components/home/ShopsSection';
import SiteFooter from '../components/home/SiteFooter';

export default function IndexPage() {
  const pageRef = useRef(null);

  return (
    <div
      ref={pageRef}
      className="h-full w-full overflow-y-scroll overflow-x-hidden bg-[#E0F1FF] dark:bg-[#1B2D40] text-[#1B2D40] dark:text-[#E0F1FF] font-sans antialiased selection:bg-sky-500 selection:text-white transition-colors duration-300"
    >
      <HomeHeader onLogoClick={() => pageRef.current?.scrollTo({ top: 0, behavior: 'smooth' })} />
      <HeroSection />
      <IntroSection />
      <PlansSection />
      <ShopsSection />
      <SiteFooter />
      {/* Chatbox nổi: mở ô chat trực tiếp với Admin */}
      <ChatBox />
    </div>
  );
}
