import React, { useState, useEffect } from 'react';
import KakaoMap from '../components/KakaoMap';
import { supabase } from '../supabaseClient';

const formatCourseTitle = (title, duration) => {
  if (!title) return '';
  const clean = String(title).replace(/\s*[\(\（]\s*\d+\s*분\s*[\)\）]/g, '').trim();
  const min = Number(duration);
  return min && !isNaN(min) ? `${clean} (${min}분)` : clean;
};

// 🌿 피그마(Figma) 시안 04 ~ 08 기준 역곡/부천 추천 산책 코스 데이터
export const FIGMA_ROUTES = [
  {
    id: 'route-yeokgok-stream',
    title: '역곡천 산책 코스',
    region: '역곡동',
    durationMin: 25,
    distanceKm: 1.8,
    hasRestaurant: true,
    roadType: '평탄한 보행로 · 휴식 지점 2곳',
    waypoints: '역곡역 → 역곡천 → 식당 → 역곡역',
    startPoint: { name: '역곡역 북부', lat: 37.4851, lng: 126.8117 },
    destPoint: { name: '역곡역 복귀', lat: 37.4851, lng: 126.8117 },
    restaurant: {
      name: '소담 보리밥 (안심식당)',
      nutritionGrade: 'green',
      gradeLabel: '초록 안심 (저염·저당)',
      menu: '산채 나물 보리밥 정식',
      lat: 37.4795, lng: 126.8180
    },
    path: [
      { lat: 37.4851, lng: 126.8117 },
      { lat: 37.4832, lng: 126.8142 },
      { lat: 37.4815, lng: 126.8160 },
      { lat: 37.4795, lng: 126.8180 }, // 식당
      { lat: 37.4810, lng: 126.8150 },
      { lat: 37.4851, lng: 126.8117 }
    ]
  },
  {
    id: 'route-pureun-arboretum',
    title: '푸른수목원 순환 코스',
    region: '역곡동',
    durationMin: 28,
    distanceKm: 2.1,
    hasRestaurant: true,
    roadType: '평탄한 보행로 · 휴식 지점 1곳',
    waypoints: '수목원 입구 → 저수지 데크 → 온실 → 잔디광장',
    startPoint: { name: '푸른수목원 입구', lat: 37.4830, lng: 126.8250 },
    destPoint: { name: '잔디광장 쉼터', lat: 37.4850, lng: 126.8260 },
    restaurant: {
      name: '수목원 웰빙 쌈밥',
      nutritionGrade: 'green',
      gradeLabel: '초록 안심',
      menu: '우렁 된장 쌈밥',
      lat: 37.4838, lng: 126.8220
    },
    path: [
      { lat: 37.4851, lng: 126.8117 },
      { lat: 37.4840, lng: 126.8180 },
      { lat: 37.4830, lng: 126.8250 },
      { lat: 37.4820, lng: 126.8270 },
      { lat: 37.4835, lng: 126.8290 },
      { lat: 37.4850, lng: 126.8260 }
    ]
  },
  {
    id: 'route-catholic-univ',
    title: '가톨릭대 둘레길',
    region: '역곡동',
    durationMin: 23,
    distanceKm: 1.6,
    hasRestaurant: true,
    roadType: '경사진 보행로 · 휴식 지점 2곳',
    waypoints: '정문 → 성심관 → 숲길 산책로 → 후문',
    startPoint: { name: '가톨릭대 정문', lat: 37.4875, lng: 126.8030 },
    destPoint: { name: '후문 쉼터', lat: 37.4860, lng: 126.8000 },
    restaurant: {
      name: '대학가 건강 비빔밥',
      nutritionGrade: 'yellow',
      gradeLabel: '노랑 주의',
      menu: '돌솥 야채 비빔밥',
      lat: 37.4865, lng: 126.8070
    },
    path: [
      { lat: 37.4851, lng: 126.8117 },
      { lat: 37.4865, lng: 126.8070 },
      { lat: 37.4875, lng: 126.8030 },
      { lat: 37.4885, lng: 126.8015 },
      { lat: 37.4860, lng: 126.8000 }
    ]
  }
];

