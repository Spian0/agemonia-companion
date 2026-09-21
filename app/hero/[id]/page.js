'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../supabaseClient';

export default function HeroDetailPage() {
  const params = useParams();
  const heroId = Number(params.id);

  const [hero, setHero] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // 키워드 추가 모달 상태
  const [isKeywordModalOpen, setIsKeywordModalOpen] = useState(false);
  const [newKeywordText, setNewKeywordText] = useState('');

  // 1. 특정 영웅 정보 불러오기
  useEffect(() => {
    async function fetchHeroDetail() {
      try {
        const { data, error } = await supabase
          .from('hero_info')
          .select('*')
          .eq('id', heroId)
          .single();

        if (error) {
          console.error('영웅 상세 로드 오류:', error.message);
        } else {
          setHero(data);
        }
      } catch (err) {
        console.error('네트워크 오류:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchHeroDetail();
  }, [heroId]);

  // 2. Supabase에 변경사항 저장하는 함수
  const updateHeroInSupabase = async (updatedFields) => {
    const updatedHero = { ...hero, ...updatedFields };
    setHero(updatedHero);

    try {
      const { error } = await supabase
        .from('hero_info')
        .update(updatedFields)
        .eq('id', heroId);

      if (error) {
        console.error('영웅 정보 저장 오류:', error.message);
      }
    } catch (err) {
      console.error('네트워크 오류:', err);
    }
  };

  // 텍스트 정보(이름, 플레이어, 클래스, 직업) 수정
  const handleFieldChange = (field, value) => {
    updateHeroInSupabase({ [field]: value });
  };

  // 키워드 추가
  const handleAddKeyword = () => {
    if (!newKeywordText.trim()) return alert('키워드 내용을 입력해주세요.');
    const updatedKeywords = [
      ...(hero.keywords || []),
      { id: Date.now(), text: newKeywordText, active: true },
    ];

    updateHeroInSupabase({ keywords: updatedKeywords });
    setIsKeywordModalOpen(false);
    setNewKeywordText('');
  };

  // 키워드 활성/비활성화 토글
  const toggleKeywordActive = (kwId) => {
    const updatedKeywords = hero.keywords.map((kw) =>
      kw.id === kwId ? { ...kw, active: !kw.active } : kw
    );
    updateHeroInSupabase({ keywords: updatedKeywords });
  };

  if (isLoading || !hero) {
    return (
      <div className="p-6 text-center text-[#3e2723] font-bold">
        영웅 정보를 불러오는 중...
      </div>
    );
  }

  return (
    <div className="p-4 pb-20 relative">
      {/* 상단 파티 이름 */}
      <div className="text-center font-extrabold text-2xl mb-6 border-b-4 border-[#5d4037] pb-2 text-[#3e2723]">
        오사카 순살 감자탕
      </div>

      {/* 뒤로 가기 버튼 */}
      <Link
        href="/hero"
        className="inline-block mb-4 bg-[#5d4037] text-[#e9e0d2] px-3 py-1 rounded font-bold text-sm shadow"
      >
        ← 영웅 목록으로
      </Link>

      {/* 영웅 정보 수정 카드 */}
      <div className="bg-[#c5b399] p-4 rounded-lg shadow-md border-2 border-[#a38c6d] mb-6 space-y-4">
        <h2 className="text-2xl font-extrabold text-[#3e2723] border-b-2 border-[#a38c6d] pb-2">
          🛡️ {hero.name} 상세 설정
        </h2>

        {/* 캐릭터 이름 */}
        <div>
          <label className="block text-sm font-bold text-[#3e2723] mb-1">
            캐릭터 이름
          </label>
          <input
            type="text"
            className="w-full p-2 border border-[#a38c6d] rounded bg-white text-black font-bold"
            value={hero.name}
            onChange={(e) => handleFieldChange('name', e.target.value)}
          />
        </div>

        {/* 플레이어 이름 */}
        <div>
          <label className="block text-sm font-bold text-[#3e2723] mb-1">
            플레이어 이름
          </label>
          <input
            type="text"
            className="w-full p-2 border border-[#a38c6d] rounded bg-white text-black font-bold"
            value={hero.player}
            onChange={(e) => handleFieldChange('player', e.target.value)}
          />
        </div>

        {/* 클래스 */}
        <div>
          <label className="block text-sm font-bold text-[#3e2723] mb-1">
            클래스
          </label>
          <input
            type="text"
            className="w-full p-2 border border-[#a38c6d] rounded bg-white text-black font-bold"
            value={hero.hero_class || ''}
            onChange={(e) => handleFieldChange('hero_class', e.target.value)}
          />
        </div>

        {/* 직업 */}
        <div>
          <label className="block text-sm font-bold text-[#3e2723] mb-1">
            직업
          </label>
          <input
            type="text"
            className="w-full p-2 border border-[#a38c6d] rounded bg-white text-black font-bold"
            value={hero.job || ''}
            onChange={(e) => handleFieldChange('job', e.target.value)}
          />
        </div>
      </div>

      {/* 영웅 보유 키워드 관리 */}
      <div>
        <div className="flex justify-between items-center mb-3 border-b-2 border-[#a38c6d] pb-1">
          <h3 className="font-bold text-xl italic text-[#3e2723]">
            영웅 보유 키워드
          </h3>
          <button
            onClick={() => setIsKeywordModalOpen(true)}
            className="bg-[#5d4037] text-[#e9e0d2] w-7 h-7 rounded-full text-lg font-bold flex items-center justify-center leading-none pb-1"
          >
            +
          </button>
        </div>

        <div className="space-y-2">
          {hero.keywords && hero.keywords.length > 0 ? (
            hero.keywords.map((kw) => (
              <div
                key={kw.id}
                onClick={() => toggleKeywordActive(kw.id)}
                className={`p-3 rounded-lg shadow-md border font-bold text-lg cursor-pointer transition-all ${
                  kw.active
                    ? 'bg-[#c5b399] text-[#3e2723] border-[#a38c6d] hover:bg-[#b5a389]'
                    : 'bg-neutral-400 text-neutral-600 border-neutral-500 line-through opacity-70'
                }`}
              >
                {kw.text}
              </div>
            ))
          ) : (
            <p className="text-neutral-700 text-center py-4 font-semibold">
              등록된 키워드가 없습니다.
            </p>
          )}
        </div>
      </div>

      {/* === 키워드 추가 모달창 === */}
      {isKeywordModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#e9e0d2] p-6 rounded-xl w-full max-w-xs shadow-2xl border-4 border-[#5d4037]">
            <h2 className="text-xl font-bold mb-4 text-[#3e2723]">
              영웅 키워드 추가
            </h2>
            <div className="mb-4">
              <label className="block text-sm font-bold text-[#3e2723] mb-1">
                키워드 내용
              </label>
              <input
                type="text"
                className="w-full p-2 border border-gray-400 rounded bg-white text-black font-bold"
                value={newKeywordText}
                onChange={(e) => setNewKeywordText(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsKeywordModalOpen(false)}
                className="flex-1 bg-gray-400 text-white py-2 rounded font-bold"
              >
                취소
              </button>
              <button
                onClick={handleAddKeyword}
                className="flex-1 bg-[#5d4037] text-[#e9e0d2] py-2 rounded font-bold"
              >
                추가하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
