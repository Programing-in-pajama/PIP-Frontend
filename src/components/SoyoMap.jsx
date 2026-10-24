import React from 'react';
import KakaoMapLayer from './KakaoMapLayer';

// 디자인 시안과 같은 느낌의 일러스트 지도.
// 실제 지도 SDK 없이도 모든 화면에서 동일한 비율로 보이도록 SVG 로 그립니다.
const BLOCKS = [
  { x: 8, y: 18, w: 44, h: 68, fill: '#E4EDDF' },
  { x: 68, y: 8, w: 68, h: 44, fill: '#DDE9D7' },
  { x: 154, y: 20, w: 82, h: 62, fill: '#E6EFE1' },
  { x: 252, y: 10, w: 60, h: 74, fill: '#DCE9D6' },
  { x: 326, y: 24, w: 54, h: 62, fill: '#E4EDDF' },
  { x: 8, y: 112, w: 76, h: 78, fill: '#DDE9D7' },
  { x: 96, y: 108, w: 50, h: 56, fill: '#E6EFE1' },
  { x: 158, y: 118, w: 72, h: 70, fill: '#E1EBDC' },
  { x: 248, y: 112, w: 52, h: 50, fill: '#DDE9D7' },
  { x: 312, y: 118, w: 70, h: 76, fill: '#E6EFE1' },
  { x: 8, y: 222, w: 54, h: 82, fill: '#E6EFE1' },
  { x: 76, y: 208, w: 86, h: 60, fill: '#DDE9D7' },
  { x: 178, y: 218, w: 56, h: 78, fill: '#E4EDDF' },
  { x: 248, y: 206, w: 64, h: 64, fill: '#E6EFE1' },
  { x: 326, y: 212, w: 56, h: 80, fill: '#DDE9D7' },
  { x: 8, y: 334, w: 92, h: 64, fill: '#DDE9D7' },
  { x: 112, y: 330, w: 62, h: 48, fill: '#E6EFE1' },
  { x: 188, y: 342, w: 74, h: 70, fill: '#E1EBDC' },
  { x: 276, y: 328, w: 44, h: 58, fill: '#DDE9D7' },
  { x: 332, y: 336, w: 50, h: 72, fill: '#E6EFE1' },
  { x: 8, y: 436, w: 62, h: 92, fill: '#E6EFE1' },
  { x: 84, y: 428, w: 74, h: 68, fill: '#DDE9D7' },
  { x: 172, y: 452, w: 64, h: 62, fill: '#E4EDDF' },
  { x: 248, y: 438, w: 82, h: 54, fill: '#DDE9D7' },
  { x: 342, y: 432, w: 40, h: 84, fill: '#E6EFE1' },
  { x: 8, y: 554, w: 50, h: 58, fill: '#DDE9D7' },
  { x: 72, y: 552, w: 88, h: 62, fill: '#E6EFE1' },
  { x: 172, y: 548, w: 58, h: 52, fill: '#DDE9D7' },
  { x: 242, y: 556, w: 76, h: 54, fill: '#E4EDDF' },
  { x: 330, y: 546, w: 56, h: 66, fill: '#DDE9D7' },
];

const RIVER =
  'M-20 318 C 54 276, 96 350, 168 322 S 300 250, 420 300';

function RouteLine({ route }) {
  if (!route?.path?.length) return null;
  const points = route.path.map(([x, y]) => `${x},${y}`).join(' ');
  const start = route.path[0];
  const end = route.path[route.path.length - 1];
  return (
    <g>
      <polyline points={points} fill="none" stroke="#FFFFFF" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={points} fill="none" stroke="#4C9BE8" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={start[0]} cy={start[1]} r="8" fill="#EF5B5B" stroke="#FFFFFF" strokeWidth="3" />
      <circle cx={end[0]} cy={end[1]} r="7.5" fill="#5FB294" stroke="#FFFFFF" strokeWidth="3" />
    </g>
  );
}

export default function SoyoMap({
  variant = 'plain',
  route = null,
  region = null,
  showUser = false,
  className = '',
  children,
}) {
  const showRiver = variant === 'search';
  return (
    <div className={`soyo-map ${className}`}>
      <svg viewBox="0 0 390 620" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect width="390" height="620" fill="#F1F3EE" />

        {/* 도시 블록 */}
        <g>
          {BLOCKS.map((block, index) => (
            <rect
              key={index}
              x={block.x}
              y={block.y}
              width={block.w}
              height={block.h}
              rx="6"
              fill={block.fill}
            />
          ))}
        </g>

        {/* 큰 길 */}
        <g stroke="#FFFFFF" strokeLinecap="square" fill="none">
          <path d="M58 0v620" strokeWidth="16" />
          <path d="M148 0v620" strokeWidth="12" />
          <path d="M244 0v620" strokeWidth="18" />
          <path d="M342 0v620" strokeWidth="12" />
          <path d="M0 96h390" strokeWidth="14" />
          <path d="M0 200h390" strokeWidth="10" />
          <path d="M0 314h390" strokeWidth="18" />
          <path d="M0 414h390" strokeWidth="12" />
          <path d="M0 524h390" strokeWidth="16" />
          <path d="M0 608h390" strokeWidth="10" />
          <path d="M0 268h390" strokeWidth="6" opacity="0.9" />
          <path d="M0 372h390" strokeWidth="6" opacity="0.9" />
          <path d="M0 468h390" strokeWidth="6" opacity="0.9" />
        </g>

        {/* 산책로 느낌의 작은 길 */}
        <g stroke="#FBFCFA" strokeWidth="4" fill="none" opacity="0.9">
          <path d="M196 96v104M286 200v114M104 314v100M206 414v110M306 524v84" />
        </g>

        {showRiver && (
          <>
            <path d={RIVER} stroke="#DDF4FA" strokeWidth="34" fill="none" strokeLinecap="round" />
            <path d={RIVER} stroke="#B6EBFF" strokeWidth="18" fill="none" strokeLinecap="round" />
          </>
        )}

        {region?.polygon && (
          <g>
            <polygon points={region.polygon} fill="rgba(182, 235, 255, 0.55)" stroke="#5FB294" strokeWidth="2.4" />
            <circle cx="186" cy="232" r="8" fill="#4C9BE8" stroke="#FFFFFF" strokeWidth="3" />
            <circle cx="266" cy="300" r="7" fill="#EF5B5B" stroke="#FFFFFF" strokeWidth="3" />
          </g>
        )}

        <RouteLine route={route} />

        {showUser && (
          <g>
            <circle cx="176" cy="434" r="18" fill="rgba(239, 91, 91, 0.16)" />
            <circle cx="176" cy="434" r="7" fill="#EF5B5B" stroke="#FFFFFF" strokeWidth="3" />
          </g>
        )}

        {/* 지도 라벨 */}
        <g fill="#9BA69F" fontFamily="inherit" fontSize="9" fontWeight="600" letterSpacing="-0.2">
          <text x="68" y="52">역곡천</text>
          <text x="256" y="188">중앙로</text>
          <text x="20" y="406">부천로</text>
          <text x="252" y="594">소사로</text>
        </g>
      </svg>

      {/* 실제 카카오맵 (키/도메인/네트워크가 준비되면 자동으로 위에 표시) */}
      <KakaoMapLayer
        route={route}
        region={region}
        showUser={showUser}
        variant={variant}
      />

      {children}
    </div>
  );
}
