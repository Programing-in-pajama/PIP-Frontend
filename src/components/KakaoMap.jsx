import React, { useEffect, useRef, useState } from 'react';
import Icon from './Icons';

// 카카오 지도 기본 중심 좌표 (역곡역 기준 - 피그마 시안)
const DEFAULT_CENTER = { lat: 37.4851, lng: 126.8117 };

export default function KakaoMap({
  selectedRoute = null,
  height = '100%',
  style = {}
}) {
  const containerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const polylineRef = useRef(null);
  const markersRef = useRef([]);
  const overlaysRef = useRef([]);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [currentLocation, setCurrentLocation] = useState(null);

  useEffect(() => {
    let isMounted = true;
    let timeoutId = null;

    const startInit = () => {
      // 1. 이미 kakao.maps 가 존재할 때
      if (window.kakao && window.kakao.maps) {
        window.kakao.maps.load(() => {
          if (isMounted) initKakaoMap();
        });
        return;
      }

      // 2. 스크립트 로드 대기 (최대 4초)
      let count = 0;
      const interval = setInterval(() => {
        count += 1;
        if (window.kakao && window.kakao.maps) {
          clearInterval(interval);
          window.kakao.maps.load(() => {
            if (isMounted) initKakaoMap();
          });
        } else if (count > 25) { // 5초 초과
          clearInterval(interval);
          if (isMounted) {
            setLoadError('카카오 지도 로드 지연: 카카오 디벨로퍼스의 [플랫폼] → [Web] 사이트 도메인 등록을 확인해주세요.');
          }
        }
      }, 200);
    };

    startInit();

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  function initKakaoMap() {
    if (!containerRef.current || mapInstanceRef.current || !window.kakao || !window.kakao.maps) return;

    try {
      const kakao = window.kakao;
      const options = {
        center: new kakao.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng),
        level: 4
      };

      const map = new kakao.maps.Map(containerRef.current, options);
      mapInstanceRef.current = map;
      setMapLoaded(true);
      setLoadError('');
      console.log('✅ [KakaoMap] 카카오 지도 초기화 완료');

      // 리사이즈/레이아웃 보정
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.relayout();
          mapInstanceRef.current.setCenter(new kakao.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng));
        }
      }, 300);

      // GPS 현재 위치 요청
      requestGPSLocation(map);
    } catch (err) {
      console.error('❌ [KakaoMap] 지도 초기화 오류:', err);
      setLoadError('지도를 렌더링하는 중 오류가 발생했습니다: ' + err.message);
    }
  }

  // GPS 위치 요청
  const requestGPSLocation = (map = mapInstanceRef.current) => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCurrentLocation({ lat: latitude, lng: longitude });

        if (map && window.kakao) {
          const kakao = window.kakao;
          const locPosition = new kakao.maps.LatLng(latitude, longitude);

          // 현재 위치 펄스 오버레이
          const content = `
            <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
              <div style="position: absolute; width: 24px; height: 24px; border-radius: 50%; background: rgba(34, 197, 94, 0.4); animation: pulse 2s infinite;"></div>
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
        }
      },
      (err) => {
        console.warn('위치 권한 대기:', err.message);
      },
      { timeout: 8000 }
    );
  };

  // 선택된 코스 변경 시 폴리라인 및 캡슐 마커 표시
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoaded || !window.kakao) return;
    const kakao = window.kakao;

    // 이전 선 및 마커 정리
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];

    if (!selectedRoute || !selectedRoute.path || selectedRoute.path.length === 0) {
      map.setCenter(new kakao.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng));
      return;
    }

    const linePath = selectedRoute.path.map((pt) => new kakao.maps.LatLng(pt.lat, pt.lng));
    const bounds = new kakao.maps.LatLngBounds();
    linePath.forEach((pt) => bounds.extend(pt));

    // 보행로 폴리라인 (초록색)
    const polyline = new kakao.maps.Polyline({
      path: linePath,
      strokeWeight: 6,
      strokeColor: '#16a34a',
      strokeOpacity: 0.9,
      strokeStyle: 'solid'
    });
    polyline.setMap(map);
    polylineRef.current = polyline;

    // A. 출발지 마커
    if (selectedRoute.startPoint) {
      const startPos = new kakao.maps.LatLng(selectedRoute.startPoint.lat, selectedRoute.startPoint.lng);
      const startOverlay = new kakao.maps.CustomOverlay({
        position: startPos,
        content: `
          <div style="background: #111827; color: #fff; font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 4px; white-space: nowrap;">
            <span style="background: #22c55e; color: #fff; border-radius: 50%; width: 14px; height: 14px; display: flex; align-items: center; justify-content: center; font-size: 9px;">출</span>
            ${selectedRoute.startPoint.name}
          </div>
        `,
        yAnchor: 1.3
      });
      startOverlay.setMap(map);
      overlaysRef.current.push(startOverlay);
      bounds.extend(startPos);
    }

    // B. 식당 마커 (안심 신호등)
    if (selectedRoute.restaurant) {
      const rest = selectedRoute.restaurant;
      const restPos = new kakao.maps.LatLng(rest.lat, rest.lng);
      const restOverlay = new kakao.maps.CustomOverlay({
        position: restPos,
        content: `
          <div style="background: #ffffff; color: #111827; border: 2px solid #16a34a; font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 12px; box-shadow: 0 3px 8px rgba(0,0,0,0.2); display: flex; align-items: center; gap: 4px; white-space: nowrap;">
            <span>🟢</span>
            <span>${rest.name}</span>
          </div>
        `,
        yAnchor: 1.3
      });
      restOverlay.setMap(map);
      overlaysRef.current.push(restOverlay);
      bounds.extend(restPos);
    }

    // C. 도착지 마커
    if (selectedRoute.destPoint) {
      const destPos = new kakao.maps.LatLng(selectedRoute.destPoint.lat, selectedRoute.destPoint.lng);
      const destOverlay = new kakao.maps.CustomOverlay({
        position: destPos,
        content: `
          <div style="background: #111827; color: #fff; font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 4px; white-space: nowrap;">
            <span style="background: #ef4444; color: #fff; border-radius: 50%; width: 14px; height: 14px; display: flex; align-items: center; justify-content: center; font-size: 9px;">도</span>
            ${selectedRoute.destPoint.name}
          </div>
        `,
        yAnchor: 1.3
      });
      destOverlay.setMap(map);
      overlaysRef.current.push(destOverlay);
      bounds.extend(destPos);
    }

    map.setBounds(bounds);
  }, [selectedRoute, mapLoaded]);

  return (
    <div style={{ position: 'relative', width: '100%', height, overflow: 'hidden', ...style }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {!mapLoaded && !loadError && (
        <div style={{ position: 'absolute', inset: 0, background: '#f9fafb', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', zIndex: 10 }}>
          <div style={{ width: '28px', height: '28px', border: '3px solid #e5e7eb', borderTopColor: '#16a34a', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ fontSize: '13px', color: '#6b7280' }}>지도를 불러오는 중입니다...</span>
        </div>
      )}

      {loadError && (
        <div style={{ position: 'absolute', inset: 0, background: '#fef2f2', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center', zIndex: 10 }}>
          <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'center', color: '#dc2626' }}>
            <Icon name="alert" size={30} />
          </div>
          <div style={{ fontSize: '13px', color: '#b91c1c', fontWeight: 600, lineHeight: 1.5, marginBottom: '12px' }}>
            {loadError}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: 1.4, background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #fee2e2' }}>
            카카오 디벨로퍼스 콘솔의 <strong>[앱 설정] → [플랫폼] → [Web 플랫폼]</strong>에<br />
            <code>https://main.d3p7uoybais0cu.amplifyapp.com</code> 이 등록되어 있는지 확인해주세요.
          </div>
        </div>
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
