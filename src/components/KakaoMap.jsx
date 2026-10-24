import React, { useEffect, useRef, useState } from 'react';

// 카카오 지도 기본 중심 좌표 (부천 중앙공원 기준)
const DEFAULT_CENTER = { lat: 37.5028, lng: 126.7640 };

export default function KakaoMap({
  selectedRoute = null,
  onMarkerClick = null,
  height = '100%',
  style = {}
}) {
  const containerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const polylineRef = useRef(null);
  const markersRef = useRef([]);
  const overlaysRef = useRef([]);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationError, setLocationError] = useState('');

  // 1. 카카오 지도 SDK 초기화
  useEffect(() => {
    if (!window.kakao || !window.kakao.maps) {
      console.warn('⚠️ [KakaoMap] 카카오 지도 SDK를 불러오는 중입니다...');
      const checkInterval = setInterval(() => {
        if (window.kakao && window.kakao.maps) {
          clearInterval(checkInterval);
          initMap();
        }
      }, 200);
      return () => clearInterval(checkInterval);
    } else {
      initMap();
    }

    function initMap() {
      if (!containerRef.current || mapInstanceRef.current) return;

      const kakao = window.kakao;
      const options = {
        center: new kakao.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng),
        level: 4 // 기본 확대 레벨
      };

      const map = new kakao.maps.Map(containerRef.current, options);
      mapInstanceRef.current = map;
      setMapLoaded(true);
      console.log('✅ [KakaoMap] 카카오 지도 초기화 성공');

      // GPS 현재 위치 요청
      requestCurrentLocation(map);
    }
  }, []);

  // 2. 현재 GPS 위치 요청 및 마커 표시
  const requestCurrentLocation = (map = mapInstanceRef.current) => {
    if (!navigator.geolocation) {
      setLocationError('이 브라우저는 위치 정보를 지원하지 않습니다.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const currentPos = { lat: latitude, lng: longitude };
        setCurrentLocation(currentPos);
        setLocationError('');

        if (map && window.kakao) {
          const kakao = window.kakao;
          const locPosition = new kakao.maps.LatLng(latitude, longitude);

          // 현재 위치 커스텀 오버레이 (펄스 애니메이션 원형 뱃지)
          const content = `
            <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
              <div style="position: absolute; width: 24px; height: 24px; border-radius: 50%; background: rgba(34, 197, 94, 0.35); animation: pulse 2s infinite;"></div>
              <div style="width: 14px; height: 14px; border-radius: 50%; background: #16a34a; border: 2px solid #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.25);"></div>
            </div>
          `;

          const customOverlay = new kakao.maps.CustomOverlay({
            position: locPosition,
            content: content,
            yAnchor: 0.5,
            xAnchor: 0.5
          });

          customOverlay.setMap(map);
          overlaysRef.current.push(customOverlay);

          // 선택된 코스가 없을 때만 현재 위치로 지도 중심 이동
          if (!selectedRoute) {
            map.setCenter(locPosition);
          }
        }
      },
      (err) => {
        console.warn('⚠️ [KakaoMap] 위치 권한 미허용/오류:', err.message);
        setLocationError('위치 정보를 불러오지 못했습니다. 기본 지역(부천)으로 표시합니다.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // 3. 선택된 코스 변경 시 폴리라인 및 3단계 캡슐 마커 렌더링
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoaded || !window.kakao) return;
    const kakao = window.kakao;

    // 이전 폴리라인 및 마커/오버레이 제거
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];

    // 현재 위치 오버레이 다시 유지
    if (currentLocation) {
      const currentLocPos = new kakao.maps.LatLng(currentLocation.lat, currentLocation.lng);
      const curContent = `
        <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 24px; height: 24px; border-radius: 50%; background: rgba(34, 197, 94, 0.35);"></div>
          <div style="width: 14px; height: 14px; border-radius: 50%; background: #16a34a; border: 2px solid #ffffff;"></div>
        </div>
      `;
      const curOverlay = new kakao.maps.CustomOverlay({
        position: currentLocPos,
        content: curContent,
        yAnchor: 0.5,
        xAnchor: 0.5
      });
      curOverlay.setMap(map);
      overlaysRef.current.push(curOverlay);
    }

    if (!selectedRoute || !selectedRoute.path || selectedRoute.path.length === 0) return;

    // 폴리라인 경로 포인트 생성
    const linePath = selectedRoute.path.map((pt) => new kakao.maps.LatLng(pt.lat, pt.lng));
    const bounds = new kakao.maps.LatLngBounds();

    linePath.forEach((pt) => bounds.extend(pt));

    // 실보행 폴리라인 생성 (기획서 에메랄드 테마)
    const polyline = new kakao.maps.Polyline({
      path: linePath,
      strokeWeight: 6,
      strokeColor: '#16a34a',
      strokeOpacity: 0.85,
      strokeStyle: 'solid'
    });

    polyline.setMap(map);
    polylineRef.current = polyline;

    // A. 출발지 캡슐 마커
    if (selectedRoute.startPoint) {
      const startPos = new kakao.maps.LatLng(selectedRoute.startPoint.lat, selectedRoute.startPoint.lng);
      const startContent = `
        <div style="background: #1e293b; color: white; font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 4px; white-space: nowrap;">
          <span style="background: #22c55e; color: white; border-radius: 50%; width: 14px; height: 14px; display: flex; align-items: center; justify-content: center; font-size: 9px;">출</span>
          ${selectedRoute.startPoint.name}
        </div>
      `;
      const startOverlay = new kakao.maps.CustomOverlay({
        position: startPos,
        content: startContent,
        yAnchor: 1.3
      });
      startOverlay.setMap(map);
      overlaysRef.current.push(startOverlay);
      bounds.extend(startPos);
    }

    // B. 식당 마커 (안심 신호등 배지)
    if (selectedRoute.restaurant) {
      const rest = selectedRoute.restaurant;
      const restPos = new kakao.maps.LatLng(rest.lat, rest.lng);
      const gradeColor = rest.nutritionGrade === 'green' ? '#16a34a' : (rest.nutritionGrade === 'yellow' ? '#eab308' : '#ef4444');
      const gradeEmoji = rest.nutritionGrade === 'green' ? '🟢' : (rest.nutritionGrade === 'yellow' ? '🟡' : '🔴');

      const restContent = `
        <div style="background: #ffffff; color: #1f2937; border: 2px solid ${gradeColor}; font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 12px; box-shadow: 0 3px 8px rgba(0,0,0,0.25); display: flex; align-items: center; gap: 4px; white-space: nowrap; cursor: pointer;">
          <span>${gradeEmoji}</span>
          <span>${rest.name}</span>
        </div>
      `;
      const restOverlay = new kakao.maps.CustomOverlay({
        position: restPos,
        content: restContent,
        yAnchor: 1.3
      });
      restOverlay.setMap(map);
      overlaysRef.current.push(restOverlay);
      bounds.extend(restPos);
    }

    // C. 도착지 캡슐 마커
    if (selectedRoute.destPoint) {
      const destPos = new kakao.maps.LatLng(selectedRoute.destPoint.lat, selectedRoute.destPoint.lng);
      const destContent = `
        <div style="background: #0f172a; color: white; font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 4px; white-space: nowrap;">
          <span style="background: #ef4444; color: white; border-radius: 50%; width: 14px; height: 14px; display: flex; align-items: center; justify-content: center; font-size: 9px;">도</span>
          ${selectedRoute.destPoint.name}
        </div>
      `;
      const destOverlay = new kakao.maps.CustomOverlay({
        position: destPos,
        content: destContent,
        yAnchor: 1.3
      });
      destOverlay.setMap(map);
      overlaysRef.current.push(destOverlay);
      bounds.extend(destPos);
    }

    // 경로 전체가 지도 화면에 들어오도록 줌/패닝 자동 조절
    map.setBounds(bounds);
  }, [selectedRoute, mapLoaded, currentLocation]);

  // 내 위치 버튼 클릭 핸들러
  const handleMoveToCurrentLocation = () => {
    if (currentLocation && mapInstanceRef.current && window.kakao) {
      const moveLatLon = new window.kakao.maps.LatLng(currentLocation.lat, currentLocation.lng);
      mapInstanceRef.current.panTo(moveLatLon);
    } else {
      requestCurrentLocation();
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height, overflow: 'hidden', ...style }}>
      {/* 지도 렌더링 컨테이너 */}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* 로딩 인디케이터 */}
      {!mapLoaded && (
        <div style={{ position: 'absolute', inset: 0, background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', zIndex: 10 }}>
          <div style={{ width: '28px', height: '28px', border: '3px solid #e2e8f0', borderTopColor: '#16a34a', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ fontSize: '13px', color: '#64748b' }}>지도를 불러오는 중입니다...</span>
        </div>
      )}

      {/* 내 위치로 이동 플로팅 버튼 */}
      {mapLoaded && (
        <button
          type="button"
          onClick={handleMoveToCurrentLocation}
          title="내 위치로 이동"
          style={{
            position: 'absolute',
            bottom: '20px',
            right: '16px',
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 3px 8px rgba(0,0,0,0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 15
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="3 11 22 2 13 21 11 13 3 11" />
          </svg>
        </button>
      )}

      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.95); opacity: 0.8; }
          50% { transform: scale(1.6); opacity: 0.2; }
          100% { transform: scale(0.95); opacity: 0.8; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
