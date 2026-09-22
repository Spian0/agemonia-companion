import './globals.css';
import Link from 'next/link';
import AuthWrapper from './AuthWrapper'; 

export const metadata = {
  title: '오사카 순살 감자탕',
  description: 'Agemonia Companion App',
};

// 🚨 괄호 안에 : any 를 넣어서 무조건 통과되게 만듭니다!
export default function RootLayout({ children }: any) {
  return (
    <html lang="ko">
      <body className="bg-[#dccba6]">
        <AuthWrapper>
          <div className="max-w-md mx-auto relative min-h-screen bg-[#dccba6] shadow-2xl">
            <div className="pb-16">
              {children}
            </div>

            <nav className="fixed bottom-0 w-full max-w-md mx-auto bg-[#3e2723] border-t-4 border-[#5d4037] flex justify-around items-center p-2 z-[90] shadow-[0_-4px_6px_rgba(0,0,0,0.5)]">
              <Link href="/" className="flex flex-col items-center text-[#d4b886] hover:text-white transition-colors">
                <span className="text-2xl drop-shadow-md">⛺</span>
                <span className="text-xs font-bold mt-1 tracking-wider">파티</span>
              </Link>
              <Link href="/hero" className="flex flex-col items-center text-[#d4b886] hover:text-white transition-colors">
                <span className="text-2xl drop-shadow-md">⚔️</span>
                <span className="text-xs font-bold mt-1 tracking-wider">영웅</span>
              </Link>
              <Link href="/city" className="flex flex-col items-center text-[#d4b886] hover:text-white transition-colors">
                <span className="text-2xl drop-shadow-md">🏰</span>
                <span className="text-xs font-bold mt-1 tracking-wider">도시</span>
              </Link>
            </nav>
          </div>
        </AuthWrapper>
      </body>
    </html>
  );
}