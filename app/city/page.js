'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function CityPage() {
  const [activeTab, setActiveTab] = useState('locations');
  const [locations, setLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPartyLevel, setCurrentPartyLevel] = useState(1);
  const [expandedLocs, setExpandedLocs] = useState({});

  const [isLocModalOpen, setIsLocModalOpen] = useState(false);
  const [newLocation, setNewLocation] = useState({
    id: null,
    name: '',
    code: '',
    level: 1,
    baseText: '',
    services: [],
    activities: [],
  });

  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [targetLocId, setTargetLocId] = useState(null);
  const [actionType, setActionType] = useState('service');

  const [actionData, setActionData] = useState({
    id: null,
    name: '',
    baseText: '',
    options: [
      {
        costs: [{ type: '', value: '' }],
        rewards: [
          {
            type: 'text',
            text: '',
            itemType: 'token',
            name: '',
            attr: '',
            imageFile: null,
            imageUrl: null,
            imagePreview: null,
          },
        ],
      },
    ],
  });
  const [isUploading, setIsUploading] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: partyData } = await supabase
          .from('party_info')
          .select('level')
          .limit(1)
          .maybeSingle();
        if (partyData) setCurrentPartyLevel(partyData.level);

        const { data: cityData } = await supabase
          .from('city_data')
          .select('locations')
          .limit(1)
          .maybeSingle();
        if (cityData && cityData.locations) {
          const migratedLocs = cityData.locations.map((loc) => ({
            ...loc,
            services: (loc.services || []).map((svc) => {
              if (svc.options) return svc;
              return {
                ...svc,
                options: [
                  {
                    costs: svc.costs || [],
                    rewards:
                      svc.rewards ||
                      (svc.resultType
                        ? [
                            {
                              type: svc.resultType,
                              text: svc.resultText,
                              itemType: svc.itemType,
                              name: svc.itemName,
                              attr: svc.itemAttr,
                              imageUrl: svc.imageUrl,
                            },
                          ]
                        : []),
                  },
                ],
              };
            }),
            activities: (loc.activities || []).map((act) => {
              if (act.options) return act;
              return {
                ...act,
                options: [
                  {
                    costs: act.costs || [],
                    rewards:
                      act.rewards ||
                      (act.resultType
                        ? [
                            {
                              type: act.resultType,
                              text: act.resultText,
                              itemType: act.itemType,
                              name: act.itemName,
                              attr: act.itemAttr,
                              imageUrl: act.imageUrl,
                            },
                          ]
                        : []),
                  },
                ],
              };
            }),
          }));
          setLocations(migratedLocs);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const saveLocations = async (updatedLocations) => {
    setLocations(updatedLocations);
    const { error } = await supabase
      .from('city_data')
      .upsert({ id: 1, locations: updatedLocations });
    if (error) alert('DB 저장 실패! 원인: ' + error.message);
  };

  const toggleLoc = (id) =>
    setExpandedLocs((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleSaveLocation = () => {
    if (!newLocation.name || !newLocation.code)
      return alert('이름과 코드를 입력해주세요.');
    let updated = newLocation.id
      ? locations.map((loc) => (loc.id === newLocation.id ? newLocation : loc))
      : [...locations, { ...newLocation, id: Date.now() }];
    if (!newLocation.id)
      setExpandedLocs((prev) => ({
        ...prev,
        [updated[updated.length - 1].id]: true,
      }));
    saveLocations(updated);
    setIsLocModalOpen(false);
  };

  const openEditLocation = (e, loc) => {
    e.stopPropagation();
    setNewLocation(loc);
    setIsLocModalOpen(true);
  };

  const uploadImage = async (file) => {
    if (!file) return null;
    const fileName = `${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 5)}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage
      .from('agemonia_images')
      .upload(fileName, file);
    if (error) {
      alert(
        `사진 업로드 실패! (권한 문제일 수 있습니다)\n에러: ${error.message}`
      );
      console.error(error);
      return null;
    }
    return supabase.storage.from('agemonia_images').getPublicUrl(fileName).data
      .publicUrl;
  };

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
          ...(r.type === 'text'
            ? { text: r.text }
            : {
                itemType: r.itemType,
                name: r.name,
                attr: r.attr,
                imageUrl: finalImg,
              }),
        });
      }
      finalOptions.push({
        costs: opt.costs.filter((c) => c.type && c.value),
        rewards: finalRewards,
      });
    }

    const savedAction = {
      id: actionData.id || Date.now(),
      name: actionData.name,
      baseText: actionData.baseText,
      options: finalOptions,
    };

    const updatedLocations = locations.map((loc) => {
      if (loc.id === targetLocId) {
        const listName = actionType === 'service' ? 'services' : 'activities';
        let updatedList = actionData.id
          ? loc[listName].map((item) =>
              item.id === actionData.id ? savedAction : item
            )
          : [...loc[listName], savedAction];
        return { ...loc, [listName]: updatedList };
      }
      return loc;
    });

    await saveLocations(updatedLocations);
    setIsUploading(false);
    closeActionModal();
  };

  const openEditAction = (e, locId, type, action) => {
    e.stopPropagation();
    setTargetLocId(locId);
    setActionType(type);
    setActionData({
      ...action,
      options:
        action.options?.length > 0
          ? action.options
          : [
              {
                costs: [{ type: '', value: '' }],
                rewards: [
                  {
                    type: 'text',
                    text: '',
                    itemType: 'token',
                    name: '',
                    attr: '',
                    imageFile: null,
                    imageUrl: null,
                    imagePreview: null,
                  },
                ],
              },
            ],
    });
    setIsActionModalOpen(true);
  };

  const closeActionModal = () => {
    setIsActionModalOpen(false);
    setActionData({
      id: null,
      name: '',
      baseText: '',
      options: [
        {
          costs: [{ type: '', value: '' }],
          rewards: [
            {
              type: 'text',
              text: '',
              itemType: 'token',
              name: '',
              attr: '',
              imageFile: null,
              imageUrl: null,
              imagePreview: null,
            },
          ],
        },
      ],
    });
  };

  const addOptionField = () =>
    setActionData({
      ...actionData,
      options: [
        ...actionData.options,
        {
          costs: [{ type: '', value: '' }],
          rewards: [
            {
              type: 'text',
              text: '',
              itemType: 'token',
              name: '',
              attr: '',
              imageFile: null,
              imageUrl: null,
              imagePreview: null,
            },
          ],
        },
      ],
    });
  const removeOptionField = (oIdx) =>
    setActionData({
      ...actionData,
      options: actionData.options.filter((_, i) => i !== oIdx),
    });

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
    newOpts[oIdx].rewards.push({
      type: 'text',
      text: '',
      itemType: 'token',
      name: '',
      attr: '',
      imageFile: null,
      imageUrl: null,
      imagePreview: null,
    });
    setActionData({ ...actionData, options: newOpts });
  };

  const handleRewardImageChange = (oIdx, rIdx, e) => {
    const file = e.target.files[0];
    if (file) {
      const newOpts = [...actionData.options];
      newOpts[oIdx].rewards[rIdx].imageFile = file;
      newOpts[oIdx].rewards[rIdx].imagePreview = URL.createObjectURL(file);
      setActionData({ ...actionData, options: newOpts });
    }
  };

  const allServices = locations.flatMap((loc) =>
    loc.services.map((svc) => ({
      ...svc,
      locationId: loc.id,
      locationName: loc.name,
      locationCode: loc.code,
    }))
  );
  const allActivities = locations.flatMap((loc) =>
    loc.activities.map((act) => ({
      ...act,
      locationId: loc.id,
      locationName: loc.name,
      locationCode: loc.code,
    }))
  );

  if (isLoading)
    return <div className="p-6 text-center font-bold">로딩 중...</div>;

  const ActionDetails = ({ action, showBaseText = false }) => (
    <div className="mt-2 text-sm bg-white bg-opacity-40 p-2 rounded border border-[#a38c6d]">
      {showBaseText && action.baseText && (
        <div className="mb-3 text-[#3e2723] font-semibold leading-relaxed whitespace-pre-wrap">
          {action.baseText}
        </div>
      )}

      <div className="space-y-3">
        {action.options &&
          action.options.map((opt, oIdx) => (
            <div
              key={oIdx}
              className="bg-[#e9e0d2] p-2 rounded shadow-sm border border-[#a38c6d]"
            >
              {opt.costs && opt.costs.length > 0 && (
                <div className="mb-1 flex flex-wrap items-center gap-1">
                  <span className="font-bold text-[#3e2723]">비용: </span>
                  {opt.costs.map((c, i) => (
                    <span
                      key={i}
                      className="border border-[#5d4037] px-1.5 py-0.5 rounded bg-white text-[#3e2723] font-bold text-xs shadow-sm"
                    >
                      {c.type}: {c.value}
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
                          <span className="text-[#3e2723] font-semibold">
                            - {r.text}
                          </span>
                        ) : (
                          <div className="flex gap-2 bg-white p-2 rounded items-start border border-[#a38c6d] shadow-sm">
                            <div className="flex flex-col items-center gap-1 shrink-0">
                              {r.imageUrl ? (
                                <>
                                  <img
                                    src={r.imageUrl}
                                    alt="item"
                                    className="w-14 h-14 object-contain bg-black bg-opacity-5 rounded border border-gray-300"
                                  />
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPreviewImageUrl(r.imageUrl);
                                    }}
                                    className="text-[10px] bg-[#5d4037] text-white px-2 py-1 rounded font-bold shadow w-full"
                                  >
                                    🔍 크게
                                  </button>
                                </>
                              ) : (
                                <div className="w-14 h-14 bg-gray-200 flex items-center justify-center rounded border border-gray-400 text-[10px] text-gray-500 text-center font-bold">
                                  사진
                                  <br />
                                  없음
                                </div>
                              )}
                            </div>

                            <div className="pt-1">
                              <div className="font-extrabold text-[#3e2723]">
                                [{r.itemType === 'token' ? '토큰' : '카드'}]{' '}
                                {r.name}
                              </div>
                              <div className="text-xs text-[#5d4037] font-bold mt-1">
                                {r.itemType === 'token'
                                  ? `판매: ${r.attr}`
                                  : `번호: ${r.attr}`}
                              </div>
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
    <div className="p-4 pb-20 relative min-h-screen">
      <div className="text-center font-extrabold text-2xl mb-4 border-b-4 border-[#5d4037] pb-2 text-[#3e2723]">
        룬데일 - 레벨 {currentPartyLevel}
      </div>

      <div className="flex bg-[#c5b399] p-1 rounded-lg border-2 border-[#a38c6d] mb-6 shadow">
        <button
          onClick={() => setActiveTab('locations')}
          className={`flex-1 py-2 font-bold rounded-md ${
            activeTab === 'locations'
              ? 'bg-[#5d4037] text-white'
              : 'text-[#3e2723]'
          }`}
        >
          🏰 장소
        </button>
        <button
          onClick={() => setActiveTab('services')}
          className={`flex-1 py-2 font-bold rounded-md ${
            activeTab === 'services'
              ? 'bg-[#5d4037] text-white'
              : 'text-[#3e2723]'
          }`}
        >
          📜 서비스
        </button>
        <button
          onClick={() => setActiveTab('activities')}
          className={`flex-1 py-2 font-bold rounded-md ${
            activeTab === 'activities'
              ? 'bg-[#5d4037] text-white'
              : 'text-[#3e2723]'
          }`}
        >
          ⚔️ 활동
        </button>
      </div>

      {activeTab === 'locations' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-xl italic text-[#3e2723]">
              장소 관리
            </h3>
            <button
              onClick={() => {
                setNewLocation({
                  id: null,
                  name: '',
                  code: '',
                  level: currentPartyLevel,
                  baseText: '',
                  services: [],
                  activities: [],
                });
                setIsLocModalOpen(true);
              }}
              className="bg-[#5d4037] text-white px-3 py-1 rounded font-bold shadow"
            >
              + 추가
            </button>
          </div>
          <div className="space-y-4">
            {locations.map((loc) => (
              <div
                key={loc.id}
                className="bg-[#c5b399] border-2 border-[#a38c6d] rounded-lg p-4 shadow"
              >
                <div
                  onClick={() => toggleLoc(loc.id)}
                  className="cursor-pointer flex justify-between items-center"
                >
                  <div className="flex items-center">
                    <span className="bg-[#5d4037] text-white w-7 h-7 flex items-center justify-center rounded font-bold mr-3">
                      {loc.code}
                    </span>
                    <span className="text-xl font-extrabold text-[#3e2723]">
                      {loc.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold bg-[#a38c6d] text-[#3e2723] px-2 py-1 rounded">
                      LV {loc.level}
                    </span>
                    <button
                      onClick={(e) => openEditLocation(e, loc)}
                      className="text-xs bg-blue-800 text-white px-2 py-1 rounded shadow"
                    >
                      ✏️
                    </button>
                    <span className="text-[#3e2723] font-bold text-lg ml-1">
                      {expandedLocs[loc.id] ? '▲' : '▼'}
                    </span>
                  </div>
                </div>

                {expandedLocs[loc.id] && (
                  <div className="mt-4 border-t-2 border-[#a38c6d] pt-4">
                    <p className="text-[#3e2723] font-semibold text-sm mb-4 bg-white bg-opacity-60 p-3 rounded leading-relaxed whitespace-pre-wrap">
                      {loc.baseText}
                    </p>

                    {loc.services && loc.services.length > 0 && (
                      <div className="mb-4 space-y-2">
                        <h4 className="font-bold text-[#3e2723] border-b border-[#a38c6d] pb-1">
                          📜 제공 서비스
                        </h4>
                        {loc.services.map((svc) => (
                          <div
                            key={svc.id}
                            className="bg-[#c5b399] p-2 rounded shadow border border-[#a38c6d]"
                          >
                            <div className="flex justify-between items-center bg-[#5d4037] p-2 rounded text-white">
                              <span className="font-extrabold">{svc.name}</span>
                              <button
                                onClick={(e) =>
                                  openEditAction(e, loc.id, 'service', svc)
                                }
                                className="text-xs bg-white text-[#5d4037] px-2 rounded font-bold"
                              >
                                수정
                              </button>
                            </div>
                            <ActionDetails action={svc} showBaseText={true} />
                          </div>
                        ))}
                      </div>
                    )}

                    {loc.activities && loc.activities.length > 0 && (
                      <div className="mb-4 space-y-2">
                        <h4 className="font-bold text-[#3e2723] border-b border-[#a38c6d] pb-1">
                          ⚔️ 가능 활동
                        </h4>
                        {loc.activities.map((act) => (
                          <div
                            key={act.id}
                            className="bg-[#c5b399] p-2 rounded shadow border border-[#a38c6d]"
                          >
                            <div className="flex justify-between items-center bg-[#5d4037] p-2 rounded text-white">
                              <span className="font-extrabold">{act.name}</span>
                              <button
                                onClick={(e) =>
                                  openEditAction(e, loc.id, 'activity', act)
                                }
                                className="text-xs bg-white text-[#5d4037] px-2 rounded font-bold"
                              >
                                수정
                              </button>
                            </div>
                            <ActionDetails action={act} showBaseText={true} />
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => {
                          setTargetLocId(loc.id);
                          setActionType('service');
                          setIsActionModalOpen(true);
                        }}
                        className="flex-1 bg-[#2e5c8a] text-white text-sm py-2 rounded font-bold shadow"
                      >
                        + 서비스 추가
                      </button>
                      <button
                        onClick={() => {
                          setTargetLocId(loc.id);
                          setActionType('activity');
                          setIsActionModalOpen(true);
                        }}
                        className="flex-1 bg-[#8a2e2e] text-white text-sm py-2 rounded font-bold shadow"
                      >
                        + 활동 추가
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'services' && (
        <div className="space-y-3">
          {allServices.map((svc, idx) => (
            <div
              key={idx}
              className="bg-[#c5b399] border-2 border-[#a38c6d] rounded-lg p-3"
            >
              <div className="flex justify-between items-start mb-1">
                <div className="text-xs font-bold text-[#5d4037]">
                  📍 {svc.locationName} ({svc.locationCode})
                </div>
                <button
                  onClick={(e) =>
                    openEditAction(e, svc.locationId, 'service', svc)
                  }
                  className="text-xs bg-blue-800 text-white px-2 py-1 rounded font-bold"
                >
                  ✏️ 수정
                </button>
              </div>
              <div className="font-extrabold text-xl text-[#3e2723]">
                {svc.name}
              </div>
              <ActionDetails action={svc} showBaseText={false} />
            </div>
          ))}
        </div>
      )}

      {activeTab === 'activities' && (
        <div className="space-y-3">
          {allActivities.map((act, idx) => (
            <div
              key={idx}
              className="bg-[#c5b399] border-2 border-[#a38c6d] rounded-lg p-3"
            >
              <div className="flex justify-between items-start mb-1">
                <div className="text-xs font-bold text-[#5d4037]">
                  📍 {act.locationName} ({act.locationCode})
                </div>
                <button
                  onClick={(e) =>
                    openEditAction(e, act.locationId, 'activity', act)
                  }
                  className="text-xs bg-red-800 text-white px-2 py-1 rounded font-bold"
                >
                  ✏️ 수정
                </button>
              </div>
              <div className="font-extrabold text-xl text-[#3e2723]">
                {act.name}
              </div>
              <ActionDetails action={act} showBaseText={false} />
            </div>
          ))}
        </div>
      )}

      {/* 장소 추가/수정 모달 */}
      {isLocModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100] p-4">
          <div className="bg-[#e9e0d2] w-full max-w-sm rounded-xl border-4 border-[#5d4037] flex flex-col max-h-[85vh] shadow-2xl">
            {/* Header */}
            <div className="p-4 pb-3 shrink-0 border-b-2 border-[#a38c6d]">
              <h2 className="text-xl font-extrabold text-[#3e2723]">
                {newLocation.id ? '장소 수정' : '새 장소 추가'}
              </h2>
            </div>
            {/* Body */}
            <div className="p-4 overflow-y-auto grow space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-[#3e2723] mb-1">
                    장소 이름
                  </label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded font-bold"
                    value={newLocation.name}
                    onChange={(e) =>
                      setNewLocation({ ...newLocation, name: e.target.value })
                    }
                  />
                </div>
                <div className="w-20">
                  <label className="block text-xs font-bold text-[#3e2723] mb-1">
                    코드
                  </label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded text-center font-bold"
                    value={newLocation.code}
                    onChange={(e) =>
                      setNewLocation({ ...newLocation, code: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#3e2723] mb-1">
                  설명
                </label>
                <textarea
                  className="w-full p-2 border rounded h-32 font-bold resize-none leading-relaxed"
                  value={newLocation.baseText}
                  onChange={(e) =>
                    setNewLocation({ ...newLocation, baseText: e.target.value })
                  }
                />
              </div>
            </div>
            {/* Footer */}
            <div className="p-4 shrink-0 border-t-2 border-[#a38c6d] flex gap-2">
              <button
                onClick={() => setIsLocModalOpen(false)}
                className="flex-1 bg-gray-400 text-white py-2 rounded font-bold"
              >
                취소
              </button>
              <button
                onClick={handleSaveLocation}
                className="flex-1 bg-[#5d4037] text-white py-2 rounded font-bold"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 서비스/활동 추가/수정 모달 */}
      {isActionModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100] p-4">
          <div className="bg-[#e9e0d2] w-full max-w-md rounded-xl border-4 border-[#5d4037] flex flex-col max-h-[85vh] shadow-2xl">
            {/* Header */}
            <div className="p-4 pb-3 shrink-0 border-b-2 border-[#a38c6d]">
              <h2 className="text-xl font-extrabold text-[#3e2723]">
                {actionData.id
                  ? '수정하기'
                  : actionType === 'service'
                  ? '서비스 추가'
                  : '활동 추가'}
              </h2>
            </div>

            {/* Body */}
            <div className="p-4 overflow-y-auto grow space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#3e2723] mb-1">
                  이름
                </label>
                <input
                  type="text"
                  className="w-full p-2 border rounded font-bold text-[#3e2723]"
                  value={actionData.name}
                  onChange={(e) =>
                    setActionData({ ...actionData, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#3e2723] mb-1">
                  설명 (장소 탭에서만 보임)
                </label>
                <textarea
                  className="w-full p-2 border rounded h-20 font-bold resize-none leading-relaxed text-[#3e2723]"
                  value={actionData.baseText}
                  onChange={(e) =>
                    setActionData({ ...actionData, baseText: e.target.value })
                  }
                />
              </div>

              <div className="flex justify-between items-center mt-2">
                <label className="font-extrabold text-[#3e2723]">
                  선택지 (비용+보상 세트)
                </label>
                <button
                  onClick={addOptionField}
                  className="bg-[#2e5c8a] text-white px-2 py-1 text-xs rounded font-bold"
                >
                  + 선택지 추가
                </button>
              </div>

              <div className="space-y-4 pb-2">
                {actionData.options.map((opt, oIdx) => (
                  <div
                    key={oIdx}
                    className="bg-[#c5b399] p-3 rounded border border-[#a38c6d] relative"
                  >
                    {actionData.options.length > 1 && (
                      <button
                        onClick={() => removeOptionField(oIdx)}
                        className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded font-bold"
                      >
                        삭제
                      </button>
                    )}

                    <div className="mb-3 mt-1">
                      <div className="flex gap-2 mb-1 items-center">
                        <span className="font-bold text-[#3e2723]">
                          비용 (Costs)
                        </span>
                        <button
                          onClick={() => addCostField(oIdx)}
                          className="bg-[#5d4037] text-white px-1.5 py-0.5 text-[10px] rounded font-bold"
                        >
                          + 비용 추가
                        </button>
                      </div>
                      <div className="flex gap-2 mb-1">
                        <span className="flex-1 text-xs font-bold text-[#3e2723] pl-1">
                          타입
                        </span>
                        <span className="w-16 text-xs font-bold text-[#3e2723] pl-1">
                          값
                        </span>
                      </div>
                      {opt.costs.map((cost, cIdx) => (
                        <div key={cIdx} className="flex gap-2 mb-1">
                          <input
                            type="text"
                            className="flex-1 p-1 border rounded font-bold text-sm"
                            value={cost.type}
                            onChange={(e) =>
                              handleCostChange(
                                oIdx,
                                cIdx,
                                'type',
                                e.target.value
                              )
                            }
                          />
                          <input
                            type="text"
                            className="w-16 p-1 border rounded font-bold text-sm"
                            value={cost.value}
                            onChange={(e) =>
                              handleCostChange(
                                oIdx,
                                cIdx,
                                'value',
                                e.target.value
                              )
                            }
                          />
                        </div>
                      ))}
                    </div>

                    <div>
                      <div className="flex gap-2 mb-1 items-center">
                        <span className="font-bold text-[#3e2723]">
                          보상 (Rewards)
                        </span>
                        <button
                          onClick={() => addRewardField(oIdx)}
                          className="bg-[#5d4037] text-white px-1.5 py-0.5 text-[10px] rounded font-bold"
                        >
                          + 보상 추가
                        </button>
                      </div>
                      {opt.rewards.map((reward, rIdx) => (
                        <div
                          key={rIdx}
                          className="bg-white bg-opacity-50 p-2 rounded border border-[#a38c6d] mb-2"
                        >
                          <div className="flex gap-3 mb-2 border-b border-gray-400 pb-2">
                            <label className="font-bold text-sm flex items-center gap-1">
                              <input
                                type="radio"
                                checked={reward.type === 'text'}
                                onChange={() =>
                                  handleRewardChange(oIdx, rIdx, 'type', 'text')
                                }
                              />{' '}
                              텍스트
                            </label>
                            <label className="font-bold text-sm flex items-center gap-1">
                              <input
                                type="radio"
                                checked={reward.type === 'item'}
                                onChange={() =>
                                  handleRewardChange(oIdx, rIdx, 'type', 'item')
                                }
                              />{' '}
                              아이템
                            </label>
                          </div>
                          {reward.type === 'text' ? (
                            <div>
                              <label className="block text-xs font-bold text-[#3e2723] mb-1">
                                텍스트 내용
                              </label>
                              <textarea
                                className="w-full p-2 border rounded font-bold resize-none h-16 text-sm"
                                value={reward.text}
                                onChange={(e) =>
                                  handleRewardChange(
                                    oIdx,
                                    rIdx,
                                    'text',
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex gap-2">
                                <label className="text-sm font-bold text-blue-800 flex items-center gap-1">
                                  <input
                                    type="radio"
                                    checked={reward.itemType === 'token'}
                                    onChange={() =>
                                      handleRewardChange(
                                        oIdx,
                                        rIdx,
                                        'itemType',
                                        'token'
                                      )
                                    }
                                  />{' '}
                                  토큰
                                </label>
                                <label className="text-sm font-bold text-red-800 flex items-center gap-1">
                                  <input
                                    type="radio"
                                    checked={reward.itemType === 'card'}
                                    onChange={() =>
                                      handleRewardChange(
                                        oIdx,
                                        rIdx,
                                        'itemType',
                                        'card'
                                      )
                                    }
                                  />{' '}
                                  카드
                                </label>
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-[#3e2723] mb-1">
                                  아이템 이름
                                </label>
                                <input
                                  type="text"
                                  className="w-full p-1.5 border rounded font-bold text-sm"
                                  value={reward.name}
                                  onChange={(e) =>
                                    handleRewardChange(
                                      oIdx,
                                      rIdx,
                                      'name',
                                      e.target.value
                                    )
                                  }
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-[#3e2723] mb-1">
                                  {reward.itemType === 'token'
                                    ? '판매금액'
                                    : '카드번호'}
                                </label>
                                <input
                                  type="text"
                                  className="w-full p-1.5 border rounded font-bold text-sm"
                                  value={reward.attr}
                                  onChange={(e) =>
                                    handleRewardChange(
                                      oIdx,
                                      rIdx,
                                      'attr',
                                      e.target.value
                                    )
                                  }
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-[#3e2723] mb-1">
                                  이미지 업로드
                                </label>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) =>
                                    handleRewardImageChange(oIdx, rIdx, e)
                                  }
                                  className="w-full text-xs font-bold mt-1"
                                />
                              </div>
                              {(reward.imagePreview || reward.imageUrl) && (
                                <div className="mt-2 flex items-end gap-3 p-2 bg-white rounded border border-gray-300">
                                  <img
                                    src={reward.imagePreview || reward.imageUrl}
                                    className="h-16 object-contain rounded border border-gray-400 bg-gray-50"
                                  />
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setPreviewImageUrl(
                                        reward.imagePreview || reward.imageUrl
                                      );
                                    }}
                                    className="text-xs bg-[#5d4037] text-white px-2 py-1 rounded font-bold shadow"
                                  >
                                    🔍 사진 크게 보기
                                  </button>
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

            {/* Footer */}
            <div className="p-4 shrink-0 border-t-2 border-[#a38c6d] flex gap-2">
              <button
                onClick={closeActionModal}
                disabled={isUploading}
                className="flex-1 bg-gray-400 text-white py-2 rounded font-bold shadow"
              >
                취소
              </button>
              <button
                onClick={handleSaveAction}
                disabled={isUploading}
                className="flex-1 bg-[#5d4037] text-[#e9e0d2] py-2 rounded font-bold shadow"
              >
                {isUploading ? '업로드 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === 이미지 확대 뷰어 모달 === */}
      {previewImageUrl && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[200] p-4"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <img
              src={previewImageUrl}
              alt="확대 이미지"
              className="max-w-full max-h-[85vh] object-contain rounded shadow-2xl border-2 border-[#c5b399]"
            />
            <button
              onClick={() => setPreviewImageUrl(null)}
              className="absolute -top-4 -right-4 bg-red-600 text-white w-8 h-8 rounded-full font-extrabold shadow-lg border-2 border-white flex items-center justify-center"
            >
              X
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
