'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../supabaseClient';

export default function HeroPage() {
  const router = useRouter();
  const [heroes, setHeroes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Supabase에서 영웅 목록 불러오기
  useEffect(() => {
    async function fetchHeroes() {
      try {
        const { data, error } = await supabase
          .from('hero_info')
          .select('*')
          .order('id', { ascending: true });

        if (error) {
          console.error('영웅 목록 로드 오류:', error.message);
        }

        if (data) {
          setHeroes(data);
        }
      } catch (err) {
        console.error('네트워크 오류:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchHeroes();
  }, []);

  // 영웅 카드를 누르면 상세 페이지로 이동
  const handleHeroClick = (id) => {
    router.push(`/hero/${id}`);
  };

  if (isLoading) {
    return (
      <div className="p-6 text-center text-[#3e2723] font-bold">
        영웅 목록을 불러오는 중...
      </div>
    );
  }

  return (
    <div className="p-4 pb-20">
      {/* 1. 파티 이름 */}
      <div className="text-center font-extrabold text-2xl mb-6 border-b-4 border-[#5d4037] pb-2 text-[#3e2723]">
        오사카 순살 감자탕
      </div>

      {/* 2. 페이지 타이틀 */}
      <div className="flex justify-between items-center mb-4 border-b-2 border-[#a38c6d] pb-1">
        <h3 className="font-bold text-xl italic text-[#3e2723]">영웅 목록</h3>
        <span className="text-xs font-bold text-[#5d4037] bg-[#c5b399] px-2 py-1 rounded">
          💡 카드를 눌러 상세 설정을 하세요
        </span>
      </div>

      {/* 3. 영웅 카드 리스트 */}
      <div className="space-y-3">
        {heroes.length === 0 ? (
          <p className="text-neutral-700 text-center py-4 font-semibold text-sm">
            등록된 영웅이 없습니다.
          </p>
        ) : (
          heroes.map((hero) => (
            <div
              key={hero.id}
              onClick={() => handleHeroClick(hero.id)}
              className="p-4 rounded-lg shadow-md border-2 cursor-pointer transition-all bg-[#c5b399] text-[#3e2723] border-[#a38c6d] hover:bg-[#b5a389]"
            >
              {/* 영웅 이름 & 플레이어 */}
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⚔️</span>
                  <span className="text-xl font-extrabold">{hero.name}</span>
                </div>
                <span className="text-sm font-bold px-2 py-0.5 rounded bg-[#a38c6d] text-[#3e2723]">
                  플레이어: {hero.player || '미설정'}
                </span>
              </div>

              {/* 클래스 & 직업 표시 */}
              <div className="text-sm font-semibold opacity-90 flex gap-4">
                <span>
                  클래스:{' '}
                  <strong className="underline">
                    {hero.hero_class || '미설정'}
                  </strong>
                </span>
                <span>
                  직업:{' '}
                  <strong className="underline">{hero.job || '미설정'}</strong>
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
