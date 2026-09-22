'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient'; 
import { useRouter } from 'next/navigation';

export default function HeroPage() {
  const router = useRouter();
  const [heroes, setHeroes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [editHero, setEditHero] = useState({ 
    id: null, name: '', player: '', hero_class: '', job: '', profile_url: null, previewUrl: null, file: null 
  });

  useEffect(() => {
    fetchHeroes();
  }, []);

  const fetchHeroes = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('hero_info').select('*').order('id', { ascending: true });
      if (error) throw error;
      if (data) setHeroes(data);
    } catch (err) { 
      console.error(err); 
    } finally { 
      setIsLoading(false); 
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

    if (editHero.id) {
      await supabase.from('hero_info').update(savedData).eq('id', editHero.id);
    } else {
      await supabase.from('hero_info').insert([savedData]);
    }

    await fetchHeroes(); 
    setIsUploading(false);
    setIsModalOpen(false);
  };

  const openEditModal = (e, hero) => {
    e.stopPropagation(); 
    setEditHero({ ...hero, previewUrl: hero.profile_url, file: null });
    setIsModalOpen(true);
  };

  const openNewModal = () => {
    setEditHero({ id: null, name: '', player: '', hero_class: '', job: '', profile_url: null, previewUrl: null, file: null });
    setIsModalOpen(true);
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation(); 
    if(!confirm('이 영웅을 파티에서 제외(삭제)하시겠습니까?')) return;
    await supabase.from('hero_info').delete().eq('id', id);
    fetchHeroes();
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) setEditHero({ ...editHero, file: file, previewUrl: URL.createObjectURL(file) });
  };

  if (isLoading) return <div className="min-h-screen bg-[#dccba6] p-6 text-center font-serif font-bold text-[#3e2723]">영웅 정보를 불러오는 중입니다...</div>;

  return (
    <div className="min-h-screen bg-[#dccba6] p-2 md:p-6 font-serif">
      <div className="max-w-md mx-auto bg-[#d0bc9b] border-8 border-double border-[#4a3424] shadow-2xl relative pb-20">
        
        <div className="bg-gradient-to-b from-[#2a1d15] to-[#1a120c] py-4 my-6 border-y-2 border-[#5a4635] shadow-[0_4px_6px_rgba(0,0,0,0.5)]">
          <h1 className="text-center text-[#d4b886] text-2xl tracking-widest font-extrabold uppercase relative" style={{ textShadow: '2px 2px 2px rgba(0,0,0,0.8)' }}>
            <span className="absolute left-4 opacity-50">✦</span>
            영웅 목록
            <span className="absolute right-4 opacity-50">✦</span>
          </h1>
        </div>

        <div className="px-6 py-4">
          <div className="flex justify-between items-center border-b-2 border-[#b89e7c] pb-2 mb-4">
            <h3 className="text-xl italic text-[#3e2723] font-semibold">파티 멤버</h3>
            <button onClick={openNewModal} className="w-8 h-8 rounded-full bg-gradient-to-b from-[#4e3626] to-[#251811] text-[#d4b886] font-bold text-xl border border-[#140d09] shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] flex items-center justify-center pb-1">+</button>
          </div>
          
          <div className="space-y-4">
            {heroes.length === 0 && (
              <div className="text-center text-[#5c4a3d] font-bold py-8 border-2 border-dashed border-[#a68d6c] rounded bg-[#e0d0b6] bg-opacity-50">
                합류한 영웅이 없습니다.<br/>+ 버튼을 눌러 영웅을 추가하세요.
              </div>
            )}

            {heroes.map((hero) => (
              <div 
                key={hero.id} 
                onClick={() => router.push(`/hero/${hero.id}`)} 
                className="bg-gradient-to-r from-[#e0d0b6] to-[#d0bc9b] border-2 border-[#8c7355] rounded-lg p-3 shadow-md flex items-center gap-4 cursor-pointer hover:scale-[1.02] transition-transform"
              >
                <div className="shrink-0 relative">
                  <div className="w-20 h-20 rounded-full border-4 border-[#4a3424] shadow-inner bg-[#3e2723] flex items-center justify-center overflow-hidden">
                    {hero.profile_url ? (
                      <img src={hero.profile_url} alt={hero.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl opacity-50">👤</span>
                    )}
                  </div>
                </div>

                <div className="grow">
                  <div className="text-2xl font-extrabold text-[#3e2723] tracking-wide mb-1" style={{ textShadow: '1px 1px 0px rgba(255,255,255,0.5)' }}>
                    {hero.name} 
                    {hero.player && <span className="text-sm text-[#5c4a3d] ml-1">({hero.player})</span>}
                  </div>
                  
                  {/* 클래스와 직업을 항상 고정적으로 표시 */}
                  <div className="flex gap-2 mt-2">
                    <span className="bg-[#1c3540] text-[#d6dbe0] px-2 py-0.5 rounded text-[11px] font-bold border border-[#4a6370] shadow-sm">클래스: {hero.hero_class || '-'}</span>
                    <span className="bg-[#4a3424] text-[#d4b886] px-2 py-0.5 rounded text-[11px] font-bold border border-[#251811] shadow-sm">직업: {hero.job || '-'}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  <button onClick={(e) => openEditModal(e, hero)} className="bg-[#4e3626] text-[#d4b886] px-3 py-1 rounded text-xs font-bold border border-[#140d09] shadow hover:bg-[#3e2723]">수정</button>
                  <button onClick={(e) => handleDelete(e, hero.id)} className="bg-[#5c2a2a] text-[#e8dcc8] px-3 py-1 rounded text-xs font-bold border border-[#3d1818] shadow hover:bg-[#4a1c18]">삭제</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100] p-4 font-serif overflow-y-auto">
          <div className="bg-[#d0bc9b] w-full max-w-sm rounded-xl border-4 border-[#4a3424] flex flex-col shadow-2xl my-8">
            <div className="p-4 pb-3 border-b-2 border-[#a68d6c]">
              <h2 className="text-xl italic text-[#3e2723] font-bold">{editHero.id ? 'Edit Hero' : 'New Hero'}</h2>
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
              <button onClick={() => setIsModalOpen(false)} disabled={isUploading} className="flex-1 bg-transparent border-2 border-[#4a3424] text-[#4a3424] py-2 rounded font-bold">취소</button>
              <button onClick={handleSaveHero} disabled={isUploading} className="flex-1 bg-gradient-to-b from-[#4e3626] to-[#251811] text-[#d4b886] border border-[#140d09] py-2 rounded font-bold shadow-md">
                {isUploading ? '업로드 중...' : '저장하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}