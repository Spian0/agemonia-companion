/* eslint-disable @next/next/no-img-element */
'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import IconText from '../components/IconText'; 

import ImageCropperModal from '../components/ImageCropperModal';

export default function CityPage() {
  const [activeTab, setActiveTab] = useState('locations');
  const [locations, setLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPartyLevel, setCurrentPartyLevel] = useState(1);
  const [expandedLocs, setExpandedLocs] = useState({});

  const [isLocModalOpen, setIsLocModalOpen] = useState(false);
  const [newLocation, setNewLocation] = useState({ id: null, name: '', code: '', level: 1, baseText: '', services: [], activities: [] });

  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [targetLocId, setTargetLocId] = useState(null); 
  const [actionType, setActionType] = useState('service');
  
  const [actionData, setActionData] = useState({
    id: null, name: '', baseText: '', 
    options: [
      {
        costs: [{ type: '', value: '' }], 
        rewards: [{ type: 'text', text: '', itemType: 'token', name: '', attr: '', imageFile: null, imageUrl: null, imagePreview: null }]
      }
    ]
  });
  const [isUploading, setIsUploading] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);

  const [cropper, setCropper] = useState({ isOpen: false, src: null, oIdx: null, rIdx: null });

  useEffect(() => {
    async function fetchData() {
      try {
        // 파티 레벨 불러오기
        const { data: partyData } = await supabase.from('party_info').select('level').limit(1).maybeSingle();
        if (partyData) setCurrentPartyLevel(partyData.level);

        // 3개의 분리된 테이블에서 각각 데이터 불러오기
        const [ { data: locData }, { data: svcData }, { data: actData } ] = await Promise.all([
          supabase.from('city_locations').select('*').order('id', { ascending: true }),
          supabase.from('city_services').select('*').order('id', { ascending: true }),
          supabase.from('city_activities').select('*').order('id', { ascending: true })
        ]);

        // 분리된 데이터를 UI에서 쓰던 중첩 구조(locations 안에 services, activities 포함)로 다시 조립
        if (locData) {
          const assembledLocs = locData.map(loc => ({
            id: loc.id,
            code: loc.code,
            name: loc.name,
            level: loc.level,
            baseText: loc.base_text, // snake_case를 UI용 camelCase로 변환
            services: (svcData || []).filter(s => s.location_id === loc.id).map(s => ({
              id: s.id,
              name: s.name,
              baseText: s.base_text,
              options: s.options || []
            })),
            activities: (actData || []).filter(a => a.location_id === loc.id).map(a => ({
              id: a.id,
              name: a.name,
              baseText: a.base_text,
              options: a.options || []
            }))
          }));
          setLocations(assembledLocs);
        }
      } catch (err) { 
        console.error(err); 
      } finally { 
        setIsLoading(false); 
      }
    }
    fetchData();
  }, []);

  const toggleLoc = (id) => setExpandedLocs(prev => ({ ...prev, [id]: !prev[id] }));

  // [수정됨] 장소 전용 테이블에 저장
  const handleSaveLocation = async () => {
    if (!newLocation.name || !newLocation.code) return alert('이름과 코드를 입력해주세요.');
    const locId = newLocation.id || Date.now();
    
    // DB 저장용 페이로드
    const dbPayload = {
      id: locId,
      code: newLocation.code,
      name: newLocation.name,
      level: newLocation.level,
      base_text: newLocation.baseText
    };

    const { error } = await supabase.from('city_locations').upsert(dbPayload);
    if (error) return alert('장소 DB 저장 실패: ' + error.message);

    // 로컬 상태 업데이트
    const updatedLoc = { ...newLocation, id: locId };
    if (!newLocation.id) {
      updatedLoc.services = [];
      updatedLoc.activities = [];
    }
    
    const updated = newLocation.id ? locations.map(loc => loc.id === locId ? updatedLoc : loc) : [...locations, updatedLoc];
    if (!newLocation.id) setExpandedLocs(prev => ({ ...prev, [locId]: true }));
    setLocations(updated);
    setIsLocModalOpen(false);
  };

  const openEditLocation = (e, loc) => { e.stopPropagation(); setNewLocation(loc); setIsLocModalOpen(true); };

  const uploadImage = async (file) => {
    if (!file) return null;
    const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 5)}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('agemonia_images').upload(fileName, file);
    if (error) return null;
    return supabase.storage.from('agemonia_images').getPublicUrl(fileName).data.publicUrl;
  };

  // [수정됨] 서비스/활동 테이블에 개별 저장
  const handleSaveAction = async () => {
    if (!actionData.name.trim()) return alert('이름을 입력해주세요.');
    setIsUploading(true);
    
    const finalOptions = [];
    for (let opt of actionData.options) {
      const finalRewards = [];
      for (let r of opt.rewards) {
        let finalImg = r.imageUrl;
        if (r.type === 'item' && r.imageFile) {
          const uploaded = await uploadImage(r.imageFile);
          if (uploaded) finalImg = uploaded;
        }
        finalRewards.push({
          type: r.type,
          ...(r.type === 'text' ? { text: r.text } : { itemType: r.itemType, name: r.name, attr: r.attr, imageUrl: finalImg })
        });
      }
      finalOptions.push({ costs: opt.costs.filter(c => c.type && c.value), rewards: finalRewards });
    }

    const actionId = actionData.id || Date.now();
    
    // DB 저장용 페이로드
    const dbPayload = {
      id: actionId,
      location_id: targetLocId,
      name: actionData.name,
      base_text: actionData.baseText,
      options: finalOptions
    };

    const tableName = actionType === 'service' ? 'city_services' : 'city_activities';
    const { error } = await supabase.from(tableName).upsert(dbPayload);
    
    if (error) {
      setIsUploading(false);
      return alert('DB 저장 실패: ' + error.message);
    }

    // 로컬 상태 업데이트
    const savedAction = { id: actionId, name: actionData.name, baseText: actionData.baseText, options: finalOptions };
    const updatedLocations = locations.map(loc => {
      if (loc.id === targetLocId) {
        const listName = actionType === 'service' ? 'services' : 'activities';
        let updatedList = actionData.id ? loc[listName].map(item => item.id === actionId ? savedAction : item) : [...loc[listName], savedAction];
        return { ...loc, [listName]: updatedList };
      }
      return loc;
    });

    setLocations(updatedLocations);
    setIsUploading(false);
    closeActionModal();
  };

  const openEditAction = (e, locId, type, action) => {
    e.stopPropagation();
    setTargetLocId(locId);
    setActionType(type);
    setActionData({
      ...action,
      options: action.options?.length > 0 ? action.options : [{ costs: [{ type: '', value: '' }], rewards: [{ type: 'text', text: '', itemType: 'token', name: '', attr: '', imageFile: null, imageUrl: null, imagePreview: null }] }]
    });
    setIsActionModalOpen(true);
  };

  const closeActionModal = () => {
    setIsActionModalOpen(false);
    setActionData({ id: null, name: '', baseText: '', options: [{ costs: [{ type: '', value: '' }], rewards: [{ type: 'text', text: '', itemType: 'token', name: '', attr: '', imageFile: null, imageUrl: null, imagePreview: null }] }] });
  };

  const addOptionField = () => setActionData({ ...actionData, options: [...actionData.options, { costs: [{ type: '', value: '' }], rewards: [{ type: 'text', text: '', itemType: 'token', name: '', attr: '', imageFile: null, imageUrl: null, imagePreview: null }] }] });
  const removeOptionField = (oIdx) => setActionData({ ...actionData, options: actionData.options.filter((_, i) => i !== oIdx) });
  const handleCostChange = (oIdx, cIdx, field, value) => {
    const newOpts = [...actionData.options];
    newOpts[oIdx].costs[cIdx][field] = value;
    setActionData({ ...actionData, options: newOpts });
  };
  const addCostField = (oIdx) => {
    const newOpts = [...actionData.options];
    newOpts[oIdx].costs.push({ type: '', value: '' });
    setActionData({ ...actionData, options: newOpts });
  };
  const handleRewardChange = (oIdx, rIdx, field, value) => {
    const newOpts = [...actionData.options];
    newOpts[oIdx].rewards[rIdx][field] = value;
    setActionData({ ...actionData, options: newOpts });
  };
  const addRewardField = (oIdx) => {
    const newOpts = [...actionData.options];
    newOpts[oIdx].rewards.push({ type: 'text', text: '', itemType: 'token', name: '', attr: '', imageFile: null, imageUrl: null, imagePreview: null });
    setActionData({ ...actionData, options: newOpts });
  };
  // 기존 handleRewardImageChange 함수 수정
  const handleRewardImageChange = (oIdx, rIdx, e) => {
    const file = e.target.files[0];
    if (file) {
      setCropper({ 
        isOpen: true, 
        src: URL.createObjectURL(file), 
        oIdx, 
        rIdx 
      });
      e.target.value = ''; // 동일한 파일 다시 선택 가능하도록 리셋
    }
  };

  const isSalesAction = (action) => action.options?.some(opt => opt.rewards?.some(r => r.type === 'item'));
  const allServices = locations.flatMap(loc => loc.services.map(svc => ({ ...svc, locationId: loc.id, locationName: loc.name, locationCode: loc.code })));
  const allActivities = locations.flatMap(loc => loc.activities.map(act => ({ ...act, locationId: loc.id, locationName: loc.name, locationCode: loc.code })));

  const globalCards = [];
  const globalTokens = [];
  locations.forEach(loc => {
    loc.services.filter(isSalesAction).forEach(svc => {
      svc.options?.forEach(opt => {
        const costVal = (opt.costs && opt.costs.length > 0) ? opt.costs.map(c => c.value).join('/') : '무료';
        opt.rewards?.forEach(r => {
          if (r.type === 'item') {
            const itemData = { locCode: loc.code, locName: loc.name, svcName: svc.name, svcId: svc.id, costVal, ...r };
            if (r.itemType === 'card') globalCards.push(itemData);
            else globalTokens.push(itemData);
          }
        });
      });
    });
  });

  if (isLoading) return <div className="min-h-screen bg-[#dccba6] p-6 text-center font-bold text-[#3e2723]">로딩 중...</div>;

  const ActionDetails = ({ action, showBaseText = false }) => (
    <div className="mt-2 text-sm bg-white bg-opacity-40 p-2 rounded border border-[#a38c6d]">
      {showBaseText && action.baseText && (
        <div className="mb-3 text-[#3e2723] font-semibold leading-relaxed whitespace-pre-wrap">
          <IconText text={action.baseText} />
        </div>
      )}
      <div className="space-y-3">
        {action.options && action.options.map((opt, oIdx) => (
          <div key={oIdx} className="bg-[#e9e0d2] p-2 rounded shadow-sm border border-[#a38c6d]">
            {opt.costs && opt.costs.length > 0 && (
              <div className="mb-1 flex flex-wrap items-center gap-1">
                <span className="font-bold text-[#3e2723]">비용: </span>
                {opt.costs.map((c, i) => (
                  <span key={i} className="border border-[#5d4037] px-1.5 py-0.5 rounded bg-white text-[#3e2723] font-bold text-xs shadow-sm flex items-center gap-1">
                    <IconText text={c.type} />: {c.value}
                  </span>
                ))}
              </div>
            )}
            
            {opt.rewards && opt.rewards.length > 0 && (
              <div className="mt-2">
                <span className="font-bold text-[#5d4037]">보상: </span>
                <div className="space-y-1 mt-1">
                  {opt.rewards.map((r, i) => (
                    <div key={i} className="pl-1">
                      {r.type === 'text' ? (
                        <span className="text-[#3e2723] font-semibold flex items-center gap-1">- <IconText text={r.text} /></span>
                      ) : (
                        <div className="flex gap-2 bg-white p-2 rounded items-start border border-[#a38c6d] shadow-sm mt-1">
                          <div className="flex flex-col items-center gap-1 shrink-0">
                            {r.imageUrl ? (
                              <img src={r.imageUrl} alt="item preview" onClick={(e) => { e.stopPropagation(); setPreviewImageUrl(r.imageUrl); }} className="w-14 h-14 object-contain bg-black bg-opacity-5 rounded border border-gray-300 cursor-pointer hover:opacity-80 transition-opacity" />
                            ) : (
                              <div className="w-14 h-14 bg-gray-200 flex items-center justify-center rounded border border-gray-400 text-[10px] text-gray-500 text-center font-bold">사진<br/>없음</div>
                            )}
                          </div>
                          <div className="pt-1">
                            <div className="font-extrabold text-[#3e2723] flex items-center gap-1">[{r.itemType === 'token' ? '토큰' : '카드'}] <IconText text={r.name} /></div>
                            <div className="text-xs text-[#5d4037] font-bold mt-1">{r.itemType === 'token' ? `판매: ${r.attr}` : `번호: ${r.attr}`}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-2 md:p-6 pb-20 relative min-h-screen bg-[#dccba6] font-serif">
      <div className="max-w-md mx-auto relative">
        <div className="text-center font-extrabold text-2xl mb-4 border-b-4 border-[#5d4037] pb-2 text-[#3e2723] tracking-wider mt-4">
          룬데일 - 레벨 {currentPartyLevel}
        </div>

        <div className="flex bg-[#c5b399] p-1 rounded-lg border-2 border-[#a38c6d] mb-6 shadow">
          <button onClick={() => setActiveTab('locations')} className={`flex-1 py-2 font-bold text-sm rounded-md transition-colors ${activeTab === 'locations' ? 'bg-[#5d4037] text-white' : 'text-[#3e2723]'}`}>🏰 장소</button>
          <button onClick={() => setActiveTab('services')} className={`flex-1 py-2 font-bold text-sm rounded-md transition-colors ${activeTab === 'services' ? 'bg-[#5d4037] text-white' : 'text-[#3e2723]'}`}>📜 서비스/판매</button>
          <button onClick={() => setActiveTab('activities')} className={`flex-1 py-2 font-bold text-sm rounded-md transition-colors ${activeTab === 'activities' ? 'bg-[#5d4037] text-white' : 'text-[#3e2723]'}`}>⚔️ 활동</button>
        </div>

        {activeTab === 'locations' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-xl italic text-[#3e2723]">장소 관리</h3>
              <button onClick={() => { setNewLocation({ id: null, name: '', code: '', level: currentPartyLevel, baseText: '', services: [], activities: [] }); setIsLocModalOpen(true); }} className="bg-gradient-to-b from-[#4e3626] to-[#251811] text-[#d4b886] px-3 py-1 rounded font-bold shadow border border-[#140d09]">+ 장소 추가</button>
            </div>
            <div className="space-y-4">
              {locations.map(loc => (
                <div key={loc.id} className="bg-[#c5b399] border-2 border-[#a38c6d] rounded-lg p-3 shadow-md">
                  <div onClick={() => toggleLoc(loc.id)} className="cursor-pointer flex justify-between items-center p-1">
                    <div className="flex items-center">
                    <div className="relative inline-flex items-center justify-center shrink-0 mr-2 align-middle">
                        <img 
                          src="/ui/location.png" 
                          alt="location bg" 
                          className="w-[3em] h-[3em] object-contain drop-shadow-sm"
                        />
                        <span 
                          className="absolute z-10 text-white font-extrabold font-serif"
                          style={{ fontSize: '0.85em', textShadow: '0px 1px 3px rgba(0,0,0,0.9), 0px 0px 2px rgba(0,0,0,0.8)' }}
                        >
                          {loc.code}
                        </span>
                      </div>
                      <span className="text-xl font-extrabold text-[#3e2723] tracking-wide"><IconText text={loc.name} /></span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold bg-[#a38c6d] text-[#3e2723] px-1.5 py-0.5 rounded">LV {loc.level}</span>
                      <button onClick={(e) => openEditLocation(e, loc)} className="text-xs bg-[#2e5c8a] text-white px-1.5 py-0.5 rounded shadow ml-1">수정</button>
                      <span className="text-[#3e2723] font-bold ml-1">{expandedLocs[loc.id] ? '▲' : '▼'}</span>
                    </div>
                  </div>
                  
                  {expandedLocs[loc.id] && (
                    <div className="mt-3 border-t-2 border-[#a38c6d] pt-3">
                      <div className="text-[#3e2723] font-semibold text-sm mb-4 bg-[#e9e0d2] bg-opacity-70 p-3 rounded leading-relaxed whitespace-pre-wrap border border-[#a38c6d]">
                        <IconText text={loc.baseText} />
                      </div>
                      
                      {loc.services && loc.services.length > 0 && (
                        <div className="mb-4 space-y-2">
                          <h4 className="font-extrabold text-[#3e2723] border-b-2 border-[#8c7355] pb-1">📜 제공 서비스</h4>
                          {loc.services.map(svc => (
                            <div key={svc.id} className="bg-[#c5b399] p-2 rounded shadow-sm border border-[#8c7355]">
                              <div className="flex justify-between items-center bg-[#5d4037] p-2 rounded text-white shadow-inner">
                                <span className="font-extrabold text-[#e9e0d2] tracking-wide flex items-center gap-1"><IconText text={svc.name} /></span>
                                <button onClick={(e) => openEditAction(e, loc.id, 'service', svc)} className="text-[10px] bg-[#e9e0d2] text-[#5d4037] px-2 py-0.5 rounded font-bold">수정</button>
                              </div>
                              <ActionDetails action={svc} showBaseText={true} />
                            </div>
                          ))}
                        </div>
                      )}

                      {loc.activities && loc.activities.length > 0 && (
                        <div className="mb-4 space-y-2">
                          <h4 className="font-extrabold text-[#3e2723] border-b-2 border-[#8c7355] pb-1">⚔️ 가능 활동</h4>
                          {loc.activities.map(act => (
                            <div key={act.id} className="bg-[#c5b399] p-2 rounded shadow-sm border border-[#8c7355]">
                              <div className="flex justify-between items-center bg-[#2a453b] p-2 rounded text-white shadow-inner">
                                <span className="font-extrabold text-[#e9e0d2] tracking-wide flex items-center gap-1"><IconText text={act.name} /></span>
                                <button onClick={(e) => openEditAction(e, loc.id, 'activity', act)} className="text-[10px] bg-[#e9e0d2] text-[#2a453b] px-2 py-0.5 rounded font-bold">수정</button>
                              </div>
                              <ActionDetails action={act} showBaseText={true} />
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2 mt-4 pt-3 border-t border-[#a38c6d]">
                        <button onClick={() => { setTargetLocId(loc.id); setActionType('service'); setIsActionModalOpen(true); }} className="flex-1 bg-[#2e5c8a] text-white text-xs py-2 rounded font-bold shadow">+ 서비스 추가</button>
                        <button onClick={() => { setTargetLocId(loc.id); setActionType('activity'); setIsActionModalOpen(true); }} className="flex-1 bg-[#8a2e2e] text-white text-xs py-2 rounded font-bold shadow">+ 활동 추가</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'services' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-bold text-xl italic text-[#3e2723] border-b-2 border-[#a38c6d] pb-1 mb-3">💰 전체 판매 목록</h3>
              <div className="space-y-4">
                {globalCards.length > 0 && (
                  <div>
                    <h5 className="font-extrabold text-[#3e2723] mb-1">🃏 카드 목록</h5>
                    <div className="overflow-x-auto rounded border border-[#a68d6c] shadow-sm">
                      <table className="w-full text-center border-collapse whitespace-nowrap">
                        <thead className="bg-[#5d4037] text-[#e9e0d2] text-[11px] uppercase">
                          <tr>
                            <th className="p-1.5 border-r border-[#8c7355]">장소</th>
                            <th className="p-1.5 border-r border-[#8c7355]">가격</th>
                            <th className="p-1.5 border-r border-[#8c7355]">번호</th>
                            <th className="p-1.5 border-r border-[#8c7355] w-full text-left pl-2">이름</th>
                            <th className="p-1.5 w-10">보기</th>
                          </tr>
                        </thead>
                        <tbody className="bg-[#e9e0d2] text-[#3e2723] text-xs font-bold">
                          {globalCards.map((c, i) => (
                            <tr key={i} className="border-b border-[#a68d6c] last:border-b-0">
                              <td className="p-1.5 border-r border-[#a68d6c] font-extrabold">{c.locCode}</td>
                              <td className="p-1.5 border-r border-[#a68d6c] text-[#8a2e2e]">{c.costVal}</td>
                              <td className="p-1.5 border-r border-[#a68d6c] text-[#5d4037]">{c.attr}</td>
                              <td className="p-1.5 border-r border-[#a68d6c] text-left pl-2 overflow-hidden text-ellipsis max-w-[120px]"><IconText text={c.name} /></td>
                              <td className="p-1.5">
                                <button onClick={(e) => { e.stopPropagation(); setPreviewImageUrl(c.imageUrl); }} disabled={!c.imageUrl} className={`w-6 h-6 flex items-center justify-center mx-auto rounded shadow-sm ${c.imageUrl ? 'bg-[#2e5c8a] text-white hover:opacity-80' : 'bg-gray-400 text-gray-200 cursor-not-allowed'}`}>
                                  {c.imageUrl ? '🔍' : '-'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {globalTokens.length > 0 && (
                  <div>
                    <h5 className="font-extrabold text-[#3e2723] mb-1">🪙 토큰 목록</h5>
                    <div className="overflow-x-auto rounded border border-[#a68d6c] shadow-sm">
                      <table className="w-full text-center border-collapse whitespace-nowrap">
                        <thead className="bg-[#2a453b] text-[#e9e0d2] text-[11px] uppercase">
                          <tr>
                            <th className="p-1.5 border-r border-[#1a2d26]">장소</th>
                            <th className="p-1.5 border-r border-[#1a2d26]">가격</th>
                            <th className="p-1.5 border-r border-[#1a2d26] w-full text-left pl-2">이름</th>
                            <th className="p-1.5 border-r border-[#1a2d26]">되팔기</th>
                            <th className="p-1.5 w-10">보기</th>
                          </tr>
                        </thead>
                        <tbody className="bg-[#e9e0d2] text-[#3e2723] text-xs font-bold">
                          {globalTokens.map((t, i) => (
                            <tr key={i} className="border-b border-[#a68d6c] last:border-b-0">
                              <td className="p-1.5 border-r border-[#a68d6c] font-extrabold">{t.locCode}</td>
                              <td className="p-1.5 border-r border-[#a68d6c] text-[#8a2e2e]">{t.costVal}</td>
                              <td className="p-1.5 border-r border-[#a68d6c] text-left pl-2 overflow-hidden text-ellipsis max-w-[120px]"><IconText text={t.name} /></td>
                              <td className="p-1.5 border-r border-[#a68d6c] text-[#5d4037]">{t.attr}</td>
                              <td className="p-1.5">
                                <button onClick={(e) => { e.stopPropagation(); setPreviewImageUrl(t.imageUrl); }} disabled={!t.imageUrl} className={`w-6 h-6 flex items-center justify-center mx-auto rounded shadow-sm ${t.imageUrl ? 'bg-[#8a2e2e] text-white hover:opacity-80' : 'bg-gray-400 text-gray-200 cursor-not-allowed'}`}>
                                  {t.imageUrl ? '🔍' : '-'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t-4 border-dashed border-[#a38c6d]">
              <h3 className="font-bold text-xl italic text-[#3e2723] border-b-2 border-[#a38c6d] pb-1 mb-3">📜 전체 제공 서비스</h3>
              <div className="space-y-3">
                {allServices.filter(s => !isSalesAction(s)).map((svc, idx) => (
                  <div key={`svc-${idx}`} className="bg-[#c5b399] border-2 border-[#a38c6d] rounded-lg p-3 shadow">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-xs font-bold text-[#5d4037] bg-white bg-opacity-40 px-1.5 py-0.5 rounded border border-[#a38c6d]">📍 {svc.locationName} ({svc.locationCode})</div>
                      <button onClick={(e) => openEditAction(e, svc.locationId, 'service', svc)} className="text-[10px] bg-[#2e5c8a] text-white px-2 py-1 rounded font-bold shadow">수정</button>
                    </div>
                    <div className="font-extrabold text-lg text-[#3e2723] pl-1"><IconText text={svc.name} /></div>
                    <ActionDetails action={svc} showBaseText={false} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'activities' && (
          <div className="space-y-3">
            {allActivities.map((act, idx) => (
              <div key={idx} className="bg-[#c5b399] border-2 border-[#a38c6d] rounded-lg p-3 shadow">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-xs font-bold text-[#5d4037] bg-white bg-opacity-40 px-1.5 py-0.5 rounded border border-[#a38c6d]">📍 {act.locationName} ({act.locationCode})</div>
                  <button onClick={(e) => openEditAction(e, act.locationId, 'activity', act)} className="text-[10px] bg-[#8a2e2e] text-white px-2 py-1 rounded font-bold shadow">수정</button>
                </div>
                <div className="font-extrabold text-lg text-[#3e2723] pl-1"><IconText text={act.name} /></div>
                <ActionDetails action={act} showBaseText={false} />
              </div>
            ))}
          </div>
        )}
      </div>

      {isLocModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100] p-4">
          <div className="bg-[#e9e0d2] w-full max-w-sm rounded-xl border-4 border-[#5d4037] flex flex-col max-h-[85vh] shadow-2xl">
            <div className="p-4 pb-3 shrink-0 border-b-2 border-[#a38c6d]">
              <h2 className="text-xl font-extrabold text-[#3e2723]">{newLocation.id ? '장소 수정' : '새 장소 추가'}</h2>
            </div>
            <div className="p-4 overflow-y-auto grow space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-[#3e2723] mb-1">장소 이름</label>
                  <input type="text" className="w-full p-2 border rounded font-bold" value={newLocation.name} onChange={e => setNewLocation({...newLocation, name: e.target.value})} />
                </div>
                <div className="w-20">
                  <label className="block text-xs font-bold text-[#3e2723] mb-1">코드</label>
                  <input type="text" className="w-full p-2 border rounded text-center font-bold" value={newLocation.code} onChange={e => setNewLocation({...newLocation, code: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#3e2723] mb-1">설명</label>
                <textarea className="w-full p-2 border rounded h-32 font-bold resize-none leading-relaxed" value={newLocation.baseText} onChange={e => setNewLocation({...newLocation, baseText: e.target.value})} />
              </div>
            </div>
            <div className="p-4 shrink-0 border-t-2 border-[#a38c6d] flex gap-2">
              <button onClick={() => setIsLocModalOpen(false)} className="flex-1 bg-gray-400 text-white py-2 rounded font-bold shadow">취소</button>
              <button onClick={handleSaveLocation} className="flex-1 bg-[#5d4037] text-white py-2 rounded font-bold shadow">저장</button>
            </div>
          </div>
        </div>
      )}

      {isActionModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100] p-4">
          <div className="bg-[#e9e0d2] w-full max-w-md rounded-xl border-4 border-[#5d4037] flex flex-col max-h-[85vh] shadow-2xl">
            <div className="p-4 pb-3 shrink-0 border-b-2 border-[#a38c6d]">
              <h2 className="text-xl font-extrabold text-[#3e2723]">
                {actionData.id ? '수정하기' : (actionType === 'service' ? '서비스/판매 추가' : '활동 추가')}
              </h2>
            </div>
            
            <div className="p-4 overflow-y-auto grow space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#3e2723] mb-1">이름</label>
                <input type="text" className="w-full p-2 border rounded font-bold text-[#3e2723]" value={actionData.name} onChange={e => setActionData({...actionData, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#3e2723] mb-1">설명</label>
                <textarea className="w-full p-2 border rounded h-20 font-bold resize-none leading-relaxed text-[#3e2723]" value={actionData.baseText} onChange={e => setActionData({...actionData, baseText: e.target.value})} />
              </div>

              <div className="flex justify-between items-center mt-2 border-t border-[#a38c6d] pt-3">
                <label className="font-extrabold text-[#3e2723]">세부 항목</label>
                <button onClick={addOptionField} className="bg-[#2e5c8a] text-white px-2 py-1 text-xs rounded font-bold shadow">+ 항목 추가</button>
              </div>

              <div className="space-y-4 pb-2">
                {actionData.options.map((opt, oIdx) => (
                  <div key={oIdx} className="bg-[#c5b399] p-3 rounded border border-[#a38c6d] relative shadow-inner">
                    {actionData.options.length > 1 && (
                      <button onClick={() => removeOptionField(oIdx)} className="absolute top-2 right-2 bg-red-600 text-white text-[10px] px-2 py-1 rounded font-bold shadow">삭제</button>
                    )}
                    
                    <div className="mb-3 mt-1">
                      <div className="flex gap-2 mb-1 items-center">
                        <span className="font-bold text-[#3e2723]">비용</span>
                        <button onClick={() => addCostField(oIdx)} className="bg-[#5d4037] text-white px-1.5 py-0.5 text-[10px] rounded font-bold shadow">+ 비용 추가</button>
                      </div>
                      <div className="flex gap-2 mb-1">
                        <span className="flex-1 text-[10px] font-bold text-[#5d4037] pl-1">타입</span>
                        <span className="w-16 text-[10px] font-bold text-[#5d4037] pl-1">값</span>
                      </div>
                      {opt.costs.map((cost, cIdx) => (
                        <div key={cIdx} className="flex gap-2 mb-1">
                          <input type="text" className="flex-1 p-1 border rounded font-bold text-sm" value={cost.type} onChange={e => handleCostChange(oIdx, cIdx, 'type', e.target.value)} />
                          <input type="text" className="w-16 p-1 border rounded font-bold text-sm" value={cost.value} onChange={e => handleCostChange(oIdx, cIdx, 'value', e.target.value)} />
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-[#a38c6d] pt-2">
                      <div className="flex gap-2 mb-1 items-center">
                        <span className="font-bold text-[#3e2723]">보상/획득</span>
                        <button onClick={() => addRewardField(oIdx)} className="bg-[#5d4037] text-white px-1.5 py-0.5 text-[10px] rounded font-bold shadow">+ 보상 추가</button>
                      </div>
                      {opt.rewards.map((reward, rIdx) => (
                        <div key={rIdx} className="bg-[#e9e0d2] p-2 rounded border border-[#a38c6d] mb-2 shadow-sm">
                          <div className="flex gap-3 mb-2 border-b border-[#c5b399] pb-2">
                            <label className="font-bold text-sm flex items-center gap-1"><input type="radio" checked={reward.type === 'text'} onChange={() => handleRewardChange(oIdx, rIdx, 'type', 'text')} className="accent-[#5d4037]"/> 텍스트</label>
                            <label className="font-bold text-sm flex items-center gap-1"><input type="radio" checked={reward.type === 'item'} onChange={() => handleRewardChange(oIdx, rIdx, 'type', 'item')} className="accent-[#5d4037]"/> 아이템</label>
                          </div>
                          
                          {reward.type === 'text' ? (
                            <div>
                              <label className="block text-[10px] font-bold text-[#5d4037] mb-1">텍스트 내용</label>
                              <textarea className="w-full p-2 border rounded font-bold resize-none h-16 text-sm" value={reward.text} onChange={e => handleRewardChange(oIdx, rIdx, 'text', e.target.value)} />
                            </div>
                          ) : (
                            <div className="space-y-2">
                               <div className="flex gap-4">
                                <label className="text-sm font-bold text-[#2e5c8a] flex items-center gap-1"><input type="radio" checked={reward.itemType === 'card'} onChange={() => handleRewardChange(oIdx, rIdx, 'itemType', 'card')} className="accent-[#2e5c8a]" /> 🃏 카드</label>
                                <label className="text-sm font-bold text-[#8a2e2e] flex items-center gap-1"><input type="radio" checked={reward.itemType === 'token'} onChange={() => handleRewardChange(oIdx, rIdx, 'itemType', 'token')} className="accent-[#8a2e2e]" /> 🪙 토큰</label>
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-[#5d4037] mb-1">아이템 이름</label>
                                <input type="text" className="w-full p-1.5 border rounded font-bold text-sm" value={reward.name} onChange={e => handleRewardChange(oIdx, rIdx, 'name', e.target.value)} />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-[#5d4037] mb-1">{reward.itemType === 'token' ? '되팔기 가격' : '카드번호'}</label>
                                <input type="text" className="w-full p-1.5 border rounded font-bold text-sm" value={reward.attr} onChange={e => handleRewardChange(oIdx, rIdx, 'attr', e.target.value)} />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-[#5d4037] mb-1">사진 업로드</label>
                                <input type="file" accept="image/*" onChange={(e) => handleRewardImageChange(oIdx, rIdx, e)} className="w-full text-[10px] font-bold mt-1 bg-white p-1 rounded border border-[#a38c6d]" />
                              </div>
                              
                              {(reward.imagePreview || reward.imageUrl) && (
                                <div className="mt-2 p-2 bg-white rounded border border-[#a38c6d] inline-block shadow-sm">
                                  <img src={reward.imagePreview || reward.imageUrl} alt="preview" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreviewImageUrl(reward.imagePreview || reward.imageUrl); }} className="h-16 object-contain rounded cursor-pointer hover:opacity-80 transition-opacity" />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-4 shrink-0 border-t-2 border-[#a38c6d] flex gap-2">
              <button onClick={closeActionModal} disabled={isUploading} className="flex-1 bg-gray-400 text-white py-2 rounded font-bold shadow">취소</button>
              <button onClick={handleSaveAction} disabled={isUploading} className="flex-1 bg-[#5d4037] text-[#e9e0d2] py-2 rounded font-bold shadow">{isUploading ? '업로드 중...' : '저장'}</button>
            </div>
          </div>
        </div>
      )}

      {previewImageUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[200] p-4" onClick={() => setPreviewImageUrl(null)}>
          <div className="relative" onClick={e => e.stopPropagation()}>
            <img src={previewImageUrl} alt="확대 이미지" className="max-w-full max-h-[85vh] object-contain rounded shadow-2xl border-4 border-[#c5b399]" />
            <button onClick={() => setPreviewImageUrl(null)} className="absolute -top-4 -right-4 bg-red-800 text-white w-8 h-8 rounded-full font-extrabold shadow-lg border-2 border-white flex items-center justify-center">X</button>
          </div>
        </div>
      )}

      <ImageCropperModal
        isOpen={cropper.isOpen}
        imageSrc={cropper.src}
        cropShape="rect" 
        initialAspect={1} 
        onClose={() => setCropper({ ...cropper, isOpen: false })}
        onCropComplete={(file, url) => {
          const newOpts = [...actionData.options];
          newOpts[cropper.oIdx].rewards[cropper.rIdx].imageFile = file;
          newOpts[cropper.oIdx].rewards[cropper.rIdx].imagePreview = url;
          setActionData({ ...actionData, options: newOpts });
          setCropper({ ...cropper, isOpen: false });
        }}
      />
    </div>
  );
}