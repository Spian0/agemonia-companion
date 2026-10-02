/* eslint-disable @next/next/no-img-element */
'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient'; 
import { useParams, useRouter } from 'next/navigation';
import IconText from '../../components/IconText'; // 🚨 상위 폴더 경로 주의

import ImageCropperModal from '../../components/ImageCropperModal';

export default function HeroDetailPage() {
  const params = useParams();
  const router = useRouter();
  const heroId = params.id;

  const [hero, setHero] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isKwModalOpen, setIsKwModalOpen] = useState(false);
  const [kwText, setKwText] = useState('');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editHero, setEditHero] = useState({ 
    id: null, name: '', player: '', hero_class: '', job: '', profile_url: null, previewUrl: null, file: null 
  });

  const [cropper, setCropper] = useState({ isOpen: false, src: null });

  useEffect(() => {
    const fetchHero = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.from('hero_info').select('*').eq('id', heroId).single();
        if (error) throw error;
        setHero(data);
      } catch (err) { 
        console.error(err);
        alert('영웅 정보를 불러오지 못했습니다.');
        router.push('/hero'); 
      } finally { 
        setIsLoading(false); 
      }
    };

    if (heroId) fetchHero();
  }, [heroId, router]);

  const openEditModal = () => {
    setEditHero({ ...hero, previewUrl: hero.profile_url, file: null });
    setIsEditModalOpen(true);
  };

  // 기존 handleImageChange 수정
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCropper({ isOpen: true, src: URL.createObjectURL(file) });
      e.target.value = ''; // 같은 파일을 연달아 선택할 수 있게 초기화
    }
  };

  const uploadProfileImage = async (file) => {
    if (!file) return null;
    const fileName = `hero_${Date.now()}_${Math.random().toString(36).substr(2, 5)}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('agemonia_images').upload(fileName, file);
    if (error) return null;
    return supabase.storage.from('agemonia_images').getPublicUrl(fileName).data.publicUrl;
  };

  const handleSaveHero = async () => {
    if (!editHero.name.trim()) return alert('영웅 이름을 입력해주세요.');
    setIsUploading(true);

    let finalProfileUrl = editHero.profile_url;
    if (editHero.file) {
      const uploadedUrl = await uploadProfileImage(editHero.file);
      if (uploadedUrl) finalProfileUrl = uploadedUrl;
    }

    const savedData = {
      name: editHero.name,
      player: editHero.player,
      hero_class: editHero.hero_class,
      job: editHero.job,
      profile_url: finalProfileUrl
    };

    const { error } = await supabase.from('hero_info').update(savedData).eq('id', heroId);
    if (error) {
      alert('수정 실패: ' + error.message);
    } else {
      setHero({ ...hero, ...savedData }); 
      setIsEditModalOpen(false);
    }
    setIsUploading(false);
  };

  const handleAddKeyword = async () => {
    if (!kwText.trim()) return;
    const newKw = { id: Date.now(), text: kwText, active: true };
    const updatedKeywords = hero.keywords ? [...hero.keywords, newKw] : [newKw];

    setHero({ ...hero, keywords: updatedKeywords });
    await supabase.from('hero_info').update({ keywords: updatedKeywords }).eq('id', heroId);
    
    setIsKwModalOpen(false);
    setKwText('');
  };

  const toggleKeywordActive = async (kwId) => {
    const updatedKeywords = hero.keywords.map(kw => kw.id === kwId ? { ...kw, active: !kw.active } : kw);
    setHero({ ...hero, keywords: updatedKeywords });
    await supabase.from('hero_info').update({ keywords: updatedKeywords }).eq('id', heroId);
  };

  const deleteKeyword = async (e, kwId) => {
    e.stopPropagation();
    const updatedKeywords = hero.keywords.filter(kw => kw.id !== kwId);
    setHero({ ...hero, keywords: updatedKeywords });
    await supabase.from('hero_info').update({ keywords: updatedKeywords }).eq('id', heroId);
  };

  if (isLoading || !hero) return <div className="min-h-screen bg-[#dccba6] p-6 text-center font-serif font-bold text-[#3e2723]">불러오는 중...</div>;

  const sortedKeywords = [...(hero.keywords || [])].sort((a, b) => {
    if (a.active === b.active) return 0;
    return a.active ? -1 : 1;
  });

  return (
    <div className="min-h-screen bg-[#dccba6] p-2 md:p-6 font-serif">
      <div className="max-w-md mx-auto bg-[#d0bc9b] border-8 border-double border-[#4a3424] shadow-2xl relative pb-20">
        
        <div className="bg-gradient-to-b from-[#2a1d15] to-[#1a120c] py-4 my-6 border-y-2 border-[#5a4635] shadow-[0_4px_6px_rgba(0,0,0,0.5)] flex items-center px-4 relative">
          <button onClick={() => router.push('/hero')} className="text-[#d4b886] font-bold text-lg hover:text-white transition-colors z-10">
            ◀ 목록으로
          </button>
          <h1 className="text-center text-[#d4b886] text-xl tracking-widest font-extrabold uppercase absolute left-0 w-full" style={{ textShadow: '2px 2px 2px rgba(0,0,0,0.8)' }}>
            PROFILE
          </h1>
        </div>

        <div className="px-6 py-6 flex flex-col items-center border-b-2 border-[#b89e7c] mx-4 mb-4 relative">
          <button onClick={openEditModal} className="absolute top-0 right-0 bg-[#4e3626] text-[#d4b886] px-3 py-1.5 rounded text-xs font-bold border border-[#140d09] shadow-md hover:bg-[#3e2723]">
            ⚙️ 수정
          </button>

          <div className="w-36 h-36 rounded-full border-[6px] border-[#4a3424] shadow-xl bg-[#3e2723] flex items-center justify-center overflow-hidden mb-5">
            {hero.profile_url ? (
              <img src={hero.profile_url} alt={hero.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-5xl opacity-50">👤</span>
            )}
          </div>
          
          <h2 className="text-3xl font-extrabold text-[#3e2723] tracking-wide mb-1" style={{ textShadow: '1px 1px 0px rgba(255,255,255,0.5)' }}>
            {hero.name}
          </h2>
          {hero.player && <span className="text-[#5c4a3d] font-bold mb-4 text-lg">({hero.player})</span>}

          <div className="flex flex-wrap justify-center gap-2 mt-2">
            <span className="bg-[#1c3540] text-[#d6dbe0] px-3 py-1 rounded text-sm font-bold border border-[#4a6370] shadow-sm flex items-center gap-1">
              클래스: <IconText text={hero.hero_class || '-'} />
            </span>
            <span className="bg-[#4a3424] text-[#d4b886] px-3 py-1 rounded text-sm font-bold border border-[#251811] shadow-sm flex items-center gap-1">
              직업: <IconText text={hero.job || '-'} />
            </span>
          </div>
        </div>

        <div className="px-6 py-2">
          <div className="flex justify-between items-center border-b-2 border-[#b89e7c] pb-2 mb-4">
            <h3 className="text-xl italic text-[#3e2723] font-semibold">Personal Keywords</h3>
            <button onClick={() => setIsKwModalOpen(true)} className="w-8 h-8 rounded-full bg-gradient-to-b from-[#4e3626] to-[#251811] text-[#d4b886] font-bold text-xl border border-[#140d09] shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] flex items-center justify-center pb-1">+</button>
          </div>
          
          <div className="space-y-2 mt-4">
            {sortedKeywords.length === 0 && (
               <div className="text-center text-[#8c7355] font-bold py-6 bg-[#e0d0b6] bg-opacity-50 rounded border-2 border-dashed border-[#a68d6c]">
                 등록된 개인 키워드가 없습니다.
               </div>
            )}
            {sortedKeywords.map((kw) => (
              <div 
                key={kw.id} 
                onClick={() => toggleKeywordActive(kw.id)} 
                className={`flex justify-between items-center p-3 rounded shadow-sm border-2 font-bold text-[15px] cursor-pointer transition-colors uppercase tracking-wide
                  ${kw.active ? 'bg-[#c7aa81] text-[#3e2723] border-[#a68d6c]' : 'bg-[#a39481] text-[#5e4b3c] border-[#8c7355] line-through opacity-70'}
                `}
              >
                <span><IconText text={kw.text} /></span>
                <button onClick={(e) => deleteKeyword(e, kw.id)} className="text-[#4a1c18] hover:bg-red-900 hover:text-white transition-colors font-extrabold text-lg px-2 bg-white bg-opacity-20 rounded shadow-sm">✕</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100] p-4 font-serif overflow-y-auto">
          <div className="bg-[#d0bc9b] w-full max-w-sm rounded-xl border-4 border-[#4a3424] flex flex-col shadow-2xl my-8">
            <div className="p-4 pb-3 border-b-2 border-[#a68d6c]">
              <h2 className="text-xl italic text-[#3e2723] font-bold">Edit Profile</h2>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="flex flex-col items-center gap-3 bg-[#e0d0b6] p-4 rounded border border-[#a68d6c]">
                <div className="w-24 h-24 rounded-full border-4 border-[#4a3424] bg-[#3e2723] flex items-center justify-center overflow-hidden shadow-inner">
                  {editHero.previewUrl ? (
                    <img src={editHero.previewUrl} alt="preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-xs text-center px-2 opacity-60">이미지 없음</span>
                  )}
                </div>
                <div className="w-full">
                  <label className="block text-xs font-bold text-[#3e2723] mb-1 text-center">프로필 사진 업로드</label>
                  <input type="file" accept="image/*" onChange={handleImageChange} className="w-full text-xs font-bold bg-white p-1 border border-[#a68d6c] rounded" />
                </div>
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-[#3e2723] mb-1">영웅 이름 <span className="text-red-700">*</span></label>
                  <input type="text" className="w-full p-2 bg-[#e0d0b6] border border-[#a68d6c] rounded font-bold text-[#3e2723]" value={editHero.name} onChange={e => setEditHero({...editHero, name: e.target.value})} />
                </div>
                <div className="w-24">
                  <label className="block text-sm font-bold text-[#3e2723] mb-1">플레이어</label>
                  <input type="text" className="w-full p-2 bg-[#e0d0b6] border border-[#a68d6c] rounded font-bold text-[#3e2723]" value={editHero.player || ''} onChange={e => setEditHero({...editHero, player: e.target.value})} />
                </div>
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-[#3e2723] mb-1">클래스</label>
                  <input type="text" className="w-full p-2 bg-[#e0d0b6] border border-[#a68d6c] rounded font-bold text-[#3e2723]" value={editHero.hero_class || ''} onChange={e => setEditHero({...editHero, hero_class: e.target.value})} />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-bold text-[#3e2723] mb-1">직업 / 역할</label>
                  <input type="text" className="w-full p-2 bg-[#e0d0b6] border border-[#a68d6c] rounded font-bold text-[#3e2723]" value={editHero.job || ''} onChange={e => setEditHero({...editHero, job: e.target.value})} />
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t-2 border-[#a68d6c] flex gap-2">
              <button onClick={() => setIsEditModalOpen(false)} disabled={isUploading} className="flex-1 bg-transparent border-2 border-[#4a3424] text-[#4a3424] py-2 rounded font-bold">취소</button>
              <button onClick={handleSaveHero} disabled={isUploading} className="flex-1 bg-gradient-to-b from-[#4e3626] to-[#251811] text-[#d4b886] border border-[#140d09] py-2 rounded font-bold shadow-md">
                {isUploading ? '저장 중...' : '저장하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isKwModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100] p-4 font-serif">
          <div className="bg-[#d0bc9b] p-6 rounded-lg w-full max-w-xs border-4 border-[#4a3424] shadow-2xl">
            <h2 className="text-xl italic text-[#3e2723] font-bold mb-4 border-b border-[#a68d6c] pb-2">New Keyword</h2>
            <input 
              type="text" 
              className="w-full p-3 bg-[#e0d0b6] border-2 border-[#a68d6c] rounded font-bold mb-4 text-[#3e2723] uppercase text-lg" 
              value={kwText} 
              onChange={e => setKwText(e.target.value)} 
              onKeyDown={e => { if (e.key === 'Enter') handleAddKeyword(); }}
            />
            <div className="flex gap-2">
              <button onClick={() => { setIsKwModalOpen(false); setKwText(''); }} className="flex-1 bg-transparent border-2 border-[#4a3424] text-[#4a3424] py-2 rounded font-bold">취소</button>
              <button onClick={handleAddKeyword} className="flex-1 bg-gradient-to-b from-[#4e3626] to-[#251811] text-[#d4b886] border border-[#140d09] py-2 rounded font-bold">저장</button>
            </div>
          </div>
        </div>
      )}

      <ImageCropperModal
        isOpen={cropper.isOpen}
        imageSrc={cropper.src}
        cropShape="round" // 중요: 영웅 프로필은 원형으로 가이드라인 표시
        initialAspect={1} // 중요: 가로세로 1:1 비율 고정
        onClose={() => setCropper({ ...cropper, isOpen: false })}
        onCropComplete={(file, url) => {
          // 크롭이 완료(자르기 버튼 클릭)되면 editHero 상태에 저장
          setEditHero({ ...editHero, file: file, previewUrl: url });
          setCropper({ ...cropper, isOpen: false });
        }}
      />
    </div>
  );
}