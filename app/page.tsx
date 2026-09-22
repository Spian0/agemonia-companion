'use client';
import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient'; 

export default function PartyPage() {
  const [level, setLevel] = useState<number>(1);
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [keywords, setKeywords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [isScenarioModalOpen, setIsScenarioModalOpen] = useState<boolean>(false);
  const [scenarioToDelete, setScenarioToDelete] = useState<any>(null);
  const [newScenario, setNewScenario] = useState<any>({ id: null, name: '', number: '', hasExp: false, length: '짧음', isArena: false });

  const [isKeywordModalOpen, setIsKeywordModalOpen] = useState<boolean>(false);
  const [editingKeyword, setEditingKeyword] = useState<any>({ id: null, text: '' });

  useEffect(() => {
    async function fetchPartyData() {
      try {
        const { data } = await supabase.from('party_info').select('*').limit(1).maybeSingle();
        if (data) {
          setLevel(data.level || 1);
          setScenarios(data.scenarios || []);
          setKeywords(data.keywords || []);
        }
      } catch (err) { console.error(err); } finally { setIsLoading(false); }
    }
    fetchPartyData();
  }, []);

  const saveToSupabase = async (newLevel: any, newScenarios: any, newKeywords: any) => {
    const { error } = await supabase.from('party_info').upsert({ id: 1, level: newLevel, scenarios: newScenarios, keywords: newKeywords });
    if (error) alert('파티 DB 저장 실패! 원인: ' + error.message);
  };

  const increaseLevel = () => { if (level < 5) { const n = level + 1; setLevel(n); saveToSupabase(n, scenarios, keywords); } };
  const decreaseLevel = () => { if (level > 1) { const n = level - 1; setLevel(n); saveToSupabase(n, scenarios, keywords); } };

  const handleSaveScenario = () => {
    if (!newScenario.name || !newScenario.number) return alert('이름과 번호를 입력해주세요.');
    let updatedScenarios = newScenario.id ? scenarios.map((s: any) => s.id === newScenario.id ? newScenario : s) : [...scenarios, { ...newScenario, id: Date.now() }];
    setScenarios(updatedScenarios);
    saveToSupabase(level, updatedScenarios, keywords);
    setIsScenarioModalOpen(false);
  };

  const openEditScenario = (e: any, scenario: any) => { e.stopPropagation(); setNewScenario(scenario); setIsScenarioModalOpen(true); };

  const handleDeleteScenario = () => {
    const updatedScenarios = scenarios.filter((s: any) => s.id !== scenarioToDelete.id);
    setScenarios(updatedScenarios);
    saveToSupabase(level, updatedScenarios, keywords);
    setScenarioToDelete(null);
  };

  const handleSaveKeyword = () => {
    if (!editingKeyword.text.trim()) return alert('키워드 내용을 입력해주세요.');
    let updatedKeywords = editingKeyword.id ? keywords.map((kw: any) => kw.id === editingKeyword.id ? { ...kw, text: editingKeyword.text } : kw) : [...keywords, { id: Date.now(), text: editingKeyword.text, active: true }];
    setKeywords(updatedKeywords);
    saveToSupabase(level, scenarios, updatedKeywords);
    setIsKeywordModalOpen(false);
  };

  const openEditKeyword = (e: any, kw: any) => { e.stopPropagation(); setEditingKeyword({ id: kw.id, text: kw.text }); setIsKeywordModalOpen(true); };

  const toggleKeywordActive = (id: any) => {
    const updatedKeywords = keywords.map((kw: any) => kw.id === id ? { ...kw, active: !kw.active } : kw);
    setKeywords(updatedKeywords);
    saveToSupabase(level, scenarios, updatedKeywords);
  };

  const sortedKeywords = [...keywords].sort((a: any, b: any) => {
    if (a.active === b.active) return 0;
    return a.active ? -1 : 1;
  });

  // 🚨 길이별 색상 적용 (녹 > 파 > 빨)
  const getCardTheme = (length: any) => {
    if (length === '짧음') return { bg: 'bg-[#243d25]', border: 'border-[#4a684b]', text: 'text-[#d8e3d8]', num: 'text-[#9cb59c]' }; // 녹색
    if (length === '중간') return { bg: 'bg-[#1c3540]', border: 'border-[#4a6370]', text: 'text-[#d6dbe0]', num: 'text-[#a4b4bc]' }; // 파란색
    if (length === '긺') return { bg: 'bg-[#5c2a2a]', border: 'border-[#8a4a4a]', text: 'text-[#f0dccc]', num: 'text-[#d4a884]' }; // 빨간색
    return { bg: 'bg-[#3b2a20]', border: 'border-[#5c432d]', text: 'text-[#e8dcc8]', num: 'text-[#b89c7c]' };
  };

  if (isLoading) return <div className="min-h-screen bg-[#dccba6] p-6 text-center font-serif font-bold text-[#3e2723]">데이터를 불러오는 중입니다...</div>;

  return (
    <div className="min-h-screen bg-[#dccba6] p-2 md:p-6 font-serif">
      <div className="max-w-md mx-auto bg-[#d0bc9b] border-8 border-double border-[#4a3424] shadow-2xl relative pb-20">
        
        <div className="bg-gradient-to-b from-[#2a1d15] to-[#1a120c] py-4 my-6 border-y-2 border-[#5a4635] shadow-[0_4px_6px_rgba(0,0,0,0.5)]">
          <h1 className="text-center text-[#d4b886] text-2xl tracking-widest font-extrabold relative" style={{ textShadow: '2px 2px 2px rgba(0,0,0,0.8)' }}>
            <span className="absolute left-4 opacity-50">✦</span>
            오사카 순살 감자탕
            <span className="absolute right-4 opacity-50">✦</span>
          </h1>
        </div>

        <div className="flex justify-between items-center px-6 py-3 border-b-2 border-t border-[#b89e7c] border-t-transparent mx-4">
          <span className="text-xl text-[#3e2723] font-extrabold tracking-widest">레벨</span>
          <div className="flex items-center gap-6">
            <span className="text-4xl text-[#3e2723]" style={{ fontFamily: 'Times New Roman, serif' }}>{level}</span>
            <div className="flex gap-2">
              <button onClick={decreaseLevel} disabled={level === 1} className="w-8 h-8 rounded-full bg-gradient-to-b from-[#4e3626] to-[#251811] text-[#d4b886] font-bold text-xl border border-[#140d09] shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] flex items-center justify-center">-</button>
              <button onClick={increaseLevel} disabled={level === 5} className="w-8 h-8 rounded-full bg-gradient-to-b from-[#4e3626] to-[#251811] text-[#d4b886] font-bold text-xl border border-[#140d09] shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] flex items-center justify-center">+</button>
            </div>
          </div>
        </div>

        <div className="px-6 py-4">
          <div className="flex justify-between items-center border-b-2 border-[#b89e7c] pb-2 mb-4">
            <h3 className="text-lg text-[#3e2723] font-extrabold tracking-wide">보유 중 시나리오</h3>
            <button onClick={() => { setNewScenario({ id: null, name: '', number: '', hasExp: false, length: '짧음', isArena: false }); setIsScenarioModalOpen(true); }} className="w-7 h-7 rounded-full bg-gradient-to-b from-[#4e3626] to-[#251811] text-[#d4b886] font-bold border border-[#140d09] shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] flex items-center justify-center">+</button>
          </div>
          
          <div className="space-y-3">
            {scenarios.map((scenario: any) => {
              const theme = getCardTheme(scenario.length);
              return (
                <div key={scenario.id} className={`${theme.bg} border-2 ${theme.border} rounded-md p-3 shadow-md relative group`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className={`${theme.text} text-lg font-extrabold tracking-wide flex items-center gap-1`}>
                      {scenario.hasExp && <span className="text-yellow-400 drop-shadow-md text-[17px]" title="경험치 획득 가능">⭐</span>}
                      {scenario.name}
                    </span>
                    <span className={`${theme.num} text-xl font-bold font-serif`}>{scenario.number}</span>
                  </div>
                  
                  <div className="flex gap-2 text-[11px] font-bold uppercase tracking-wider mt-1.5">
                    <span className="bg-black bg-opacity-30 text-white px-2 py-0.5 rounded-sm shadow-sm">{scenario.length}</span>
                    {scenario.isArena && <span className="bg-[#4a1c18] text-[#e8dcc8] px-2 py-0.5 rounded-sm shadow-sm border border-[#8a4a4a]">투기장</span>}
                  </div>
                  
                  <div className="absolute top-2 right-10 hidden group-hover:flex gap-1">
                    <button onClick={(e) => openEditScenario(e, scenario)} className="bg-[#d4b886] text-[#3e2723] px-2 py-1 rounded text-xs font-bold border border-[#a68c63]">수정</button>
                    <button onClick={() => setScenarioToDelete(scenario)} className="bg-red-900 text-white px-2 py-1 rounded text-xs font-bold border border-red-700">삭제</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-6 py-2">
          <div className="flex justify-between items-center border-b-2 border-[#b89e7c] pb-2 mb-4">
            <h3 className="text-lg text-[#3e2723] font-extrabold tracking-wide">보유 중 키워드</h3>
            <button onClick={() => { setEditingKeyword({ id: null, text: '' }); setIsKeywordModalOpen(true); }} className="w-7 h-7 rounded-full bg-gradient-to-b from-[#4e3626] to-[#251811] text-[#d4b886] font-bold border border-[#140d09] shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] flex items-center justify-center">+</button>
          </div>
          
          <div className="space-y-1.5">
            {sortedKeywords.map((kw: any) => (
              <div 
                key={kw.id} 
                onClick={() => toggleKeywordActive(kw.id)} 
                className={`flex justify-between items-center p-2 rounded-sm shadow-sm border border-[#a68d6c] font-bold text-[15px] cursor-pointer transition-colors tracking-wide
                  ${kw.active ? 'bg-[#c7aa81] text-[#3e2723]' : 'bg-[#a39481] text-[#5e4b3c] line-through opacity-70'}
                `}
              >
                <span>{kw.text}</span>
                <div className="flex gap-1">
                  <button onClick={(e) => openEditKeyword(e, kw)} className="text-[10px] bg-[#4e3626] text-[#d4b886] px-2 py-1 rounded-sm border border-[#251811] no-underline hover:bg-[#3e2723]">수정</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isScenarioModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100] p-4 font-serif">
          <div className="bg-[#d0bc9b] p-6 rounded-xl w-full max-w-sm border-4 border-[#4a3424] shadow-2xl">
            <h2 className="text-xl text-[#3e2723] font-extrabold mb-4 border-b border-[#a68d6c] pb-2">{newScenario.id ? '시나리오 수정' : '새 시나리오'}</h2>
            <div className="space-y-4">
              <input type="text" className="w-full p-2 bg-[#e0d0b6] border border-[#a68d6c] rounded font-bold text-[#3e2723]" value={newScenario.name} onChange={(e: any) => setNewScenario({...newScenario, name: e.target.value})} />
              <input type="text" className="w-full p-2 bg-[#e0d0b6] border border-[#a68d6c] rounded font-bold text-[#3e2723]" value={newScenario.number} onChange={(e: any) => setNewScenario({...newScenario, number: e.target.value})} />
              
              <select className="w-full p-2 bg-[#e0d0b6] border border-[#a68d6c] rounded font-bold text-[#3e2723]" value={newScenario.length} onChange={(e: any) => setNewScenario({...newScenario, length: e.target.value})}>
                <option value="짧음">짧음 (녹색)</option><option value="중간">중간 (파란색)</option><option value="긺">긺 (빨간색)</option>
              </select>
              
              <div className="flex gap-4">
                <label className="flex items-center gap-2 font-bold text-[#3e2723]"><input type="checkbox" checked={newScenario.hasExp} onChange={(e: any) => setNewScenario({...newScenario, hasExp: e.target.checked})} className="accent-[#4a3424] w-4 h-4" /> ⭐ 경험치</label>
                <label className="flex items-center gap-2 font-bold text-[#3e2723]"><input type="checkbox" checked={newScenario.isArena} onChange={(e: any) => setNewScenario({...newScenario, isArena: e.target.checked})} className="accent-[#4a3424] w-4 h-4" /> ⚔️ 투기장</label>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setIsScenarioModalOpen(false)} className="flex-1 bg-transparent border-2 border-[#4a3424] text-[#4a3424] py-2 rounded font-bold">취소</button>
              <button onClick={handleSaveScenario} className="flex-1 bg-gradient-to-b from-[#4e3626] to-[#251811] text-[#d4b886] border border-[#140d09] py-2 rounded font-bold">저장</button>
            </div>
          </div>
        </div>
      )}

      {isKeywordModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100] p-4 font-serif">
          <div className="bg-[#d0bc9b] p-6 rounded-xl w-full max-w-xs border-4 border-[#4a3424] shadow-2xl">
            <h2 className="text-xl text-[#3e2723] font-extrabold mb-4 border-b border-[#a68d6c] pb-2">{editingKeyword.id ? '키워드 수정' : '새 키워드'}</h2>
            <input type="text" className="w-full p-2 bg-[#e0d0b6] border border-[#a68d6c] rounded font-bold mb-4 text-[#3e2723]" value={editingKeyword.text} onChange={(e: any) => setEditingKeyword({...editingKeyword, text: e.target.value})} />
            <div className="flex gap-2">
              <button onClick={() => setIsKeywordModalOpen(false)} className="flex-1 bg-transparent border-2 border-[#4a3424] text-[#4a3424] py-2 rounded font-bold">취소</button>
              <button onClick={handleSaveKeyword} className="flex-1 bg-gradient-to-b from-[#4e3626] to-[#251811] text-[#d4b886] border border-[#140d09] py-2 rounded font-bold">저장</button>
            </div>
          </div>
        </div>
      )}

      {scenarioToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100] p-4 font-serif">
          <div className="bg-[#d0bc9b] p-6 rounded-xl w-full max-w-xs text-center border-4 border-[#4a3424] shadow-2xl">
            <h2 className="text-lg font-bold mb-5 text-[#3e2723]">정말 삭제하시겠습니까?</h2>
            <div className="flex gap-2">
              <button onClick={handleDeleteScenario} className="flex-1 bg-[#4a1c18] text-white py-2 rounded font-bold border border-[#2b0f0d]">예 (삭제)</button>
              <button onClick={() => setScenarioToDelete(null)} className="flex-1 bg-transparent border-2 border-[#4a3424] text-[#4a3424] py-2 rounded font-bold">아니오</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}