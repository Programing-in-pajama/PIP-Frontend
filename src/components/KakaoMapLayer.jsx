import React, { useEffect, useRef, useState } from 'react';
import { loadKakaoMaps, reverseGeocodeCoords } from '../lib/kakao';
import {
  DEFAULT_REGION,
  REGIONS,
  normalizedToLatLng,
  getRegionGeoPolygon,
} from '../data/routes';
import { getDistanceMeters, smoothAndDensifyPath } from '../utils/geo';

const DEFAULT_CENTER = DEFAULT_REGION.center;

function dotContent(className) {
  return `<div class="kakao-dot ${className}"></div>`;
}

function navMarkerContent(heading = 0) {
  return `
    <div class="soyo-nav-marker">
      <div class="soyo-nav-pulse"></div>
      <div class="soyo-nav-heading" style="transform: rotate(${Math.round(heading || 0)}deg);">
        <div class="soyo-nav-cone"></div>
        <div class="soyo-nav-arrow">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L20.5 20.5L12 16.5L3.5 20.5L12 2Z" fill="#1d4ed8" stroke="#ffffff" stroke-width="2.2" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>
    </div>
  `;
}

function homeMarkerContent() {
  return `
    <div class="soyo-gps-pulse-marker">
      <div class="soyo-gps-pulse-ring"></div>
      <div class="soyo-gps-pulse-dot"></div>
    </div>
  `;
}

