/* eslint-disable @next/next/no-img-element */
'use client';
import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient'; 
import IconText from './components/IconText'; 

export default function PartyPage() {
  const [level, setLevel] = useState<number>(1);
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [keywords, setKeywords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 모달 상태 관리
  const [isScenarioModalOpen, setIsScenarioModalOpen] = useState<boolean>(false);
  const [newScenario, setNewScenario] = useState<any>({ id: null, name: '', number: '', hasExp: false, length: '짧음', isArena: false, active: true });
  const [scenarioToDelete, setScenarioToDelete] = useState<any>(null); // 영구 삭제용

  const [isKeywordModalOpen, setIsKeywordModalOpen] = useState<boolean>(false);
  const [editingKeyword, setEditingKeyword] = useState<any>({ id: null, text: '' });

  // 아카이브 처리를 위한 공통 확인 모달 상태
  const [confirmTarget, setConfirmTarget] = useState<{ type: string, item: any } | null>(null);

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
    let updatedScenarios = newScenario.id 
      ? scenarios.map((s: any) => s.id === newScenario.id ? newScenario : s) 
      : [...scenarios, { ...newScenario, id: Date.now(), active: true }];
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
    let updatedKeywords = editingKeyword.id 
      ? keywords.map((kw: any) => kw.id === editingKeyword.id ? { ...kw, text: editingKeyword.text } : kw) 
      : [...keywords, { id: Date.now(), text: editingKeyword.text, active: true }];
    setKeywords(updatedKeywords);
    saveToSupabase(level, scenarios, updatedKeywords);
    setIsKeywordModalOpen(false);
  };

  const openEditKeyword = (e: any, kw: any) => { e.stopPropagation(); setEditingKeyword({ id: kw.id, text: kw.text }); setIsKeywordModalOpen(true); };

  const handleConfirmAction = () => {
    if (!confirmTarget) return;
    const { type, item } = confirmTarget;

    if (type === 'complete_scenario' || type === 'restore_scenario') {
      const updated = scenarios.map((s: any) => s.id === item.id ? { ...s, active: type === 'restore_scenario' } : s);
      setScenarios(updated);
      saveToSupabase(level, updated, keywords);
    } else if (type === 'delete_keyword' || type === 'restore_keyword') {
      const updated = keywords.map((kw: any) => kw.id === item.id ? { ...kw, active: type === 'restore_keyword' } : kw);
      setKeywords(updated);
      saveToSupabase(level, scenarios, updated);
    }
    setConfirmTarget(null);
  };

  // 기존 로직 유지하되, CSS 그라데이션 질감으로 테마 업그레이드
  const getCardTheme = (length: any) => {
    if (length === '짧음') return { bg: 'bg-gradient-to-r from-[#2a362c] to-[#1e261f]', border: 'border-[#3a4a3c]', text: 'text-[#d8e3d8]', num: 'text-[#9cb59c]' };
    if (length === '중간') return { bg: 'bg-gradient-to-r from-[#1c2a35] to-[#121c24]', border: 'border-[#3a4a5c]', text: 'text-[#d6dbe0]', num: 'text-[#a4b4bc]' };
    if (length === '긺') return { bg: 'bg-gradient-to-r from-[#4a2424] to-[#301616]', border: 'border-[#5c3a3a]', text: 'text-[#f0dccc]', num: 'text-[#d4a884]' };
    return { bg: 'bg-gradient-to-r from-[#3b2a20] to-[#241a14]', border: 'border-[#5c432d]', text: 'text-[#e8dcc8]', num: 'text-[#b89c7c]' };
  };

  if (isLoading) return <div className="min-h-screen bg-gradient-to-br from-[#f3e5ab] via-[#dccba6] to-[#b8a07c] p-6 text-center font-serif font-bold text-[#3e2723] flex items-center justify-center">데이터를 불러오는 중입니다...</div>;

  const activeScenarios = scenarios.filter((s: any) => s.active !== false);
  const archivedScenarios = scenarios.filter((s: any) => s.active === false);
  const activeKeywords = keywords.filter((k: any) => k.active !== false);
  const archivedKeywords = keywords.filter((k: any) => k.active === false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f3e5ab] via-[#dccba6] to-[#b8a07c] p-2 md:p-6 font-serif flex flex-col items-center">
      <div className="max-w-md w-full mx-auto relative pb-20">
        
        {/* 타이틀 명판 */}
        <div 
          className="relative w-full h-[70px] flex items-center justify-center mb-8 mt-4 shadow-2xl overflow-hidden border-[1px] border-[#2a1a18]/20"
          style={{ 
            clipPath: 'polygon(10% 0%, 90% 0%, 100% 50%, 90% 100%, 10% 100%, 0% 50%)',
            background: 'linear-gradient(135deg, #3e352c 0%, #1e1915 100%)',
            boxShadow: 'inset 0 0 25px rgba(0,0,0,0.9), inset 0 3px 5px rgba(255,255,255,0.05)',
          }}
        >
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#d4b886_0.8px,transparent_0.8px)] [background-size:10px_10px] pointer-events-none"></div>
          <h1 className="relative z-10 text-[#d4b886] text-2xl tracking-[0.2em] font-extrabold" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.9)' }}>
            <span className="absolute -left-5 opacity-50 text-sm top-1">✦</span>
            오사카 순살 감자탕
            <span className="absolute -right-5 opacity-50 text-sm top-1">✦</span>
          </h1>
        </div>

        {/* 레벨 영역 */}
        <div className="flex justify-between items-center bg-gradient-to-br from-[#3e352c] to-[#2a241d] border-[2px] border-[#5c4a3d] p-4 mb-8 relative shadow-[0_10px_15px_-3px_rgba(0,0,0,0.5)] mx-2">
          <div className="absolute inset-0 shadow-[inset_0_0_15px_rgba(0,0,0,0.8)] pointer-events-none"></div>
          <span className="relative z-10 text-xl text-[#dccba6] font-extrabold tracking-widest">파티 레벨</span>
          <div className="flex items-center gap-6 relative z-10">
            <span className="text-4xl text-[#d4b886]" style={{ fontFamily: 'Times New Roman, serif', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>{level}</span>
            <div className="flex gap-2">
              <button onClick={decreaseLevel} disabled={level === 1} className="w-9 h-9 rounded-full bg-gradient-to-b from-[#6b5847] to-[#3a2e24] text-[#d4b886] font-bold text-xl border-[1px] border-[#1a140f] shadow-[0_2px_4px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.2)] flex items-center justify-center active:scale-95 disabled:opacity-50">-</button>
              <button onClick={increaseLevel} disabled={level === 5} className="w-9 h-9 rounded-full bg-gradient-to-b from-[#6b5847] to-[#3a2e24] text-[#d4b886] font-bold text-xl border-[1px] border-[#1a140f] shadow-[0_2px_4px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.2)] flex items-center justify-center active:scale-95 disabled:opacity-50">+</button>
            </div>
          </div>
        </div>

        {/* 1. 보유 중 시나리오 */}
        <div className="px-2 py-4">
          <div className="flex justify-between items-center border-b-[2px] border-[#8b6b47]/40 pb-2 mb-4">
            <h3 className="text-lg text-[#3e2723] font-extrabold tracking-wide drop-shadow-sm">보유 중 시나리오</h3>
            <button onClick={() => { setNewScenario({ id: null, name: '', number: '', hasExp: false, length: '짧음', isArena: false, active: true }); setIsScenarioModalOpen(true); }} className="w-8 h-8 rounded-full bg-gradient-to-b from-[#5c3a35] to-[#3a2421] text-[#d4b886] font-bold border border-[#1a140f] shadow-[0_2px_4px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.2)] flex items-center justify-center active:scale-95">+</button>
          </div>
          
          <div className="space-y-4">
            {activeScenarios.length === 0 && <div className="text-center text-[#8a765f] font-bold py-2 text-sm">진행 중인 시나리오가 없습니다.</div>}
            {activeScenarios.map((scenario: any) => {
              const theme = getCardTheme(scenario.length);
              return (
                <div key={scenario.id} onClick={() => setConfirmTarget({ type: 'complete_scenario', item: scenario })} className={`${theme.bg} border ${theme.border} rounded-sm p-3 shadow-[0_4px_8px_rgba(0,0,0,0.4)] relative group cursor-pointer hover:brightness-110 transition-all`}>
                  <div className="absolute inset-0 shadow-[inset_0_1px_2px_rgba(255,255,255,0.05),inset_0_-1px_2px_rgba(0,0,0,0.5)] pointer-events-none rounded-sm"></div>
                  <div className="flex justify-between items-center mb-1 relative z-10">
                    <span className={`${theme.text} text-lg font-extrabold tracking-wide flex items-center gap-1`}>
                      {scenario.hasExp && <span className="text-yellow-400 drop-shadow-md text-[17px]" title="경험치 획득 가능">⭐</span>}
                      <IconText text={scenario.name} />
                    </span>
                    <div className="relative flex items-center justify-center w-11 h-11 shrink-0">
                      <img src="/ui/scenario.png" alt="scenario bg" className="absolute inset-0 w-full h-full object-contain drop-shadow-lg" />
                      <span className="relative z-10 text-white text-[22px] font-extrabold font-serif pb-1" style={{ textShadow: '0px 1px 4px rgba(0,0,0,0.9), 0px 0px 2px rgba(0,0,0,0.8)' }}>
                        {scenario.number}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 text-[11px] font-bold uppercase tracking-wider mt-1.5 relative z-10">
                    <span className="bg-black/40 text-white px-2 py-0.5 rounded-sm shadow-inner border border-black/50">{scenario.length}</span>
                    {scenario.isArena && <span className="bg-gradient-to-b from-[#5c2a2a] to-[#3a1a1a] text-[#e8dcc8] px-2 py-0.5 rounded-sm shadow-inner border border-[#1a0a0a]">투기장</span>}
                  </div>
                  <div className="absolute top-2 right-14 hidden group-hover:flex gap-1 z-20">
                    <button onClick={(e) => openEditScenario(e, scenario)} className="bg-gradient-to-b from-[#dccba6] to-[#b8a07c] text-[#3e2723] px-3 py-1.5 rounded-sm text-xs font-bold border border-[#8b6b47] shadow-md active:scale-95">수정</button>
                    <button onClick={(e) => { e.stopPropagation(); setScenarioToDelete(scenario); }} className="bg-gradient-to-b from-[#7a2a2a] to-[#4a1a1a] text-[#e8dcc8] px-3 py-1.5 rounded-sm text-xs font-bold border border-[#1a0a0a] shadow-md active:scale-95">삭제</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. 보유 중 키워드 */}
        <div className="px-2 py-2 mt-4">
          <div className="flex justify-between items-center border-b-[2px] border-[#8b6b47]/40 pb-2 mb-4">
            <h3 className="text-lg text-[#3e2723] font-extrabold tracking-wide drop-shadow-sm">보유 중 키워드</h3>
            <button onClick={() => { setEditingKeyword({ id: null, text: '' }); setIsKeywordModalOpen(true); }} className="w-8 h-8 rounded-full bg-gradient-to-b from-[#5c3a35] to-[#3a2421] text-[#d4b886] font-bold border border-[#1a140f] shadow-[0_2px_4px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.2)] flex items-center justify-center active:scale-95">+</button>
          </div>
          
          <div className="space-y-2">
            {activeKeywords.length === 0 && <div className="text-center text-[#8a765f] font-bold py-2 text-sm">진행 중인 키워드가 없습니다.</div>}
            {activeKeywords.map((kw: any) => (
              <div key={kw.id} onClick={() => setConfirmTarget({ type: 'delete_keyword', item: kw })} className="group relative flex justify-between items-center p-3 rounded-sm shadow-[0_2px_4px_rgba(0,0,0,0.3)] border border-[#1a140f] font-bold text-[15px] cursor-pointer bg-gradient-to-r from-[#8b7355] to-[#6b563d] text-[#f3e5ab] hover:brightness-110 transition-all">
                <div className="absolute inset-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-1px_1px_rgba(0,0,0,0.4)] pointer-events-none rounded-sm"></div>
                <span className="relative z-10"><IconText text={kw.text} /></span>
                <button onClick={(e) => openEditKeyword(e, kw)} className="relative z-10 text-[10px] hidden group-hover:block bg-gradient-to-b from-[#4e3626] to-[#251811] text-[#d4b886] px-3 py-1.5 rounded-sm border border-[#1a140f] shadow-md active:scale-95">수정</button>
              </div>
            ))}
          </div>
        </div>

        {/* 3. 아카이브 (완료 및 삭제됨) */}
        <div className="px-2 py-6 mt-8 border-t-[2px] border-dashed border-[#8b6b47]/50">
          <h3 className="text-lg text-[#5e4b3c] font-extrabold tracking-wide mb-4 flex items-center gap-2">
            <span className="opacity-60">🗃️</span> 아카이브 (완료 / 삭제)
          </h3>
          
          <div className="space-y-3 mb-6 opacity-70 grayscale-[30%]">
            {archivedScenarios.map((scenario: any) => {
              const theme = getCardTheme(scenario.length);
              return (
                <div key={scenario.id} onClick={() => setConfirmTarget({ type: 'restore_scenario', item: scenario })} className={`${theme.bg} border ${theme.border} rounded-sm p-3 relative cursor-pointer hover:opacity-100 transition-opacity`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className={`${theme.text} text-lg font-extrabold tracking-wide line-through flex items-center gap-1 opacity-70`}><IconText text={scenario.name} /></span>
                    <div className="relative flex items-center justify-center w-11 h-11 shrink-0 opacity-70">
                      <img src="/ui/scenario.png" alt="scenario bg" className="absolute inset-0 w-full h-full object-contain" />
                      <span className="relative z-10 text-white text-[22px] font-extrabold font-serif pb-1">{scenario.number}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-2 opacity-70 grayscale-[30%]">
            {archivedKeywords.map((kw: any) => (
              <div key={kw.id} onClick={() => setConfirmTarget({ type: 'restore_keyword', item: kw })} className="flex justify-between items-center p-3 rounded-sm border border-[#2a1a18]/40 font-bold text-[15px] cursor-pointer hover:opacity-100 transition-opacity tracking-wide bg-[#8b7355]/40 text-[#3e2723] line-through">
                <span><IconText text={kw.text} /></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 액션 확인 모달 */}
      {confirmTarget && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 font-serif">
          <div className="bg-gradient-to-br from-[#e6d5a7] to-[#cba371] p-1 shadow-[0_10px_30px_rgba(0,0,0,0.8)] rounded-sm w-full max-w-xs relative">
            <div className="absolute inset-0 border-[2px] border-[#5c3a35]/40 m-1 pointer-events-none"></div>
            <div className="bg-gradient-to-br from-[#f3e5ab] via-[#dccba6] to-[#b8a07c] p-6 text-center border-[1px] border-[#8b6b47]">
              <h2 className="text-lg font-extrabold mb-6 text-[#3e2723] whitespace-pre-wrap leading-relaxed border-b border-[#8b6b47]/30 pb-4">
                {confirmTarget.type === 'complete_scenario' && '해당 시나리오를\n완료 처리하시겠습니까?'}
                {confirmTarget.type === 'delete_keyword' && '해당 키워드를\n아카이브로 이동합니다.'}
                {(confirmTarget.type === 'restore_scenario' || confirmTarget.type === 'restore_keyword') && '이 항목을 다시\n복구하시겠습니까?'}
              </h2>
              <div className="flex gap-3">
                <button onClick={handleConfirmAction} className="flex-1 bg-gradient-to-b from-[#5c3a35] to-[#3a2421] text-[#d4b886] py-2 rounded-sm font-bold border border-[#1a140f] shadow-md active:scale-95">예</button>
                <button onClick={() => setConfirmTarget(null)} className="flex-1 bg-transparent border-2 border-[#8b6b47] text-[#5e4b3c] py-2 rounded-sm font-bold hover:bg-[#8b6b47]/10 transition-colors">아니오</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 영구 삭제 모달 */}
      {scenarioToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 font-serif">
          <div className="bg-gradient-to-br from-[#e6d5a7] to-[#cba371] p-1 shadow-[0_10px_30px_rgba(0,0,0,0.8)] rounded-sm w-full max-w-xs relative">
            <div className="absolute inset-0 border-[2px] border-[#5c3a35]/40 m-1 pointer-events-none"></div>
            <div className="bg-gradient-to-br from-[#f3e5ab] via-[#dccba6] to-[#b8a07c] p-6 text-center border-[1px] border-[#8b6b47]">
              <h2 className="text-lg font-extrabold mb-6 text-red-900 border-b border-[#8b6b47]/30 pb-4">완전히 영구 삭제하시겠습니까?</h2>
              <div className="flex gap-3">
                <button onClick={handleDeleteScenario} className="flex-1 bg-gradient-to-b from-[#7a2a2a] to-[#4a1a1a] text-[#e8dcc8] py-2 rounded-sm font-bold border border-[#1a0a0a] shadow-md active:scale-95">예 (삭제)</button>
                <button onClick={() => setScenarioToDelete(null)} className="flex-1 bg-transparent border-2 border-[#8b6b47] text-[#5e4b3c] py-2 rounded-sm font-bold hover:bg-[#8b6b47]/10 transition-colors">아니오</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 시나리오 생성/수정 모달 */}
      {isScenarioModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 font-serif">
          <div className="bg-gradient-to-br from-[#e6d5a7] to-[#cba371] p-1 shadow-[0_10px_30px_rgba(0,0,0,0.8)] rounded-sm w-full max-w-sm relative">
            <div className="absolute inset-0 border-[2px] border-[#5c3a35]/40 m-1 pointer-events-none"></div>
            <div className="bg-gradient-to-br from-[#f3e5ab] via-[#dccba6] to-[#b8a07c] p-6 border-[1px] border-[#8b6b47]">
              <h2 className="text-xl text-[#3e2723] font-extrabold mb-5 border-b border-[#8b6b47]/40 pb-3 text-center">{newScenario.id ? '시나리오 수정' : '새 시나리오'}</h2>
              <div className="space-y-4">
                <input type="text" placeholder="시나리오 이름" className="w-full p-3 bg-[#e8dcc8] border border-[#a68d6c] rounded-sm font-bold text-[#3e2723] shadow-inner focus:outline-none focus:border-[#5c3a35]" value={newScenario.name} onChange={(e: any) => setNewScenario({...newScenario, name: e.target.value})} />
                <input type="text" placeholder="번호 (예: 12)" className="w-full p-3 bg-[#e8dcc8] border border-[#a68d6c] rounded-sm font-bold text-[#3e2723] shadow-inner focus:outline-none focus:border-[#5c3a35]" value={newScenario.number} onChange={(e: any) => setNewScenario({...newScenario, number: e.target.value})} />
                <select className="w-full p-3 bg-[#e8dcc8] border border-[#a68d6c] rounded-sm font-bold text-[#3e2723] shadow-inner focus:outline-none focus:border-[#5c3a35]" value={newScenario.length} onChange={(e: any) => setNewScenario({...newScenario, length: e.target.value})}>
                  <option value="짧음">짧음 (녹색)</option><option value="중간">중간 (파란색)</option><option value="긺">긺 (빨간색)</option>
                </select>
                <div className="flex gap-6 pt-2 justify-center">
                  <label className="flex items-center gap-2 font-bold text-[#3e2723] cursor-pointer"><input type="checkbox" checked={newScenario.hasExp} onChange={(e: any) => setNewScenario({...newScenario, hasExp: e.target.checked})} className="accent-[#5c3a35] w-5 h-5 cursor-pointer" /> ⭐ 경험치</label>
                  <label className="flex items-center gap-2 font-bold text-[#3e2723] cursor-pointer"><input type="checkbox" checked={newScenario.isArena} onChange={(e: any) => setNewScenario({...newScenario, isArena: e.target.checked})} className="accent-[#5c3a35] w-5 h-5 cursor-pointer" /> ⚔️ 투기장</label>
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button onClick={() => setIsScenarioModalOpen(false)} className="flex-1 bg-transparent border-2 border-[#8b6b47] text-[#5e4b3c] py-3 rounded-sm font-bold hover:bg-[#8b6b47]/10 transition-colors">취소</button>
                <button onClick={handleSaveScenario} className="flex-1 bg-gradient-to-b from-[#5c3a35] to-[#3a2421] text-[#d4b886] border border-[#1a140f] py-3 rounded-sm font-bold shadow-md active:scale-95">저장</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 키워드 생성/수정 모달 */}
      {isKeywordModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 font-serif">
          <div className="bg-gradient-to-br from-[#e6d5a7] to-[#cba371] p-1 shadow-[0_10px_30px_rgba(0,0,0,0.8)] rounded-sm w-full max-w-xs relative">
            <div className="absolute inset-0 border-[2px] border-[#5c3a35]/40 m-1 pointer-events-none"></div>
            <div className="bg-gradient-to-br from-[#f3e5ab] via-[#dccba6] to-[#b8a07c] p-6 border-[1px] border-[#8b6b47]">
              <h2 className="text-xl text-[#3e2723] font-extrabold mb-5 border-b border-[#8b6b47]/40 pb-3 text-center">{editingKeyword.id ? '키워드 수정' : '새 키워드'}</h2>
              <input type="text" placeholder="키워드 입력" className="w-full p-3 bg-[#e8dcc8] border border-[#a68d6c] rounded-sm font-bold mb-6 text-[#3e2723] shadow-inner focus:outline-none focus:border-[#5c3a35]" value={editingKeyword.text} onChange={(e: any) => setEditingKeyword({...editingKeyword, text: e.target.value})} />
              <div className="flex gap-3">
                <button onClick={() => setIsKeywordModalOpen(false)} className="flex-1 bg-transparent border-2 border-[#8b6b47] text-[#5e4b3c] py-3 rounded-sm font-bold hover:bg-[#8b6b47]/10 transition-colors">취소</button>
                <button onClick={handleSaveKeyword} className="flex-1 bg-gradient-to-b from-[#5c3a35] to-[#3a2421] text-[#d4b886] border border-[#1a140f] py-3 rounded-sm font-bold shadow-md active:scale-95">저장</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}