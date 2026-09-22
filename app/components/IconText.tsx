/* eslint-disable @next/next/no-img-element */
import React from 'react';

// 폴더 구조에 맞게 아이콘 주소 매핑
const iconMap: any = {
  '[action]': '/icons/action.png',
  '[dice]': '/icons/dice.png',
  '[shield]': '/icons/shield.png',
  '[special_dice]': '/icons/special_dice.png',
  '[star]': '/icons/star.png',
  '[stamina]': '/icons/stamina.png',
  '[hp]': '/icons/hp.png',
};

export default function IconText({ text }: { text: string }) {
  if (!text || typeof text !== 'string') return <>{text}</>;

  const parts = text.split(/(\[[a-zA-Z0-9_]+\])/g);

  return (
    <span className="whitespace-pre-wrap break-keep">
      {parts.map((part, index) => {
        if (iconMap[part]) {
          return (
            <img
              key={index}
              src={iconMap[part]}
              alt={part}
              // Tailwind의 위치 조작(relative, top, margin 등)을 모두 제거하고
              // 글자 크기에 비례(em) + 텍스트 중앙선(align-middle)에 자동 안착시킵니다.
              className="inline-block w-[1.2em] h-[1.2em] align-middle mx-[0.1em] bg-transparent border-none"
            />
          );
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </span>
  );
}