export default function KakaoMapLayer({
  route = null,
  region = null,
  showUser = false,
  variant = 'plain',
  userPos = null,
  recenterKey = 0,
  navUserPos = null,
  navPathSplitIndex = 0,
  followUser = true,
  onUserDrag = null,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const overlaysRef = useRef([]);
  const homeUserMarkerRef = useRef(null);
  const navMarkerRef = useRef(null);
  const navTraveledPolylineRef = useRef(null);
  const navRemainingCasingRef = useRef(null);
  const navRemainingPolylineRef = useRef(null);
  const onUserDragRef = useRef(onUserDrag);
  const readyRef = useRef(false);
  const [status, setStatus] = useState('loading'); // loading | ready | fallback

  useEffect(() => {
    onUserDragRef.current = onUserDrag;
  }, [onUserDrag]);

  // 1) 지도 생성
  useEffect(() => {
    let cancelled = false;
    let map = null;
    let observer = null;
    let fallbackTimer = null;
    let onTilesLoaded = null;
    let onDragStart = null;

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

        onDragStart = () => {
          onUserDragRef.current?.();
        };
        kakao.maps.event.addListener(map, 'dragstart', onDragStart);

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
      if (map) {
        try {
          if (onTilesLoaded) window.kakao?.maps?.event?.removeListener(map, 'tilesloaded', onTilesLoaded);
          if (onDragStart) window.kakao?.maps?.event?.removeListener(map, 'dragstart', onDragStart);
        } catch {
          // ignore
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

      // 홈 내 위치 오버레이 정리
      if (homeUserMarkerRef.current) {
        try { homeUserMarkerRef.current.setMap(null); } catch {}
        homeUserMarkerRef.current = null;
      }

      // 네비 오버레이 정리
      if (navMarkerRef.current) {
        try { navMarkerRef.current.setMap(null); } catch {}
        navMarkerRef.current = null;
      }
      if (navTraveledPolylineRef.current) {
        try { navTraveledPolylineRef.current.setMap(null); } catch {}
        navTraveledPolylineRef.current = null;
      }
      if (navRemainingCasingRef.current) {
        try { navRemainingCasingRef.current.setMap(null); } catch {}
        navRemainingCasingRef.current = null;
      }
      if (navRemainingPolylineRef.current) {
        try { navRemainingPolylineRef.current.setMap(null); } catch {}
        navRemainingPolylineRef.current = null;
      }

      mapRef.current = null;
    };
  }, []);

  // 2) 코스 기본 정보/식당/경계선 정적 오버레이 표시
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

    const isNavigating = Boolean(navUserPos?.isNavigating);
    const routeRegion = REGIONS.find((item) => item.id === route?.regionId) || region || DEFAULT_REGION;
    const rawGeoPath = route?.geoPath?.length
      ? route.geoPath
      : (route?.path || []).map((point) => normalizedToLatLng(routeRegion, point));
    const geoPath = smoothAndDensifyPath(rawGeoPath);

    if (geoPath.length > 1) {
      const path = geoPath.map((point) => new kakao.maps.LatLng(point.lat, point.lng));

      // 🌿 내비게이션 진행 중이 아닐 때만 정적 전체 경로 폴리라인 표출 (네비 중에는 분할 동적 폴리라인이 그림)
      if (!isNavigating) {
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
      }

      addDot(path[0], 'kakao-dot--start');
      addDot(path[path.length - 1], 'kakao-dot--end');

      if (route?.restaurant && route.restaurant.lat && route.restaurant.lng) {
        const restPos = new kakao.maps.LatLng(route.restaurant.lat, route.restaurant.lng);
        const gradeColor =
          route.restaurant.nutritionGrade === 'green' || route.restaurant.grade === 'green'
            ? '#16a34a'
            : route.restaurant.nutritionGrade === 'red' || route.restaurant.grade === 'red'
              ? '#dc2626'
              : '#d97706';
        const gradeDot =
          route.restaurant.nutritionGrade === 'green' || route.restaurant.grade === 'green'
            ? '🟢'
            : route.restaurant.nutritionGrade === 'red' || route.restaurant.grade === 'red'
              ? '🔴'
              : '🟡';
        const badgeText = route.restaurant.badgeLabel || '안심식당';

        const restOverlay = new kakao.maps.CustomOverlay({
          position: restPos,
          content: `
            <div style="background: #ffffff; color: #111827; border: 2px solid ${gradeColor}; font-size: 11px; font-weight: 700; padding: 4px 9px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.18); display: flex; align-items: center; gap: 5px; white-space: nowrap; transform: translateY(-8px);">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${gradeColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle;"><path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2"/><path d="M15 11v11"/><path d="M5 2v20"/><path d="M5 2c2.5 0 4 1.5 4 4s-1.5 4-4 4"/></svg>
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

      // 내비 진행 중이 아닐 때만 전체 경로 맞춤 바운드 조절
      if (!isNavigating) {
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
      }

      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.relayout();
        }
      }, 30);
    } else {
      const activeRegion = region || DEFAULT_REGION;
      const boundaryPoints = getRegionGeoPolygon(activeRegion);
      const center =
        activeRegion?.center ||
        (boundaryPoints?.length > 0
          ? {
              lat: boundaryPoints.reduce((sum, p) => sum + p.lat, 0) / boundaryPoints.length,
              lng: boundaryPoints.reduce((sum, p) => sum + p.lng, 0) / boundaryPoints.length,
            }
          : DEFAULT_CENTER);
      const targetLatLng = new kakao.maps.LatLng(center.lat, center.lng);

      const cachedLat = Number(sessionStorage.getItem('soyo-location-lat'));
      const cachedLng = Number(sessionStorage.getItem('soyo-location-lng'));
      const isFallback = sessionStorage.getItem('soyo-location-is-fallback') === 'true';
      const cachedDong = sessionStorage.getItem('soyo-current-dong');
      const activeLat = userPos?.lat || (!isFallback && cachedLat ? cachedLat : null);
      const activeLng = userPos?.lng || (!isFallback && cachedLng ? cachedLng : null);
      const hasRealUserPos = Boolean(showUser && activeLat && activeLng);

      const effectiveTargetLatLng = hasRealUserPos
        ? new kakao.maps.LatLng(activeLat, activeLng)
        : targetLatLng;

      if (boundaryPoints && boundaryPoints.length > 2) {
        const polygonPath = boundaryPoints.map((p) => new kakao.maps.LatLng(p.lat, p.lng));

        const regionPolygon = new kakao.maps.Polygon({
          path: polygonPath,
          strokeWeight: 2.5,
          strokeColor: '#16a34a',
          strokeOpacity: 0.95,
          strokeStyle: 'solid',
          fillColor: '#22c55e',
          fillOpacity: 0.2,
          zIndex: 2,
        });
        addOverlay(regionPolygon);

        if (!hasRealUserPos) {
          const bounds = new kakao.maps.LatLngBounds();
          polygonPath.forEach((pt) => bounds.extend(pt));

          const clientW = containerRef.current?.clientWidth || 390;
          const clientH = containerRef.current?.clientHeight || 600;
          if (clientW > 250 && clientH > 350) {
            try {
              map.setBounds(bounds, 70, 28, 190, 28);
            } catch {
              map.setBounds(bounds);
            }
          } else {
            map.setBounds(bounds);
          }

          const currLevel = map.getLevel();
          if (currLevel > 5) {
            map.setLevel(5);
          } else if (currLevel < 3) {
            map.setLevel(4);
          }
        }
      }

      if (hasRealUserPos) {
        map.setCenter(effectiveTargetLatLng);
        map.setLevel(4);
      } else if (!boundaryPoints || boundaryPoints.length <= 2) {
        map.setCenter(targetLatLng);
        map.setLevel(4);
      }

      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.relayout();
        }
      }, 50);

      const initialRegionName = (hasRealUserPos && cachedDong) ? cachedDong : (activeRegion?.short || activeRegion?.name || '역곡1동');
      const regionMarker = new kakao.maps.CustomOverlay({
        position: effectiveTargetLatLng,
        content: `
          <div style="background: linear-gradient(135deg, #2f9a72 0%, #42b388 100%); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); color: #ffffff; font-size: 12px; font-weight: 700; padding: 6px 14px; border-radius: 22px; box-shadow: 0 6px 18px rgba(47, 154, 114, 0.32); border: 1.5px solid rgba(255, 255, 255, 0.5); display: flex; align-items: center; gap: 6px; white-space: nowrap; transform: translateY(-8px); pointer-events: none;">
            <span style="display:inline-block; width:7px; height:7px; border-radius:50%; background:#ffffff; box-shadow: 0 0 6px rgba(255, 255, 255, 0.9);"></span>
            <span class="soyo-region-label" style="letter-spacing: -0.2px;">🌿 ${initialRegionName} · 산책 권역</span>
          </div>
        `,
        xAnchor: 0.5,
        yAnchor: 1.0,
        zIndex: 7,
      });
      addOverlay(regionMarker);
    }

    return () => {
      overlaysRef.current.forEach((overlay) => overlay.setMap(null));
      overlaysRef.current = [];
    };
  }, [status, route?.id, region?.id, region?.name, showUser, variant, navUserPos?.isNavigating]);

  // 🌿 2.1) 홈/비내비게이션 모드에서 실시간 내 위치 펄스 마커 동적 렌더링
  useEffect(() => {
    const map = mapRef.current;
    const kakao = window.kakao;
    if (status !== 'ready' || !map || !kakao?.maps) return undefined;

    const isNavigating = Boolean(navUserPos?.isNavigating);
    if (!showUser || isNavigating) {
      if (homeUserMarkerRef.current) {
        homeUserMarkerRef.current.setMap(null);
        homeUserMarkerRef.current = null;
      }
      return undefined;
    }

    const cachedLat = Number(sessionStorage.getItem('soyo-location-lat'));
    const cachedLng = Number(sessionStorage.getItem('soyo-location-lng'));
    const isFallback = sessionStorage.getItem('soyo-location-is-fallback') === 'true';

    const activeLat = userPos?.lat || (!isFallback && cachedLat ? cachedLat : null);
    const activeLng = userPos?.lng || (!isFallback && cachedLng ? cachedLng : null);

    if (activeLat && activeLng && Number.isFinite(activeLat) && Number.isFinite(activeLng)) {
      const latLng = new kakao.maps.LatLng(activeLat, activeLng);
      if (!homeUserMarkerRef.current) {
        homeUserMarkerRef.current = new kakao.maps.CustomOverlay({
          position: latLng,
          content: homeMarkerContent(),
          xAnchor: 0.5,
          yAnchor: 0.5,
          zIndex: 10,
        });
        homeUserMarkerRef.current.setMap(map);
      } else {
        homeUserMarkerRef.current.setPosition(latLng);
      }
    } else {
      if (homeUserMarkerRef.current) {
        homeUserMarkerRef.current.setMap(null);
        homeUserMarkerRef.current = null;
      }
    }
    return undefined;
  }, [status, showUser, navUserPos?.isNavigating, userPos?.lat, userPos?.lng]);

  // 🌿 2.2) 내 위치 버튼 클릭 또는 recenterKey 변화 시 현재 위치로 부드럽게 이동
  useEffect(() => {
    const map = mapRef.current;
    const kakao = window.kakao;
    if (status !== 'ready' || !map || !kakao?.maps || !recenterKey) return;

    const cachedLat = Number(sessionStorage.getItem('soyo-location-lat'));
    const cachedLng = Number(sessionStorage.getItem('soyo-location-lng'));
    const isFallback = sessionStorage.getItem('soyo-location-is-fallback') === 'true';

    const activeLat = userPos?.lat || (!isFallback && cachedLat ? cachedLat : null);
    const activeLng = userPos?.lng || (!isFallback && cachedLng ? cachedLng : null);

    if (activeLat && activeLng && Number.isFinite(activeLat) && Number.isFinite(activeLng)) {
      const target = new kakao.maps.LatLng(activeLat, activeLng);
      map.panTo(target);
    }
  }, [recenterKey, status]);

  // 3) 🌿 실시간 보행 내비게이션 동적 렌더링 (위치 마커, 분할 경로선, 카메라 트래킹)
  useEffect(() => {
    const map = mapRef.current;
    const kakao = window.kakao;
    if (status !== 'ready' || !map || !kakao?.maps) return undefined;

    const isNavigating = Boolean(navUserPos?.isNavigating && navUserPos?.lat && navUserPos?.lng);

    if (!isNavigating) {
      if (navMarkerRef.current) {
        navMarkerRef.current.setMap(null);
        navMarkerRef.current = null;
      }
      if (navTraveledPolylineRef.current) {
        navTraveledPolylineRef.current.setMap(null);
        navTraveledPolylineRef.current = null;
      }
      if (navRemainingCasingRef.current) {
        navRemainingCasingRef.current.setMap(null);
        navRemainingCasingRef.current = null;
      }
      if (navRemainingPolylineRef.current) {
        navRemainingPolylineRef.current.setMap(null);
        navRemainingPolylineRef.current = null;
      }
      return undefined;
    }

    const userLatLng = new kakao.maps.LatLng(navUserPos.lat, navUserPos.lng);

    // 3.1) 실시간 위치 마커 (펄스 링 + 나침반 헤딩 화살표)
    if (!navMarkerRef.current) {
      navMarkerRef.current = new kakao.maps.CustomOverlay({
        position: userLatLng,
        content: navMarkerContent(navUserPos.heading),
        xAnchor: 0.5,
        yAnchor: 0.5,
        zIndex: 12,
      });
      navMarkerRef.current.setMap(map);
    } else {
      navMarkerRef.current.setPosition(userLatLng);
      navMarkerRef.current.setContent(navMarkerContent(navUserPos.heading));
    }

    // 3.2) 지나온 경로(회색) vs 앞으로 갈 경로(선명한 파란색) 분할 표출
    // 🌿 보행자 전용 도로망 좌표만 온전히 렌더링 (곡선 보간 & 건물 관통 일자선 차단)
    const rawNavPath = route?.geoPath || [];
    const geoPath = smoothAndDensifyPath(rawNavPath);
    if (geoPath.length > 1) {
      const splitIdx = Math.max(0, Math.min(geoPath.length - 1, navPathSplitIndex));

      // 지나온 경로: 출발점 ~ splitIdx (100% 보행자 도로망)
      const traveledPoints = geoPath
        .slice(0, splitIdx + 1)
        .map((p) => new kakao.maps.LatLng(p.lat, p.lng));

      // 앞으로 갈 경로: splitIdx ~ 도착점 (100% 보행자 도로망)
      const remainingPoints = geoPath
        .slice(splitIdx)
        .map((p) => new kakao.maps.LatLng(p.lat, p.lng));

      // 지나온 경로 (차분한 그레이)
      if (!navTraveledPolylineRef.current) {
        navTraveledPolylineRef.current = new kakao.maps.Polyline({
          map,
          path: traveledPoints,
          strokeWeight: 5,
          strokeColor: '#94a3b8',
          strokeOpacity: 0.75,
          strokeStyle: 'solid',
          zIndex: 2,
        });
      } else {
        navTraveledPolylineRef.current.setPath(traveledPoints);
      }

      // 앞으로 갈 경로 외곽 흰색 테두리 (가시성 극대화)
      if (!navRemainingCasingRef.current) {
        navRemainingCasingRef.current = new kakao.maps.Polyline({
          map,
          path: remainingPoints,
          strokeWeight: 11,
          strokeColor: '#ffffff',
          strokeOpacity: 0.95,
          strokeStyle: 'solid',
          zIndex: 3,
        });
      } else {
        navRemainingCasingRef.current.setPath(remainingPoints);
      }

      // 앞으로 갈 경로 (선명한 네비 블루)
      if (!navRemainingPolylineRef.current) {
        navRemainingPolylineRef.current = new kakao.maps.Polyline({
          map,
          path: remainingPoints,
          strokeWeight: 6.5,
          strokeColor: '#2563eb',
          strokeOpacity: 0.98,
          strokeStyle: 'solid',
          zIndex: 4,
        });
      } else {
        navRemainingPolylineRef.current.setPath(remainingPoints);
      }
    }

    // 3.3) Follow-Me 카메라 자동 추적
    if (followUser) {
      const startCoord = geoPath[0];
      const distFromStart = startCoord && navUserPos ? getDistanceMeters(navUserPos, startCoord) : 0;
      // 사용자가 코스 주변(1.5km 이내)에 있으면 사용자 실시간 위치 추적
      if (distFromStart <= 1500) {
        map.panTo(userLatLng);
        if (map.getLevel() > 3) {
          map.setLevel(3);
        }
      } else if (startCoord) {
        // 사용자가 멀리 떨어진 타 지역(예: 집에서 테스트 등)에 있을 경우 코스 전체가 있는 지역을 포커스
        map.panTo(new kakao.maps.LatLng(startCoord.lat, startCoord.lng));
      }
    }

    return undefined;
  }, [status, navUserPos, navPathSplitIndex, followUser, route]);

  return (
    <div
      ref={containerRef}
      className={`kakao-live-map ${status === 'ready' ? 'is-ready' : ''}`}
      data-status={status}
      aria-hidden={status !== 'ready'}
    />
  );
}
