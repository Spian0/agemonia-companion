import Link from 'next/link';
import './globals.css';
import AuthWrapper from './AuthWrapper'; // 👈 1. 상단에 추가!

export const metadata = {
  title: 'Agemonia Helper',
  description: '아게모니아 보드게임 헬퍼 앱',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      {/* 모바일 화면처럼 보이기 위해 가운데 정렬 및 최대 너비(max-w-md) 설정 */}
      <body className="bg-neutral-900 text-neutral-100 font-sans min-h-screen flex flex-col items-center">
        {/* 👈 2. AuthWrapper로 body 안쪽의 모든 것(하단 메뉴 포함)을 감쌉니다 */}
        <AuthWrapper>
          <div className="w-full max-w-md bg-[#d8c3a5] text-neutral-900 min-h-screen relative shadow-2xl flex flex-col">
            {/* 메인 콘텐츠 영역 (하단 메뉴에 가려지지 않게 pb-20 여백 추가) */}
            <main className="flex-1 pb-20">{children}</main>

            {/* 하단 고정 네비게이션 바 */}
            <nav className="fixed bottom-0 w-full max-w-md bg-[#3e2723] text-[#e9e0d2] flex justify-around py-3 border-t-4 border-[#5d4037] z-50">
              <Link href="/" className="flex flex-col items-center">
                <span className="text-2xl mb-1">⛺</span>
                <span className="text-xs font-bold">파티</span>
              </Link>
              <Link href="/hero" className="flex flex-col items-center">
                <span className="text-2xl mb-1">⚔️</span>
                <span className="text-xs font-bold">영웅</span>
              </Link>
              <Link href="/city" className="flex flex-col items-center">
                <span className="text-2xl mb-1">🏰</span>
                <span className="text-xs font-bold">도시</span>
              </Link>
            </nav>
          </div>
        </AuthWrapper>
      </body>
    </html>
  );
}
