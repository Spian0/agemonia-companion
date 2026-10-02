// components/ImageCropperModal.js
'use client';
import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../utils/cropImage';

export default function ImageCropperModal({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete,
  cropShape = 'rect', // 'rect' (도시용) 또는 'round' (영웅용)
  initialAspect = 1,
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState(initialAspect);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropCompleteHandler = useCallback((_, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleConfirm = async () => {
    try {
      const { file, url } = await getCroppedImg(imageSrc, croppedAreaPixels);
      onCropComplete(file, url);
    } catch (e) {
      console.error(e);
      alert('이미지 처리에 실패했습니다.');
    }
  };

  if (!isOpen || !imageSrc) return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[300] p-4 font-serif select-none">
      <div className="bg-[#e9e0d2] w-full max-w-md rounded-xl border-4 border-[#5d4037] flex flex-col h-[75vh] shadow-2xl overflow-hidden">
        <div className="p-4 shrink-0 border-b-2 border-[#a38c6d] bg-[#c5b399]">
          <h2 className="text-xl font-extrabold text-[#3e2723]">
            {cropShape === 'round' ? '영웅 프로필 영역 맞추기' : '이미지 영역 맞추기'}
          </h2>
          <p className="text-xs text-[#5d4037] font-bold mt-1">
            {cropShape === 'round' 
              ? '원형 틀에 맞게 줌과 위치를 조절하세요.' 
              : '비율을 선택하고 영역을 조절하세요.'}
          </p>
        </div>
        
        {/* 모바일 터치 드래그/줌이 지원되는 크로퍼 영역 */}
        <div className="relative grow w-full bg-[#1a140f]">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            cropShape={cropShape}
            showGrid={cropShape === 'rect'}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropCompleteHandler}
          />
        </div>

        <div className="p-4 shrink-0 border-t-2 border-[#a38c6d] bg-[#c5b399]">
          {/* 도시(City) 페이지일 경우: 카드/토큰 형태에 맞춘 비율 선택지 제공 */}
          {cropShape === 'rect' && (
            <div className="flex gap-2 mb-4 justify-center">
              {[
                { label: '1:1 (토큰)', value: 1 },
                { label: '2:3 (카드 세로)', value: 2/3 },
                { label: '3:2 (카드 가로)', value: 3/2 },
              ].map((ratio) => (
                <button
                  key={ratio.label}
                  onClick={() => setAspect(ratio.value)}
                  className={`px-2 py-1 text-xs font-bold rounded border ${
                    aspect === ratio.value 
                      ? 'bg-[#5d4037] text-white border-[#3e2723]' 
                      : 'bg-[#e9e0d2] text-[#5d4037] border-[#a38c6d] shadow-sm'
                  }`}
                >
                  {ratio.label}
                </button>
              ))}
            </div>
          )}

          {/* 수동 줌 조절 바 (PC 마우스 사용자를 위한 보조 도구) */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm font-bold text-[#3e2723]">확대</span>
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.05}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-[#5d4037]"
            />
          </div>
          
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 bg-gray-400 text-white py-2 rounded font-bold shadow active:scale-95">취소</button>
            <button onClick={handleConfirm} className="flex-1 bg-[#5d4037] text-[#e9e0d2] py-2 rounded font-bold shadow border border-[#1a140f] active:scale-95">자르기</button>
          </div>
        </div>
      </div>
    </div>
  );
}