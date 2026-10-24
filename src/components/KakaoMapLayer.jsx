import React, { useEffect, useRef, useState } from 'react';
import { loadKakaoMaps } from '../lib/kakao';
import {
  DEFAULT_REGION,
  REGIONS,
  getRegionGeoPolygon,
  normalizedToLatLng,
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
        mapRef.current = map;

        const markReady = () => {
          if (cancelled || readyRef.current) return;
          readyRef.current = true;
          if (fallbackTimer) clearTimeout(fallbackTimer);
          setStatus('ready');
        };

        onTilesLoaded = () => {
          markReady();
          setTimeout(() => mapRef.current?.relayout(), 30);
        };
        kakao.maps.event.addListener(map, 'tilesloaded', onTilesLoaded);

        // 지도 타일이 실제로 그려지지 않으면(도메인 미등록 등) 일러스트 지도를 유지합니다.
        fallbackTimer = setTimeout(() => {
          if (!cancelled && !readyRef.current) setStatus('fallback');
        }, 5500);

        if (typeof ResizeObserver !== 'undefined') {
          observer = new ResizeObserver(() => mapRef.current?.relayout());
          observer.observe(containerRef.current);
        }

        setTimeout(() => {
          if (!cancelled) mapRef.current?.relayout();
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

      const bounds = new kakao.maps.LatLngBounds();
      path.forEach((point) => bounds.extend(point));
      try {
        map.setBounds(bounds, 56, 46, 190, 46);
      } catch {
        map.setBounds(bounds);
      }
      setTimeout(() => mapRef.current?.relayout(), 30);
    } else if (variant === 'search' && region?.polygon) {
      const polygonPath = getRegionGeoPolygon(region).map(
        (point) => new kakao.maps.LatLng(point.lat, point.lng),
      );
      if (polygonPath.length > 2) {
        addOverlay(
          new kakao.maps.Polygon({
            path: polygonPath,
            strokeWeight: 2,
            strokeColor: '#5FB294',
            strokeOpacity: 0.95,
            fillColor: '#B6EBFF',
            fillOpacity: 0.45,
            zIndex: 1,
          }),
        );
      }
      map.setCenter(new kakao.maps.LatLng(region.center.lat, region.center.lng));
      map.setLevel(variant === 'search' ? 4 : 5);
      if (variant === 'search' && polygonPath.length > 1) {
        addDot(polygonPath[0], 'kakao-dot--start');
        addDot(polygonPath[2] || polygonPath[1], 'kakao-dot--blue');
      }
    } else {
      const center = region?.center || DEFAULT_CENTER;
      map.setCenter(new kakao.maps.LatLng(center.lat, center.lng));
      map.setLevel(4);
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
