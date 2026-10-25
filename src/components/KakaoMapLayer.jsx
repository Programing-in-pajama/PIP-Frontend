import React, { useEffect, useRef, useState } from 'react';
import { loadKakaoMaps } from '../lib/kakao';
import {
  DEFAULT_REGION,
  REGIONS,
  normalizedToLatLng,
  getRegionGeoPolygon,
} from '../data/routes';

const DEFAULT_CENTER = DEFAULT_REGION.center;

function dotContent(className) {
  return `<div class="kakao-dot ${className}"></div>`;
}

export default function KakaoMapLayer({ route = null, region = null, showUser = false, variant = 'plain' }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const overlaysRef = useRef([]);
  const readyRef = useRef(false);
  const [status, setStatus] = useState('loading'); // loading | ready | fallback

  // 1) 지도 생성
  useEffect(() => {
    let cancelled = false;
    let map = null;
    let observer = null;
    let fallbackTimer = null;
    let onTilesLoaded = null;

    loadKakaoMaps()
      .then((kakao) => {
        if (cancelled || !containerRef.current) return;
        const center = region?.center || DEFAULT_CENTER;
        map = new kakao.maps.Map(containerRef.current, {
          center: new kakao.maps.LatLng(center.lat, center.lng),
          level: 4,
        });
        map.setMinLevel(1);
        map.setMaxLevel(7);
        mapRef.current = map;

        const relayoutWithCenter = () => {
          if (!mapRef.current) return;
          const currCenter = mapRef.current.getCenter();
          mapRef.current.relayout();
          if (currCenter) {
            mapRef.current.setCenter(currCenter);
          }
        };

        const markReady = () => {
          if (cancelled || readyRef.current) return;
          readyRef.current = true;
          if (fallbackTimer) clearTimeout(fallbackTimer);
          setStatus('ready');
        };

        onTilesLoaded = () => {
          markReady();
          setTimeout(() => relayoutWithCenter(), 30);
        };
        kakao.maps.event.addListener(map, 'tilesloaded', onTilesLoaded);

        // 지도 타일이 실제로 그려지지 않으면(도메인 미등록 등) 일러스트 지도를 유지합니다.
        fallbackTimer = setTimeout(() => {
          if (!cancelled && !readyRef.current) setStatus('fallback');
        }, 5500);

        if (typeof ResizeObserver !== 'undefined') {
          observer = new ResizeObserver(() => relayoutWithCenter());
          observer.observe(containerRef.current);
        }

        setTimeout(() => {
          if (!cancelled) relayoutWithCenter();
        }, 120);
      })
      .catch(() => {
        if (!cancelled) setStatus('fallback');
      });

    return () => {
      cancelled = true;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      if (observer) observer.disconnect();
      if (map && onTilesLoaded) {
        try {
          window.kakao?.maps?.event?.removeListener(map, 'tilesloaded', onTilesLoaded);
        } catch {
          // 이미 정리된 지도는 무시합니다.
        }
      }
      overlaysRef.current.forEach((overlay) => {
        try {
          overlay.setMap(null);
        } catch {
          // ignore
        }
      });
      overlaysRef.current = [];
      mapRef.current = null;
    };
  }, []);

  // 2) 코스/지역/현재 위치 표시
  useEffect(() => {
    const map = mapRef.current;
    const kakao = window.kakao;
    if (status !== 'ready' || !map || !kakao?.maps) return undefined;

    overlaysRef.current.forEach((overlay) => overlay.setMap(null));
    overlaysRef.current = [];

    const addOverlay = (overlay) => {
      overlay.setMap(map);
      overlaysRef.current.push(overlay);
    };

    const addDot = (position, className) => {
      addOverlay(
        new kakao.maps.CustomOverlay({
          position,
          content: dotContent(className),
          xAnchor: 0.5,
          yAnchor: 0.5,
          zIndex: 5,
        }),
      );
    };

    const routeRegion = REGIONS.find((item) => item.id === route?.regionId) || region || DEFAULT_REGION;
    const geoPath = route?.geoPath?.length
      ? route.geoPath
      : (route?.path || []).map((point) => normalizedToLatLng(routeRegion, point));

    if (geoPath.length > 1) {
      const path = geoPath.map((point) => new kakao.maps.LatLng(point.lat, point.lng));

      addOverlay(
        new kakao.maps.Polyline({
          path,
          strokeWeight: 10,
          strokeColor: '#ffffff',
          strokeOpacity: 0.9,
          strokeStyle: 'solid',
          zIndex: 2,
        }),
      );
      addOverlay(
        new kakao.maps.Polyline({
          path,
          strokeWeight: 5,
          strokeColor: '#4C9BE8',
          strokeOpacity: 0.95,
          strokeStyle: 'solid',
          zIndex: 3,
        }),
      );

      addDot(path[0], 'kakao-dot--start');
      addDot(path[path.length - 1], 'kakao-dot--end');

      if (route?.restaurant && route.restaurant.lat && route.restaurant.lng) {
        const restPos = new kakao.maps.LatLng(route.restaurant.lat, route.restaurant.lng);
        const gradeColor = route.restaurant.nutritionGrade === 'green' || route.restaurant.grade === 'green' ? '#16a34a' : (route.restaurant.nutritionGrade === 'red' || route.restaurant.grade === 'red' ? '#dc2626' : '#d97706');
        const gradeDot = route.restaurant.nutritionGrade === 'green' || route.restaurant.grade === 'green' ? '🟢' : (route.restaurant.nutritionGrade === 'red' || route.restaurant.grade === 'red' ? '🔴' : '🟡');
        const badgeText = route.restaurant.badgeLabel || '안심식당';

        const restOverlay = new kakao.maps.CustomOverlay({
          position: restPos,
          content: `
            <div style="background: #ffffff; color: #111827; border: 2px solid ${gradeColor}; font-size: 11px; font-weight: 700; padding: 4px 9px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.18); display: flex; align-items: center; gap: 5px; white-space: nowrap; transform: translateY(-8px);">
              <span>🍴</span>
              <span>${route.restaurant.name}</span>
              <span style="background: ${gradeColor}18; color: ${gradeColor}; padding: 1px 6px; border-radius: 8px; font-size: 10px; font-weight: 800;">${gradeDot} ${badgeText}</span>
            </div>
          `,
          xAnchor: 0.5,
          yAnchor: 1.2,
          zIndex: 8,
        });
        addOverlay(restOverlay);
      }

      const bounds = new kakao.maps.LatLngBounds();
      path.forEach((point) => bounds.extend(point));

      const clientW = containerRef.current?.clientWidth || 390;
      const clientH = containerRef.current?.clientHeight || 600;
      if (clientW > 250 && clientH > 350) {
        try {
          map.setBounds(bounds, 50, 30, 160, 30);
        } catch {
          map.setBounds(bounds);
        }
      } else {
        map.setBounds(bounds);
      }

      if (map.getLevel() > 6) {
        map.setLevel(5);
      }

      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.relayout();
        }
      }, 30);
    } else {
      const activeRegion = region || DEFAULT_REGION;
      const boundaryPoints = getRegionGeoPolygon(activeRegion);
      const center = activeRegion?.center || (boundaryPoints?.length > 0 ? {
        lat: boundaryPoints.reduce((sum, p) => sum + p.lat, 0) / boundaryPoints.length,
        lng: boundaryPoints.reduce((sum, p) => sum + p.lng, 0) / boundaryPoints.length,
      } : DEFAULT_CENTER);
      const targetLatLng = new kakao.maps.LatLng(center.lat, center.lng);

      if (boundaryPoints && boundaryPoints.length > 2) {
        const polygonPath = boundaryPoints.map((p) => new kakao.maps.LatLng(p.lat, p.lng));

        // 고정밀 행정구역 경계선 (네모 박스가 아닌 실측 굴곡 행정동 폴리곤)
        // 외곽선: 선명한 초록색 (#16a34a, 2.5px), 내부: 부드러운 반투명 초록 채움 (#22c55e, 0.20)
        const regionPolygon = new kakao.maps.Polygon({
          path: polygonPath,
          strokeWeight: 2.5,
          strokeColor: '#16a34a',
          strokeOpacity: 0.95,
          strokeStyle: 'solid',
          fillColor: '#22c55e',
          fillOpacity: 0.20,
          zIndex: 2,
        });
        addOverlay(regionPolygon);

        // 영역 전체가 화면에 완벽하게 들어오도록 자동 줌/바운드 조절
        const bounds = new kakao.maps.LatLngBounds();
        polygonPath.forEach((pt) => bounds.extend(pt));

        const clientW = containerRef.current?.clientWidth || 390;
        const clientH = containerRef.current?.clientHeight || 600;
        if (clientW > 250 && clientH > 350) {
          try {
            // 상단 검색바/헤더 및 하단 시트(bottom sheet) 영역을 고려한 넉넉한 여백 배분
            map.setBounds(bounds, 70, 28, 190, 28);
          } catch {
            map.setBounds(bounds);
          }
        } else {
          map.setBounds(bounds);
        }

        // 최적 가시성 줌 레벨 범위 유지 (4~5)
        const currLevel = map.getLevel();
        if (currLevel > 5) {
          map.setLevel(5);
        } else if (currLevel < 3) {
          map.setLevel(4);
        }
      } else {
        map.setCenter(targetLatLng);
        map.setLevel(4);
      }

      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.relayout();
          if (boundaryPoints && boundaryPoints.length > 2) {
            const bounds = new kakao.maps.LatLngBounds();
            boundaryPoints.forEach((p) => bounds.extend(new kakao.maps.LatLng(p.lat, p.lng)));
            try {
              mapRef.current.setBounds(bounds, 70, 28, 190, 28);
            } catch {
              mapRef.current.setBounds(bounds);
            }
            const lvl = mapRef.current.getLevel();
            if (lvl > 5) mapRef.current.setLevel(5);
            else if (lvl < 3) mapRef.current.setLevel(4);
          } else {
            mapRef.current.setCenter(targetLatLng);
          }
        }
      }, 50);

      // 선택된 지역 중심에 직관적이고 세련된 위치 배지 마커 표시
      const regionName = activeRegion?.short || activeRegion?.name || '역곡1동';
      const regionMarker = new kakao.maps.CustomOverlay({
        position: targetLatLng,
        content: `
          <div style="background: rgba(17, 24, 39, 0.92); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); color: #ffffff; font-size: 11.5px; font-weight: 700; padding: 5px 13px; border-radius: 20px; box-shadow: 0 4px 16px rgba(0,0,0,0.22); border: 1.5px solid #22c55e; display: flex; align-items: center; gap: 6px; white-space: nowrap; transform: translateY(-8px); pointer-events: none;">
            <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#22c55e; box-shadow: 0 0 6px #22c55e;"></span>
            <span>🌿 ${regionName} · 산책 권역</span>
          </div>
        `,
        xAnchor: 0.5,
        yAnchor: 1.0,
        zIndex: 7,
      });
      addOverlay(regionMarker);
    }

    if (showUser) {
      const cached = {
        lat: Number(sessionStorage.getItem('soyo-location-lat')),
        lng: Number(sessionStorage.getItem('soyo-location-lng')),
      };
      const drawUser = (lat, lng) => {
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        addDot(new kakao.maps.LatLng(lat, lng), 'kakao-dot--user');
      };
      if (cached.lat && cached.lng) {
        drawUser(cached.lat, cached.lng);
      } else if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => drawUser(position.coords.latitude, position.coords.longitude),
          () => {},
          { timeout: 6000, maximumAge: 300000 },
        );
      }
    }

    return () => {
      overlaysRef.current.forEach((overlay) => overlay.setMap(null));
      overlaysRef.current = [];
    };
  }, [status, route, region, showUser, variant]);

  return (
    <div
      ref={containerRef}
      className={`kakao-live-map ${status === 'ready' ? 'is-ready' : ''}`}
      data-status={status}
      aria-hidden={status !== 'ready'}
    />
  );
}
