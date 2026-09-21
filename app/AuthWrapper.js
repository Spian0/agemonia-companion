'use client';
import { useState, useEffect } from 'react';

export default function AuthWrapper({ children }) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [isChecking, setIsChecking] = useState(true);

  // 🔐 여기에 원하시는 앱 비밀번호를 설정하세요!
  const CORRECT_PASSWORD = '6798';

  useEffect(() => {
    // 사용자가 이전에 비밀번호를 입력한 적이 있는지 브라우저 기록 확인
    const unlocked = localStorage.getItem('agemonia_unlocked');
    if (unlocked === 'true') {
      setIsUnlocked(true);
    }
    setIsChecking(false); // 확인 완료
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === CORRECT_PASSWORD) {
      // 비밀번호가 맞으면 브라우저에 '잠금해제' 상태를 저장 (새로고침해도 유지됨)
      localStorage.setItem('agemonia_unlocked', 'true');
      setIsUnlocked(true);
    } else {
      alert('비밀번호가 틀렸습니다!');
      setPassword('');
    }
  };

  // 새로고침 시 화면이 깜빡이는 것을 방지
  if (isChecking) return <div className="min-h-screen bg-[#dccba6]"></div>;

  // 잠겨있을 때 보여줄 로그인 화면
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-[#dccba6] flex items-center justify-center p-4 font-serif">
        <div className="bg-[#d0bc9b] p-8 rounded-xl border-8 border-double border-[#4a3424] shadow-2xl max-w-sm w-full text-center">
          <h1 className="text-2xl font-extrabold text-[#3e2723] mb-6 border-b-2 border-[#a68d6c] pb-4">
            오사카 순살 감자탕
            <span className="block text-base font-bold text-[#5c4a3d] mt-2 tracking-widest">
              비밀번호 입력
            </span>
          </h1>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              className="w-full p-3 mb-4 border-2 border-[#a68d6c] rounded font-bold text-center bg-[#e0d0b6] text-[#3e2723] focus:outline-none focus:border-[#4a3424]"
            />
            <button
              type="submit"
              className="w-full bg-gradient-to-b from-[#4e3626] to-[#251811] text-[#d4b886] font-bold py-3 rounded border border-[#140d09] shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] hover:opacity-90 active:scale-95 transition-all"
            >
              앱 입장하기
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 비밀번호가 맞으면 원래 앱 화면을 그대로 보여줌
  return <>{children}</>;
}
