'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import IconText from '../components/IconText';

export default function SchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules, setSchedules] = useState({});
  const [availableScenarios, setAvailableScenarios] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // 로컬 타임존 기준 '오늘' 날짜 문자열 (YYYY-MM-DD)
  const [todayStr, setTodayStr] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [formData, setFormData] = useState({ id: null, type: 'played', title: '', description: '', scenario_ids: [] });

  useEffect(() => {
    const now = new Date();
    const localToday = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    setTodayStr(localToday);

    async function fetchData() {
      try {
        const [ { data: scheduleData }, { data: partyData } ] = await Promise.all([
          supabase.from('party_schedule').select('*'),
          supabase.from('party_info').select('scenarios').limit(1).maybeSingle()
        ]);

        if (scheduleData) {
          const formatted = {};
          scheduleData.forEach(item => { formatted[item.date_str] = item; });
          setSchedules(formatted);
        }

        if (partyData && partyData.scenarios) {
          // 아카이브(삭제)되지 않은 시나리오만 필터링
          setAvailableScenarios(partyData.scenarios.filter(s => s.active !== false));
        }
      } catch (err) { console.error(err); } 
      finally { setIsLoading(false); }
    }
    fetchData();
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const allCells = [...Array.from({ length: firstDayOfMonth }, () => null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const handleEventClick = (dateStr) => {
    if (!dateStr) return;
    setSelectedDate(dateStr);
    
    const isPastOrToday = dateStr <= todayStr;
    const autoType = isPastOrToday ? 'played' : 'next';

    if (schedules[dateStr]) {
      setFormData({
        ...schedules[dateStr],
        type: schedules[dateStr].type || autoType,
        scenario_ids: schedules[dateStr].scenario_ids || []
      });
    } else {
      setFormData({ id: null, type: autoType, title: '', description: '', scenario_ids: [] });
    }
    setIsModalOpen(true);
  };

  const handleDayClick = (day) => {
    if (!day) return;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    handleEventClick(dateStr);
  };

  const toggleScenario = (id) => {
    setFormData(prev => {
      const ids = prev.scenario_ids || [];
      if (ids.includes(id)) return { ...prev, scenario_ids: ids.filter(x => x !== id) };
      return { ...prev, scenario_ids: [...ids, id] };
    });
  };

  const handleSave = async () => {
    let finalTitle = formData.title;

    if (formData.type === 'played') {
      const selected = (formData.scenario_ids || []).map(id => availableScenarios.find(s => s.id === id)).filter(Boolean);
      if (selected.length > 0) {
        finalTitle = selected.map(s => `시나리오 ${s.number}`).join(', ') + ' 진행';
      } else {
        finalTitle = '시나리오 진행';
      }
    } else if (!formData.title.trim()) {
      return alert('일정 제목을 입력해주세요.');
    }

    const payload = {
      id: formData.id || Date.now(),
      date_str: selectedDate,
      type: formData.type,
      title: finalTitle,
      description: formData.description,
      scenario_ids: formData.scenario_ids || []
    };

    const { error } = await supabase.from('party_schedule').upsert(payload);
    if (error) return alert('저장 실패: ' + error.message);

    setSchedules(prev => ({ ...prev, [selectedDate]: payload }));
    setIsModalOpen(false);
  };

  const handleDelete = async () => {
    if (!formData.id) return;
    const { error } = await supabase.from('party_schedule').delete().eq('id', formData.id);
    if (error) return alert('삭제 실패: ' + error.message);

    const newSchedules = { ...schedules };
    delete newSchedules[selectedDate];
    setSchedules(newSchedules);
    setIsModalOpen(false);
  };

  const currentMonthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const currentMonthEvents = Object.keys(schedules)
    .filter(date => date.startsWith(currentMonthPrefix))
    .sort()
    .map(date => ({ date, ...schedules[date] }));

  const usedScenarioIds = Object.entries(schedules)
    .filter(([date, sched]) => date !== selectedDate && sched.type === 'played')
    .flatMap(([_, sched]) => sched.scenario_ids || []);

  const selectableScenarios = availableScenarios.filter(
    sc => !usedScenarioIds.includes(sc.id) || (formData.scenario_ids || []).includes(sc.id)
  );

  // 다가오는 다음 일정 계산 로직
  const nextScheduleDate = Object.keys(schedules)
    .filter(date => date >= todayStr && schedules[date].type === 'next')
    .sort()[0];
  const nextSchedule = nextScheduleDate ? schedules[nextScheduleDate] : null;

  if (isLoading) return <div className="min-h-screen p-6 text-center font-serif font-bold text-[#3e2723]">일정을 불러오는 중입니다...</div>;

  return (
    <div className="p-4 md:p-6 pb-24 font-serif">
      <div className="text-center font-extrabold text-2xl mb-4 border-b-4 border-[#5d4037] pb-2 text-[#3e2723] tracking-wider mt-4">
        오사카 순살 감자탕 일정
      </div>

      {/* 다가오는 일정 빠른 확인 배너 */}
      <div 
        className="mb-6 bg-gradient-to-r from-[#5d4037] to-[#3e2723] rounded-lg p-3 shadow-md border border-[#2a1a18] flex items-center justify-between cursor-pointer hover:brightness-110 active:scale-95 transition-all"
        onClick={() => nextScheduleDate ? handleEventClick(nextScheduleDate) : null}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl drop-shadow-md">📆</span>
          <div className="text-left">
            <div className="text-[10px] text-[#dccba6] font-bold mb-0.5">다음 모임 예정일</div>
            {nextSchedule ? (
              <div className="text-sm font-extrabold text-[#e9e0d2]">
                {nextScheduleDate.split('-')[0]}년 {nextScheduleDate.split('-')[1]}월 {nextScheduleDate.split('-')[2]}일
              </div>
            ) : (
              <div className="text-sm font-bold text-[#e9e0d2] opacity-70">예정된 일정이 없습니다</div>
            )}
          </div>
        </div>
        {nextSchedule && (
          <div className="bg-[#8a2e2e] text-white text-[11px] px-2.5 py-1 rounded-sm font-bold border border-[#5c1a1a] shadow-inner max-w-[130px] truncate">
            {nextSchedule.title}
          </div>
        )}
      </div>

      <div className="bg-[#c5b399] p-4 rounded-lg border-2 border-[#a38c6d] shadow-md">
        <div className="flex justify-between items-center mb-4 border-b-2 border-[#a38c6d] pb-2">
          <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center bg-[#5d4037] text-[#e9e0d2] rounded font-bold shadow hover:bg-[#3e2723] active:scale-95">◀</button>
          <h2 className="text-xl font-extrabold text-[#3e2723] tracking-widest">{year}년 {month + 1}월</h2>
          <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center bg-[#5d4037] text-[#e9e0d2] rounded font-bold shadow hover:bg-[#3e2723] active:scale-95">▶</button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2 text-center text-sm font-extrabold text-[#5d4037]">
          <div className="text-red-800">일</div><div>월</div><div>화</div><div>수</div><div>목</div><div>금</div><div className="text-blue-800">토</div>
        </div>

        <div className="grid grid-cols-7 gap-1 md:gap-2 text-center">
          {allCells.map((day, idx) => {
            if (!day) return <div key={idx} className="h-14 md:h-20 bg-transparent"></div>;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const schedule = schedules[dateStr];
            const isToday = todayStr === dateStr;

            return (
              <div 
                key={idx} onClick={() => handleDayClick(day)}
                className={`h-14 md:h-20 flex flex-col justify-start items-center p-1 rounded cursor-pointer transition-all border ${
                  schedule?.type === 'next' ? 'bg-[#e8dcc8] border-[#8a2e2e] shadow-[0_0_5px_rgba(138,46,46,0.4)]' : 
                  schedule?.type === 'played' ? 'bg-[#5d4037] border-[#3e2723] shadow-inner' : 
                  isToday ? 'bg-[#e9e0d2] border-[#a38c6d] ring-2 ring-[#a38c6d]' : 
                  'bg-[#e9e0d2] bg-opacity-50 border-transparent hover:bg-opacity-100 hover:border-[#a38c6d]'
                }`}
              >
                <span className={`text-sm font-bold ${schedule?.type === 'played' ? 'text-[#dccba6]' : 'text-[#3e2723]'}`}>{day}</span>
                {schedule && (
                  <div className={`mt-auto text-[10px] md:text-xs font-extrabold leading-tight w-full break-keep ${schedule.type === 'next' ? 'text-[#8a2e2e]' : 'text-[#e9e0d2]'}`}>
                    {schedule.type === 'played' ? '⚔️ ' : '📅 '}
                    <span className="truncate block">{schedule.title}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex gap-4 justify-center mt-4 mb-2 text-xs font-bold text-[#5d4037]">
          <div className="flex items-center gap-1"><span className="w-3 h-3 block bg-[#5d4037] rounded-sm shadow-inner"></span> 플레이 완료</div>
          <div className="flex items-center gap-1"><span className="w-3 h-3 block bg-[#e8dcc8] border border-[#8a2e2e] rounded-sm"></span> 다음 일정</div>
        </div>

        {currentMonthEvents.length > 0 && (
          <div className="mt-6 pt-4 border-t-2 border-[#a38c6d]">
            <h3 className="font-extrabold text-lg text-[#3e2723] mb-3 flex items-center gap-2">
              <span>📜</span> {month + 1}월의 기록
            </h3>
            <div className="space-y-3">
              {currentMonthEvents.map((ev, idx) => {
                const dayNum = ev.date.split('-')[2];
                return (
                  <div 
                    key={idx} 
                    onClick={() => handleEventClick(ev.date)}
                    className="bg-[#e9e0d2] p-3 rounded-md shadow-sm border border-[#a38c6d] flex flex-col gap-2 relative overflow-hidden cursor-pointer hover:bg-[#dccba6] transition-colors"
                  >
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${ev.type === 'played' ? 'bg-[#5d4037]' : 'bg-[#8a2e2e]'}`}></div>
                    <div className="flex items-center gap-2 pl-2">
                      <span className={`text-xs font-extrabold px-2 py-0.5 rounded text-white shadow-sm ${ev.type === 'played' ? 'bg-[#5d4037]' : 'bg-[#8a2e2e]'}`}>{dayNum}일</span>
                      <span className={`font-extrabold text-sm ${ev.type === 'played' ? 'text-[#3e2723]' : 'text-[#8a2e2e]'}`}>
                        {ev.title}
                      </span>
                    </div>
                    {ev.description && (
                      <div className="pl-2 text-[#5d4037] font-bold text-sm whitespace-pre-wrap leading-relaxed">
                        <IconText text={ev.description} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 일정 추가/수정 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100] p-4">
          <div className="bg-[#e9e0d2] w-full max-w-sm rounded-xl border-4 border-[#5d4037] flex flex-col shadow-2xl">
            <div className="p-4 pb-3 shrink-0 border-b-2 border-[#a38c6d]">
              <h2 className="text-xl font-extrabold text-[#3e2723]">{selectedDate} 일정</h2>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-2 text-sm font-extrabold text-[#3e2723] bg-[#c5b399] p-2 rounded justify-center border border-[#a38c6d]">
                {formData.type === 'played' ? '⚔️ 플레이 완료' : '📅 다음 모임'}
              </div>

              {formData.type === 'played' ? (
                <div>
                  <label className="block text-xs font-bold text-[#3e2723] mb-2">진행한 시나리오 선택</label>
                  <div className="min-h-[200px] max-h-[300px] overflow-y-auto border border-[#a38c6d] rounded bg-[#f4ecd8] p-2 space-y-1 shadow-inner">
                    {selectableScenarios.length === 0 ? (
                      <div className="text-xs text-center text-[#5d4037] p-4 font-bold">선택 가능한 시나리오가 없습니다.</div>
                    ) : (
                      selectableScenarios.map(sc => (
                        <label key={sc.id} className="flex items-center gap-3 text-sm font-bold text-[#3e2723] cursor-pointer p-2 hover:bg-[#e9e0d2] rounded transition-colors">
                          <input type="checkbox" checked={formData.scenario_ids?.includes(sc.id)} onChange={() => toggleScenario(sc.id)} className="accent-[#5d4037] w-5 h-5 shrink-0 cursor-pointer" />
                          <div className="flex-1 overflow-hidden whitespace-nowrap text-ellipsis flex items-center gap-3">
                            <div className="relative flex items-center justify-center w-9 h-9 shrink-0">
                              <img src="/ui/scenario.png" alt="scenario bg" className="absolute inset-0 w-full h-full object-contain drop-shadow-sm" />
                              <span className="relative z-10 text-white text-[15px] font-extrabold font-serif pb-0.5" style={{ textShadow: '0px 1px 3px rgba(0,0,0,0.9)' }}>
                                {sc.number}
                              </span>
                            </div>
                            <span className="truncate"><IconText text={sc.name} /></span>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-[#3e2723] mb-1">제목 (모임 장소, 목적 등)</label>
                  <input type="text" className="w-full p-2 border border-[#a38c6d] rounded font-bold text-[#3e2723] bg-[#f4ecd8] focus:outline-none focus:border-[#5d4037]" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                </div>
              )}
              
              <div>
                <label className="block text-xs font-bold text-[#3e2723] mb-1">상세 기록 및 메모</label>
                <textarea className="w-full p-2 border border-[#a38c6d] rounded h-24 font-bold resize-none leading-relaxed text-[#3e2723] bg-[#f4ecd8] focus:outline-none focus:border-[#5d4037] shadow-inner" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
            </div>

            <div className="p-4 border-t-2 border-[#a38c6d] flex justify-between gap-2">
              {formData.id && (
                <button onClick={handleDelete} className="bg-red-800 text-white px-4 py-2 rounded font-bold shadow text-sm active:scale-95">삭제</button>
              )}
              <div className="flex gap-2 flex-1 justify-end">
                <button onClick={() => setIsModalOpen(false)} className="bg-gray-400 text-white px-4 py-2 rounded font-bold shadow text-sm active:scale-95">취소</button>
                <button onClick={handleSave} className="bg-[#5d4037] text-[#e9e0d2] px-6 py-2 rounded font-bold shadow text-sm active:scale-95">저장</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}