export default function WalkMapFlow({ onBackToAuth }) {
  // Figma 스텝: 'regionSelect' (화면 04) | 'courseSetting' (화면 05) | 'courseList' (화면 06) | 'courseDetail' (화면 07) | 'walking' (화면 08)
  const [step, setStep] = useState('regionSelect');
  const [searchRegion, setSearchRegion] = useState('역곡');
  const [selectedMinutes, setSelectedMinutes] = useState('25'); // '10' | '25' | '60'
  const [includeRestaurant, setIncludeRestaurant] = useState('yes'); // 'yes' | 'no'
  const [selectedRoute, setSelectedRoute] = useState(FIGMA_ROUTES[0]);

  // 산책 진행 타이머
  const [walkSeconds, setWalkSeconds] = useState(1122); // 00:18:42
  const [isSavedPin, setIsSavedPin] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    let timer = null;
    if (step === 'walking') {
      timer = setInterval(() => {
        setWalkSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step]);

  const formatTime = (secs) => {
    const h = String(Math.floor(secs / 3600)).padStart(2, '0');
    const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const showToastMsg = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  // 핀 저장
  const handleSavePin = async () => {
    setIsSavedPin(true);
    showToastMsg('📌 해당 코스가 내 핀에 저장되었습니다.');
    const currentUserId = localStorage.getItem('soyo-current-user-id');
    if (supabase && currentUserId && selectedRoute) {
      try {
        await supabase.from('saved_routes').insert([
          {
            user_id: currentUserId,
            title: selectedRoute.title,
            start_place_name: selectedRoute.startPoint?.name,
            start_lat: selectedRoute.startPoint?.lat,
            start_lng: selectedRoute.startPoint?.lng,
            dest_place_name: selectedRoute.destPoint?.name,
            dest_lat: selectedRoute.destPoint?.lat,
            dest_lng: selectedRoute.destPoint?.lng,
            has_restaurant: selectedRoute.hasRestaurant,
            duration_minutes: selectedRoute.durationMin,
            distance_meters: Math.round(selectedRoute.distanceKm * 1000),
            route_geojson: { type: 'LineString', coordinates: selectedRoute.path?.map((p) => [p.lng, p.lat]) }
          }
        ]);
      } catch (e) {
        // ignore
      }
    }
  };

  // 산책 완료
  const handleFinishWalk = async () => {
    const currentUserId = localStorage.getItem('soyo-current-user-id');
    if (supabase && currentUserId && selectedRoute) {
      try {
        await supabase.from('walk_records').insert([
          {
            user_id: currentUserId,
            destination_name: selectedRoute.destPoint?.name || selectedRoute.title,
            walk_duration_minutes: Math.round(walkSeconds / 60),
            walk_distance_km: 1.4,
            perceived_difficulty: '보통'
          }
        ]);
      } catch (e) {
        // ignore
      }
    }
    alert('🎉 산책이 완료되었습니다! 기록이 안전하게 저장되었습니다.');
    setStep('regionSelect');
    setWalkSeconds(0);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column', background: '#ffffff', overflow: 'hidden' }}>
      {/* ─────────────────────────────────────────────────────────── */}
      {/* 1. 지역 검색 및 지도 화면 (Figma No.04) */}
      {/* ─────────────────────────────────────────────────────────── */}
      {step === 'regionSelect' && (
        <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* 상단 헤더 */}
          <div style={{ padding: '16px 20px 12px', background: '#ffffff', zIndex: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827' }}>지역 검색</span>
              <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>1 / 3 산책할 지역을 선택하세요</span>
            </div>

            {/* 검색 인풋 박스 */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={searchRegion}
                onChange={(e) => setSearchRegion(e.target.value)}
                placeholder="산책할 지역 검색"
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 36px',
                  borderRadius: '10px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  outline: 'none',
                  background: '#f9fafb'
                }}
              />
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '14px' }}>
                🔍
              </span>
            </div>
          </div>

          {/* 메인 카카오 지도 영역 */}
          <div style={{ flex: 1, position: 'relative' }}>
            <KakaoMap selectedRoute={null} height="100%" />

            {/* 하단 플로팅 카드 */}
            <div style={{
              position: 'absolute',
              bottom: '16px',
              left: '16px',
              right: '16px',
              background: '#ffffff',
              borderRadius: '16px',
              padding: '18px 20px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              border: '1px solid #f3f4f6',
              zIndex: 20
            }}>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}>
                {searchRegion}역 주변
              </div>
              <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '14px' }}>
                지도에서 산책할 지역을 선택해 주세요.
              </div>

              <button
                type="button"
                onClick={() => setStep('courseSetting')}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  background: '#111827',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '15px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                이 지역 선택
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* 2. 코스 설정 화면 (Figma No.05) */}
      {/* ─────────────────────────────────────────────────────────── */}
      {step === 'courseSetting' && (
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
          <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <button type="button" onClick={() => setStep('regionSelect')} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', padding: 0 }}>
              ‹
            </button>
            <span style={{ fontSize: '17px', fontWeight: 'bold' }}>코스 설정</span>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>2 / 2 코스를 설정하세요</span>
          </header>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {/* 선택한 지역 */}
            <div>
              <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>선택한 지역</div>
              <div style={{ fontSize: '17px', fontWeight: 'bold', color: '#111827' }}>{searchRegion}동</div>
            </div>

            {/* 산책 시간 */}
            <div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#111827', marginBottom: '10px' }}>
                산책 시간
              </div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                {['10', '25', '60'].map((min) => (
                  <button
                    key={min}
                    type="button"
                    onClick={() => setSelectedMinutes(min)}
                    style={{
                      flex: 1,
                      padding: '12px 0',
                      borderRadius: '10px',
                      border: selectedMinutes === min ? '2px solid #111827' : '1px solid #e5e7eb',
                      background: selectedMinutes === min ? '#111827' : '#ffffff',
                      color: selectedMinutes === min ? '#ffffff' : '#4b5563',
                      fontSize: '14px',
                      fontWeight: selectedMinutes === min ? 'bold' : 'normal',
                      cursor: 'pointer'
                    }}
                  >
                    약 {min}분
                  </button>
                ))}
              </div>
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>예상 시간은 약 ±3분 차이가 날 수 있어요.</div>
            </div>

            {/* 식당 여부 */}
            <div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#111827', marginBottom: '10px' }}>
                식당 여부
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[
                  { key: 'yes', label: '예' },
                  { key: 'no', label: '아니요' }
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setIncludeRestaurant(item.key)}
                    style={{
                      flex: 1,
                      padding: '12px 0',
                      borderRadius: '10px',
                      border: includeRestaurant === item.key ? '2px solid #111827' : '1px solid #e5e7eb',
                      background: includeRestaurant === item.key ? '#111827' : '#ffffff',
                      color: includeRestaurant === item.key ? '#ffffff' : '#4b5563',
                      fontSize: '14px',
                      fontWeight: includeRestaurant === item.key ? 'bold' : 'normal',
                      cursor: 'pointer'
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setStep('courseList')}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '12px',
              background: '#111827',
              color: '#ffffff',
              border: 'none',
              fontSize: '15px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            다음
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* 3. 추천 코스 목록 화면 (Figma No.06) */}
      {/* ─────────────────────────────────────────────────────────── */}
      {step === 'courseList' && (
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
          <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <button type="button" onClick={() => setStep('courseSetting')} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', padding: 0 }}>
              ‹
            </button>
            <span style={{ fontSize: '17px', fontWeight: 'bold' }}>추천 코스</span>
            <span style={{ width: '20px' }}></span>
          </header>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>
              조건에 맞는 {FIGMA_ROUTES.length}개의 코스를 찾았어요
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <span style={{ fontSize: '12px', background: '#f3f4f6', color: '#374151', padding: '4px 8px', borderRadius: '6px' }}>{searchRegion}동</span>
              <span style={{ fontSize: '12px', background: '#f3f4f6', color: '#374151', padding: '4px 8px', borderRadius: '6px' }}>약 {selectedMinutes}분</span>
              <span style={{ fontSize: '12px', background: '#f3f4f6', color: '#374151', padding: '4px 8px', borderRadius: '6px' }}>{includeRestaurant === 'yes' ? '식당 포함' : '산책만'}</span>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '16px' }}>
            {FIGMA_ROUTES.map((route) => (
              <div
                key={route.id}
                onClick={() => {
                  setSelectedRoute(route);
                  setStep('courseDetail');
                }}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '14px',
                  padding: '16px',
                  background: '#ffffff',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                }}
              >
                <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#111827', marginBottom: '6px' }}>
                  {formatCourseTitle(route.title, route.durationMin)}
                </div>
                <div style={{ fontSize: '13px', color: '#16a34a', fontWeight: 600, marginBottom: '4px' }}>
                  약 {route.durationMin}분 · {route.distanceKm}km · {route.hasRestaurant ? '식당 포함' : '산책만'}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  {route.roadType}
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', fontSize: '12px', color: '#9ca3af', marginTop: '8px' }}>
            코스를 선택하면 상세 경로를 볼 수 있어요
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* 4. 코스 상세 및 지도 보기 (Figma No.07) */}
      {/* ─────────────────────────────────────────────────────────── */}
      {step === 'courseDetail' && (
        <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* 상단 네비 */}
          <div style={{ position: 'absolute', top: '12px', left: '16px', right: '16px', display: 'flex', justifyContent: 'space-between', zIndex: 30 }}>
            <button
              type="button"
              onClick={() => setStep('courseList')}
              style={{
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '50%',
                width: '38px',
                height: '38px',
                display: 'grid',
                placeItems: 'center',
                fontSize: '18px',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
              }}
            >
              ‹
            </button>
            <button
              type="button"
              onClick={handleSavePin}
              style={{
                background: isSavedPin ? '#16a34a' : '#ffffff',
                color: isSavedPin ? '#ffffff' : '#374151',
                border: '1px solid #e5e7eb',
                borderRadius: '20px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
              }}
            >
              📌 {isSavedPin ? '저장됨' : '경로 저장'}
            </button>
          </div>

          {/* 지도 영역 */}
          <div style={{ flex: 1, position: 'relative' }}>
            <KakaoMap selectedRoute={selectedRoute} height="100%" />
          </div>

          {/* 하단 상세 시트 */}
          <div style={{
            background: '#ffffff',
            borderTopLeftRadius: '20px',
            borderTopRightRadius: '20px',
            padding: '20px',
            boxShadow: '0 -4px 16px rgba(0,0,0,0.08)',
            zIndex: 20
          }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}>
              {formatCourseTitle(selectedRoute.title, selectedRoute.durationMin)}
            </div>
            <div style={{ fontSize: '13px', color: '#16a34a', fontWeight: 600, marginBottom: '14px' }}>
              약 {selectedRoute.durationMin}분 · {selectedRoute.distanceKm}km · {selectedRoute.hasRestaurant ? '식당 포함' : '산책만'}
            </div>

            <div style={{ background: '#f9fafb', borderRadius: '10px', padding: '12px', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>주요 경유지</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{selectedRoute.waypoints}</div>
            </div>

            <button
              type="button"
              onClick={() => setStep('walking')}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                background: '#111827',
                color: '#ffffff',
                border: 'none',
                fontSize: '15px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              시작하기
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* 5. 산책 진행 화면 (Figma No.08) */}
      {/* ─────────────────────────────────────────────────────────── */}
      {step === 'walking' && (
        <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* 상단 진행 정보 카드 */}
          <div style={{
            position: 'absolute',
            top: '12px',
            left: '16px',
            right: '16px',
            background: '#ffffff',
            borderRadius: '14px',
            padding: '12px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 30
          }}>
            <div>
              <div style={{ fontSize: '11px', color: '#6b7280' }}>진행 시간</div>
              <div style={{ fontSize: '17px', fontWeight: 'bold', color: '#111827' }}>{formatTime(walkSeconds)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: '#6b7280' }}>이동 거리</div>
              <div style={{ fontSize: '17px', fontWeight: 'bold', color: '#16a34a' }}>1.4 km</div>
            </div>
          </div>

          {/* 지도 영역 */}
          <div style={{ flex: 1, position: 'relative' }}>
            <KakaoMap selectedRoute={selectedRoute} height="100%" />
          </div>

          {/* 하단 안내 및 완료 버튼 */}
          <div style={{
            background: '#ffffff',
            borderTopLeftRadius: '20px',
            borderTopRightRadius: '20px',
            padding: '18px 20px',
            boxShadow: '0 -4px 16px rgba(0,0,0,0.08)',
            zIndex: 20
          }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}>
              다음 안내: 120m 앞에서 오른쪽으로 이동
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
              현재 400m 남았습니다 (72% 완료)
            </div>

            {/* 프로그레스 바 */}
            <div style={{ width: '100%', height: '6px', background: '#f3f4f6', borderRadius: '3px', overflow: 'hidden', marginBottom: '14px' }}>
              <div style={{ width: '72%', height: '100%', background: '#16a34a', borderRadius: '3px' }}></div>
            </div>

            <button
              type="button"
              onClick={handleFinishWalk}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                background: '#16a34a',
                color: '#ffffff',
                border: 'none',
                fontSize: '15px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              산책 완료하기
            </button>
          </div>
        </div>
      )}

      {/* 토스트 메시지 */}
      {toast && (
        <div style={{
          position: 'absolute',
          top: '60px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(17, 24, 39, 0.9)',
          color: '#ffffff',
          padding: '8px 16px',
          borderRadius: '20px',
          fontSize: '13px',
          zIndex: 50
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}
