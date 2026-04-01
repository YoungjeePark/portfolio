import { useLanguage } from "../context/LanguageContext";
import { motion } from "framer-motion";
import React, { useEffect } from "react";
import { Link } from 'react-router-dom';
import ParticlesBackground from "../components/ParticlesBackground";
import MindMapPage from "./MindMap";
import BrickBreaker from "../games/BrickBreaker";
import BrickGirlSD from "../games/BrickGirlSD";
import BrickGirlRT from "../games/BrickGirlRT";

export default function Home() {
  const { language } = useLanguage();

  // 페이지 진입 시 GA 이벤트 전송
  useEffect(() => {
    if (window.gtag) {
      window.gtag('event', 'page_view', {
        page_title: 'Home',
        page_location: window.location.href,
        page_path: window.location.hash.replace(/^#/, '') || '/'
      });
    }
  }, []);

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-start bg-white text-gray-800 dark:bg-gray-900 dark:text-gray-100 overflow-hidden">
      <ParticlesBackground />

      {/* 상단 타이틀 */}
      <div className="relative w-full text-center mb-12 z-10">
        <motion.h1 className="text-5xl font-extrabold mb-4 text-cyan-300 glow-text tracking-tight">
          {language === "en" ? "Code · Create · Connect" : "생각을 구현하고 · 이야기를 코딩하다"}
        </motion.h1>
        <p className="text-xl text-gray-300 dark:text-gray-200 glow-text">
          {language === "en"
            ? "Welcome to my mini universe ✦ where logic meets imagination."
            : "7년 차 풀스택 개발자 ✦ 4개 국어로 소통하는 크리에이터"}
        </p>

        <div className="relative w-full h-[80vh] overflow-hidden">
          <MindMapPage />
        </div>
      </div>

      {/* <div className="text-center mb-12 z-10">
        {language === "en"
          ? ["Code. Create. Connect."].map((line, i) => (
            <h1 key={i} className="text-5xl font-bold mb-4 glow-text">
              {line}
            </h1>
          ))
          : ["생각을 구현하고, 이야기를 코딩하다"].map((line, i) => (
            <h1 key={i} className="text-5xl font-bold mb-4 glow-text">
              {line}
            </h1>
          ))}
        <div className="text-center mb-4 z-10">
          <p className="text-xl mb-3 glow-text text-gray-700 dark:text-gray-300">
            {language === "en"
              ? "Welcome to my mini universe — where logic meets imagination."
              : "7년 차 풀스택 개발자, 4개 국어로 소통하는 크리에이터"}
          </p>
        </div>
      </div> */}

      {/* 게임 영역 */}
      {/* <div className="text-center z-10">
        <BrickGirlSD />
        <div style={{ marginTop: '40px' }}>
          <h1 className="text-indigo-400 text-xl font-bold">🎮 More Games 🕹️</h1>
          <p>▶️ <Link className="hover:underline" to="/bb">Brick Breaker</Link></p>
          <p>▶️ <Link className="hover:underline" to="/bsd">Brick Girl: Space Defense</Link></p>
          <p>▶️ <Link className="hover:underline" to="/brt">Brick Girl: Run & Throw</Link></p>
        </div>
      </div> */}

      <style>
        {`
          .glow-text {
          text-shadow:
            0 0 4px rgba(255, 255, 255, 0.5),
            0 0 10px rgba(173, 216, 230, 0.7),
            0 0 20px rgba(0, 255, 255, 0.3);
            // animation: glow 3s ease-in-out infinite;
          }

          @keyframes glow {
            0%, 100% {
              text-shadow: 0 0 4px #ffffff, 0 0 8px #a5b4fc, 0 0 12px #818cf8;
            }
            50% {
              text-shadow: 0 0 6px #e0e7ff, 0 0 10px #c7d2fe, 0 0 16px #a5b4fc;
            }
          }
        `}
      </style>
    </main>

  );
}
