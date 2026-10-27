import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Icon from '../components/Icons';
import Sheet from '../components/Sheet';
import SoyoMap from '../components/SoyoMap';
import { supabase } from '../supabaseClient';
import { DEFAULT_REGION, REGIONS, WALK_MINUTES, getRoutes, isSupportedRegion } from '../data/routes';
import { fetchRecommendedRoutes } from '../api/routes';
import { formatClock, formatDistance } from '../utils/format';
import {
  getDistanceMeters,
  getBearing,
  getCumulativeDistances,
  snapToPath,
  buildRouteWaypoints,
  getNextNavigationGuidance,
  realignLoopRoute,
} from '../utils/geo';
import {
  createPinFolder,
  fetchPinFolders,
  getPinFolders,
  isRoutePinned,
  removeRoutePinEverywhere,
  saveRoutePin,
} from '../api/pins';
import { reverseGeocodeCoords } from '../lib/kakao';

function buildUserRegion(dong, fullName, lat, lng) {
  return {
    id: 'my-location',
    name: fullName || `${dong} 주변`,
    short: dong,
    distanceKm: 0,
    center: { lat: Number(lat), lng: Number(lng) },
    polygon: '118,205 292,118 342,250 176,330',
  };
}

function renderManeuverIcon(maneuver) {
  switch (maneuver) {
    case 'turn-left':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 19V11a4 4 0 0 0-4-4H5" />
          <polyline points="9 3 5 7 9 11" />
        </svg>
      );
    case 'turn-right':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 19V11a4 4 0 0 1 4-4h10" />
          <polyline points="15 3 19 7 15 11" />
        </svg>
      );
    case 'crosswalk':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19h16M4 15h16M4 11h16M4 7h16" />
        </svg>
      );
    case 'restaurant':
      return <Icon name="utensils" size={22} />;
    case 'destination':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" fill="currentColor" fillOpacity="0.2" />
          <line x1="4" y1="22" x2="4" y2="15" />
        </svg>
      );
    default:
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="19" x2="12" y2="5" />
          <polyline points="5 12 12 5 19 12" />
        </svg>
      );
  }
}

export function formatCourseTitle(title, durationMin) {
  if (!title) return '';
  const clean = String(title).replace(/\s*[\(\（]\s*\d+\s*분\s*[\)\）]/g, '').trim();
  const min = Number(durationMin);
  return min && !isNaN(min) ? `${clean} (${min}분)` : clean;
}

export default function WalkFlow({
  isLoggedIn,
  userId = 'guest',
  startRoute = null,
  homeResetTrigger = 0,
  onRequireLogin,
  onSectionChange,
}) {
  const userProfile = useMemo(() => {
    try {
      const saved = localStorage.getItem('soyo-user-profile');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }, [userId, isLoggedIn]);

  const userDiseases = useMemo(() => {
    return userProfile?.diseaseIds || userProfile?.chronicConditions || [];
  }, [userProfile]);

  const [step, setStep] = useState(startRoute ? 'walking' : 'home');
  const [userGps, setUserGps] = useState(() => {
    const isFallback = sessionStorage.getItem('soyo-location-is-fallback') === 'true';
    const cachedLat = Number(sessionStorage.getItem('soyo-location-lat'));
    const cachedLng = Number(sessionStorage.getItem('soyo-location-lng'));
    if (!isFallback && cachedLat && cachedLng) {
      return { lat: cachedLat, lng: cachedLng };
    }
    return null;
  });
  const [homeRecenterKey, setHomeRecenterKey] = useState(0);

  const [region, setRegion] = useState(() => {
    const isFallback = sessionStorage.getItem('soyo-location-is-fallback') === 'true';
    const cachedDong = sessionStorage.getItem('soyo-current-dong');
    const cachedAddr = sessionStorage.getItem('soyo-current-address');
    const cachedLat = Number(sessionStorage.getItem('soyo-location-lat'));
    const cachedLng = Number(sessionStorage.getItem('soyo-location-lng'));
    if (!isFallback && cachedDong && cachedLat && cachedLng) {
      const userReg = buildUserRegion(cachedDong, cachedAddr, cachedLat, cachedLng);
      if (isSupportedRegion(userReg)) {
        return userReg;
      }
    }
    return DEFAULT_REGION;
  });
  const [detectedRegion, setDetectedRegion] = useState(() => {
    const isFallback = sessionStorage.getItem('soyo-location-is-fallback') === 'true';
    const cachedDong = sessionStorage.getItem('soyo-current-dong');
    const cachedAddr = sessionStorage.getItem('soyo-current-address');
    const cachedLat = Number(sessionStorage.getItem('soyo-location-lat'));
    const cachedLng = Number(sessionStorage.getItem('soyo-location-lng'));
    if (!isFallback && cachedDong && cachedLat && cachedLng) {
      return buildUserRegion(cachedDong, cachedAddr, cachedLat, cachedLng);
    }
    return null;
  });
  const [regionQuery, setRegionQuery] = useState('');
  const [minutes, setMinutes] = useState(25);
  const [includeRestaurant, setIncludeRestaurant] = useState(true);
  const [routes, setRoutes] = useState(() => {
    const isFallback = sessionStorage.getItem('soyo-location-is-fallback') === 'true';
    const cachedDong = sessionStorage.getItem('soyo-current-dong');
    const cachedAddr = sessionStorage.getItem('soyo-current-address');
    const cachedLat = Number(sessionStorage.getItem('soyo-location-lat'));
    const cachedLng = Number(sessionStorage.getItem('soyo-location-lng'));
    const initialReg = (!isFallback && cachedDong && cachedLat && cachedLng)
      ? buildUserRegion(cachedDong, cachedAddr, cachedLat, cachedLng)
      : DEFAULT_REGION;
    const finalReg = isSupportedRegion(initialReg) ? initialReg : DEFAULT_REGION;
    return getRoutes(finalReg, 25, userDiseases);
  });
  const [routeSort, setRouteSort] = useState('recommend'); // 'recommend' | 'duration' | 'distance'
  const [selectedRoute, setSelectedRoute] = useState(startRoute);
  const [walkSeconds, setWalkSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [pinVersion, setPinVersion] = useState(0);
  const [toast, setToast] = useState('');
  const [loginPrompt, setLoginPrompt] = useState(false);
  const [folderSelectRoute, setFolderSelectRoute] = useState(null);
  const [showComplete, setShowComplete] = useState(false);
  const [showNutritionDetail, setShowNutritionDetail] = useState(false);

  // ── 🌿 실시간 보행 내비게이션 상태 및 엔진 ─────────────────────────────
  const [navMode, setNavMode] = useState('gps'); // 'gps' | 'simulation'
  const [followUser, setFollowUser] = useState(true);
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const [navUserPos, setNavUserPos] = useState(null);
  const [navPathSplitIndex, setNavPathSplitIndex] = useState(0);
  const [liveMovedKm, setLiveMovedKm] = useState(0);
  const [liveRemainingMeters, setLiveRemainingMeters] = useState(0);
  const [liveProgress, setLiveProgress] = useState(0);
  const [currentGuidance, setCurrentGuidance] = useState(null);
  const [gpsDistanceMeters, setGpsDistanceMeters] = useState(0);

  const lastGpsPointRef = useRef(null);
  const totalGpsDistanceRef = useRef(0);
  const lastPosRef = useRef(null);
  const lastHeadingRef = useRef(0);
  const lastSpokenIndexRef = useRef(-1);
  const hasAnnouncedArrivalRef = useRef(false);
  const cachedDistancesRef = useRef(null);
  const simIndexRef = useRef(0);
  const sessionStartSnapDistanceRef = useRef(null);
  const lastAppliedDongRef = useRef('');

  const turnWaypoints = useMemo(() => {
    if (!selectedRoute?.geoPath) return [];
    return buildRouteWaypoints(selectedRoute);
  }, [selectedRoute]);

  useEffect(() => {
    if (selectedRoute?.geoPath) {
      cachedDistancesRef.current = getCumulativeDistances(selectedRoute.geoPath);
    }
  }, [selectedRoute]);

  const speakInstruction = useCallback(
    (text) => {
      if (isVoiceMuted || typeof window === 'undefined' || !window.speechSynthesis) return;
      try {
        window.speechSynthesis.cancel();
        const clean = text
          .replace(/GS25/g, '지에스 이십오')
          .replace(/CU/g, '씨유')
          .replace(/IBK/g, '기업은행')
          .replace(/MGC/g, '엠지씨')
          .replace(/후\s+/g, '한 뒤 ');
        const utter = new SpeechSynthesisUtterance(clean);
        utter.lang = 'ko-KR';
        utter.rate = 1.05;
        utter.pitch = 1.0;
        window.speechSynthesis.speak(utter);
      } catch {
        // speech synthesis not available or blocked
      }
    },
    [isVoiceMuted]
  );

  const handlePositionUpdate = useCallback(
    (pos) => {
      if (!selectedRoute?.geoPath || selectedRoute.geoPath.length === 0) return;

      const snapResult = snapToPath(pos, selectedRoute.geoPath, cachedDistancesRef.current);

      if (snapResult.isOffRoute && !pos.isSimulated) {
        setNavUserPos({
          lat: pos.lat,
          lng: pos.lng,
          heading: pos.heading || 0,
          isNavigating: true,
          isOffRoute: true,
          distanceFromPath: snapResult.distanceFromPath,
        });
        setNavPathSplitIndex(0);
        setLiveMovedKm(0);
        setLiveRemainingMeters(snapResult.remainingMeters);
        setLiveProgress(0);
        setCurrentGuidance({
          maneuver: 'straight',
          distanceText: '코스 이동 필요',
          instruction: `${selectedRoute?.title || '코스'} 출발지로 이동하세요`,
          subInstruction: `현재 코스와 ${(snapResult.distanceFromPath / 1000).toFixed(1)}km 떨어져 있습니다`,
          isArrived: false,
          waypointIndex: 0,
          isOffRoute: true,
        });
        return;
      }

      const guidance = getNextNavigationGuidance(
        snapResult.pathDistanceMeters,
        turnWaypoints,
        snapResult.totalDistanceMeters
      );

      setNavUserPos({
        lat: pos.lat,
        lng: pos.lng,
        heading: pos.heading || 0,
        isNavigating: true,
        isOffRoute: false,
      });

      if (!snapResult.isOffRoute) {
        if (sessionStartSnapDistanceRef.current === null) {
          sessionStartSnapDistanceRef.current = snapResult.pathDistanceMeters;
        }
      }

      // 🌿 시작 직후 물리적 보행(4m 이상) 전에는 지나온 경로(회색)를 0으로 고정하여 코스 전체를 파란색으로 표출
      const isJustStarted = totalGpsDistanceRef.current < 4 && !pos.isSimulated;
      setNavPathSplitIndex(isJustStarted ? 0 : snapResult.segmentIndex);
      setLiveMovedKm(snapResult.pathDistanceMeters / 1000);
      setLiveRemainingMeters(snapResult.remainingMeters);
      setLiveProgress(snapResult.progress);
      setCurrentGuidance(guidance);

      // 턴바이턴 음성 안내 (새로운 안내 지점에 진입했을 때 1회 발화)
      if (guidance.distanceToTurnMeters <= 18 && lastSpokenIndexRef.current !== guidance.waypointIndex) {
        lastSpokenIndexRef.current = guidance.waypointIndex;
        speakInstruction(`${guidance.distanceText} ${guidance.instruction}`);
      }

      // 목적지 부근 도착 감지
      if (guidance.isArrived && !hasAnnouncedArrivalRef.current) {
        hasAnnouncedArrivalRef.current = true;
        speakInstruction('목적지 부근에 도착했습니다. 산책을 완료해보세요!');
        setShowComplete(true);
      }
    },
    [selectedRoute, turnWaypoints, speakInstruction]
  );

  // 실시간 GPS 추적 (watchPosition)
  useEffect(() => {
    if (step !== 'walking' || isPaused || navMode !== 'gps') return undefined;

    // 초기 위치 설정: 이미 저장된 좌표 또는 코스 첫 점
    if (!lastPosRef.current && selectedRoute?.geoPath?.[0]) {
      const initialLat = Number(sessionStorage.getItem('soyo-location-lat')) || selectedRoute.geoPath[0].lat;
      const initialLng = Number(sessionStorage.getItem('soyo-location-lng')) || selectedRoute.geoPath[0].lng;
      handlePositionUpdate({ lat: initialLat, lng: initialLng, heading: 0 });
    }

    if (!navigator.geolocation) return undefined;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, heading: devHeading, speed, accuracy } = pos.coords;
        sessionStorage.setItem('soyo-location-lat', String(lat));
        sessionStorage.setItem('soyo-location-lng', String(lng));

        // 🌿 실시간 실제 GPS 물리 이동 거리 누적 (정지 시 시간 비례 증가 원천 차단)
        if (!isPaused && (accuracy == null || accuracy <= 45)) {
          if (lastGpsPointRef.current) {
            const stepDist = getDistanceMeters(lastGpsPointRef.current, { lat, lng });
            // 2.5m 이상 물리적 이동 감지 시 누적 (정지 시 GPS 미세 진동 0.5~2m 필터링)
            // 50m 초과 급격한 텔레포트 점프는 누적 배제하고 기준점만 재설정
            if (stepDist >= 2.5 && stepDist <= 50) {
              totalGpsDistanceRef.current += stepDist;
              setGpsDistanceMeters(totalGpsDistanceRef.current);
              lastGpsPointRef.current = { lat, lng };
            } else if (stepDist > 50) {
              lastGpsPointRef.current = { lat, lng };
            }
          } else {
            lastGpsPointRef.current = { lat, lng };
          }
        }

        let heading = devHeading;
        if (heading == null || Number.isNaN(heading) || heading === 0) {
          if (lastPosRef.current) {
            const dist = getDistanceMeters(lastPosRef.current, { lat, lng });
            if (dist >= 2) {
              heading = getBearing(lastPosRef.current, { lat, lng });
              lastHeadingRef.current = heading;
            } else {
              heading = lastHeadingRef.current;
            }
          } else {
            heading = 0;
          }
        } else {
          lastHeadingRef.current = heading;
        }
        lastPosRef.current = { lat, lng };

        handlePositionUpdate({ lat, lng, heading, speed, accuracy });
      },
      (err) => {
        console.warn('GPS watchPosition warning:', err);
        if (!lastPosRef.current && selectedRoute?.geoPath?.[0]) {
          handlePositionUpdate({
            lat: selectedRoute.geoPath[0].lat,
            lng: selectedRoute.geoPath[0].lng,
            heading: 0,
          });
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 1000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [step, isPaused, navMode, selectedRoute, handlePositionUpdate]);

  // 실내/테스트 환경 지원용 모의 보행 시뮬레이터 (simulation mode)
  useEffect(() => {
    if (step !== 'walking' || isPaused || navMode !== 'simulation') return undefined;
    const geoPath = selectedRoute?.geoPath || [];
    if (geoPath.length < 2) return undefined;

    const interval = setInterval(() => {
      simIndexRef.current = simIndexRef.current + 1;
      if (simIndexRef.current >= geoPath.length) {
        simIndexRef.current = geoPath.length - 1;
      }

      const pCurr = geoPath[simIndexRef.current];
      const pNext = geoPath[Math.min(geoPath.length - 1, simIndexRef.current + 1)];
      const heading = getBearing(pCurr, pNext);

      lastPosRef.current = pCurr;
      lastHeadingRef.current = heading;

      handlePositionUpdate({
        lat: pCurr.lat,
        lng: pCurr.lng,
        heading,
        speed: 1.3,
        accuracy: 5,
      });

      if (simIndexRef.current >= geoPath.length - 1) {
        clearInterval(interval);
      }
    }, 1100);

    return () => clearInterval(interval);
  }, [step, isPaused, navMode, selectedRoute, handlePositionUpdate]);

  useEffect(() => {
    onSectionChange?.(step);
  }, [step, onSectionChange]);

  useEffect(() => {
    if (homeResetTrigger > 0) {
      setStep('home');
      setSelectedRoute(null);
      setToast('');
      setFolderSelectRoute(null);
      setShowNutritionDetail(false);
      setShowComplete(false);
    }
  }, [homeResetTrigger]);

  useEffect(() => {
    setRoutes(getRoutes(region, minutes, userDiseases, includeRestaurant));
  }, [userDiseases]);

  useEffect(() => {
    if (step !== 'walking' || isPaused) return undefined;
    const timer = setInterval(() => setWalkSeconds((seconds) => seconds + 1), 1000);
    return () => clearInterval(timer);
  }, [step, isPaused]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 2400);
    return () => clearTimeout(timer);
  }, [toast]);

  const isPoppingHistoryRef = useRef(false);

  // 폴더 선택 바텀시트가 열려 있을 때 브라우저 뒤로가기 시 로그인 화면으로 튕기지 않고 시트만 닫히도록 처리
  useEffect(() => {
    if (folderSelectRoute) {
      window.history.pushState({ sheet: 'folder' }, '');
      const handlePop = () => {
        isPoppingHistoryRef.current = true;
        setFolderSelectRoute(null);
      };
      window.addEventListener('popstate', handlePop, { once: true });
      return () => {
        window.removeEventListener('popstate', handlePop);
        if (!isPoppingHistoryRef.current && window.history.state?.sheet === 'folder') {
          window.history.back();
        }
        isPoppingHistoryRef.current = false;
      };
    }
  }, [folderSelectRoute]);

  // 🌿 실제 사용자 GPS 실시간 위치 감시 및 거주지/현재 위치 '동' 역지오코딩 동기화
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return undefined;

    const isFallback = sessionStorage.getItem('soyo-location-is-fallback') === 'true';
    const cachedLat = Number(sessionStorage.getItem('soyo-location-lat'));
    const cachedLng = Number(sessionStorage.getItem('soyo-location-lng'));

    const applyDong = (dong, fullName, lat, lng) => {
      if (!dong || lastAppliedDongRef.current === dong) return;
      lastAppliedDongRef.current = dong;
      sessionStorage.setItem('soyo-current-dong', dong);
      sessionStorage.setItem('soyo-current-address', fullName);
      const userReg = buildUserRegion(dong, fullName, lat, lng);
      setDetectedRegion(userReg);
      if (isSupportedRegion(userReg)) {
        setRegion((prev) => {
          if (!prev || prev.id === DEFAULT_REGION.id || prev.id === 'my-location') {
            return userReg;
          }
          return prev;
        });
        setRoutes((prevRoutes) => {
          if (!prevRoutes || prevRoutes.length === 0 || prevRoutes[0]?.regionId === DEFAULT_REGION.id) {
            return getRoutes(userReg, minutes, userDiseases, includeRestaurant);
          }
          return prevRoutes;
        });
      }
    };

    if (!isFallback && cachedLat && cachedLng) {
      setUserGps({ lat: cachedLat, lng: cachedLng });
      reverseGeocodeCoords(cachedLat, cachedLng).then((res) => {
        if (res?.dong) {
          applyDong(res.dong, res.fullName, cachedLat, cachedLng);
        }
      });
    }

    // 1) 즉시 초기 고정밀 위치 요청
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        sessionStorage.setItem('soyo-location-lat', String(lat));
        sessionStorage.setItem('soyo-location-lng', String(lng));
        sessionStorage.removeItem('soyo-location-is-fallback');
        setUserGps({ lat, lng });

        reverseGeocodeCoords(lat, lng).then((res) => {
          if (res?.dong) {
            applyDong(res.dong, res.fullName, lat, lng);
          }
        });
      },
      (err) => {
        console.warn('Initial GPS get warning:', err);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
    );

    // 2) 지속적 실시간 백그라운드 GPS 추적 (홈/전체 화면 공통 실시간 위치 갱신)
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        if (accuracy != null && accuracy > 120) return; // 오차 범위 큰 기지국 신호 필터링
        sessionStorage.setItem('soyo-location-lat', String(lat));
        sessionStorage.setItem('soyo-location-lng', String(lng));
        sessionStorage.removeItem('soyo-location-is-fallback');

        // 🌿 3m 미만의 미세 GPS 오차 떨림은 무시하여 불필요한 전체 리렌더링 차단
        setUserGps((prev) => {
          if (prev) {
            const dist = getDistanceMeters(prev, { lat, lng });
            if (dist < 3) return prev;
          }
          return { lat, lng };
        });
      },
      (err) => {
        console.warn('Continuous GPS watch warning:', err);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [minutes, userDiseases, includeRestaurant]);

  const filteredRegions = useMemo(() => {
    const list = detectedRegion
      ? [
          {
            ...detectedRegion,
            name: `내 현재 위치 (${detectedRegion.name})`,
            short: detectedRegion.short,
          },
          ...REGIONS.filter((r) => r.short !== detectedRegion.short),
        ]
      : REGIONS;

    const keyword = regionQuery.trim();
    if (!keyword) return list;
    return list.filter(
      (item) => item.name.includes(keyword) || item.short.includes(keyword),
    );
  }, [regionQuery, detectedRegion]);

  const sortedDisplayRoutes = useMemo(() => {
    if (!Array.isArray(routes)) return [];
    const list = [...routes];
    if (routeSort === 'duration') {
      list.sort((a, b) => {
        const minA = Number(a.durationMin ?? a.duration_minutes ?? a.duration ?? 25);
        const minB = Number(b.durationMin ?? b.duration_minutes ?? b.duration ?? 25);
        return minA - minB;
      });
    } else if (routeSort === 'distance') {
      list.sort((a, b) => {
        const distA = Number(a.distanceKm ?? a.distanceToStartKm ?? 0);
        const distB = Number(b.distanceKm ?? b.distanceToStartKm ?? 0);
        return distA - distB;
      });
    }
    return list;
  }, [routes, routeSort]);

  const pinned = useMemo(
    () => (selectedRoute ? isRoutePinned(userId, selectedRoute.id, selectedRoute.title) : false),
    [userId, selectedRoute, pinVersion],
  );

  // 🌿 실제 이동 거리 및 진행률 (시간 비례 자동 증가 완전 배제, 실측 GPS 기반)
  const totalCourseMeters = useMemo(() => {
    if (!selectedRoute?.distanceKm) return 1400;
    return Math.round(selectedRoute.distanceKm * 1000);
  }, [selectedRoute]);

  const displayMovedKm = useMemo(() => {
    if (navMode === 'simulation') {
      return Number(liveMovedKm.toFixed(2));
    }
    const realGpsKm = gpsDistanceMeters / 1000;
    return Number(realGpsKm.toFixed(2));
  }, [navMode, liveMovedKm, gpsDistanceMeters]);

  const displayProgress = useMemo(() => {
    if (navUserPos?.isOffRoute) return 0;
    if (navMode === 'simulation') return Math.min(100, Math.max(0, liveProgress));
    if (!totalCourseMeters) return 0;
    return Math.min(100, Math.max(0, Math.round((gpsDistanceMeters / totalCourseMeters) * 100)));
  }, [navUserPos?.isOffRoute, navMode, liveProgress, gpsDistanceMeters, totalCourseMeters]);

  const displayRemainingMeters = useMemo(() => {
    if (navUserPos?.isOffRoute) return totalCourseMeters;
    if (navMode === 'simulation' && liveRemainingMeters > 0) return liveRemainingMeters;
    return Math.max(0, totalCourseMeters - Math.round(displayMovedKm * 1000));
  }, [navUserPos?.isOffRoute, navMode, liveRemainingMeters, totalCourseMeters, displayMovedKm]);

  const nextDirection = useMemo(() => {
    if (Array.isArray(selectedRoute?.turnByTurn) && selectedRoute.turnByTurn.length > 0) {
      const idx = Math.min(
        selectedRoute.turnByTurn.length - 1,
        Math.floor((displayProgress / 100) * selectedRoute.turnByTurn.length)
      );
      return selectedRoute.turnByTurn[idx];
    }
    return '보행로를 따라 직진하세요';
  }, [selectedRoute, displayProgress]);

  const startRegion = (nextRegion) => {
    if (!isSupportedRegion(nextRegion)) {
      setToast('지원하는 지역이 아닙니다');
      return;
    }
    setRegion(nextRegion);
    setRegionQuery('');
    setStep('setup');
  };

  const searchRoutes = async () => {
    if (!isSupportedRegion(region)) {
      setToast('지원하는 지역이 아닙니다');
      setStep('region');
      return;
    }
    // 1) 0ms 즉각 렌더링 (로컬 고정밀 실측 도로망)
    const localList = getRoutes(region, minutes, userDiseases, includeRestaurant);
    setRoutes(localList);
    setStep('list');

    // 2) 백엔드 Tmap 보행자 추천 엔진 비동기 갱신
    try {
      const serverCourses = await fetchRecommendedRoutes({
        region,
        minutes,
        includeRestaurant,
        userDiseases,
      });
      if (Array.isArray(serverCourses) && serverCourses.length > 0) {
        setRoutes(serverCourses);
      }
    } catch {
      // 로컬 리스트 유지
    }
  };

  const openRoute = (route) => {
    setSelectedRoute(route);
    setShowNutritionDetail(false);
    setStep('detail');
  };

  const togglePin = (route) => {
    if (!isLoggedIn) {
      setLoginPrompt(true);
      return;
    }
    const isPinned = isRoutePinned(userId, route?.id, route?.title);
    if (isPinned) {
      removeRoutePinEverywhere(userId, route?.id, route?.title);
      setToast('핀 저장을 해제했어요');
      setPinVersion((version) => version + 1);
    } else {
      setFolderSelectRoute(route);
    }
  };

  const handleSaveToFolder = (folder) => {
    if (!folderSelectRoute) return;
    saveRoutePin(userId, folderSelectRoute, folder.id);
    setToast(`‘${folder.name}’에 저장했어요`);
    setFolderSelectRoute(null);
    setPinVersion((v) => v + 1);
  };

  const handleCreateAndSave = (newFolder) => {
    if (!folderSelectRoute) return;
    saveRoutePin(userId, folderSelectRoute, newFolder.id);
    setToast(`‘${newFolder.name}’ 폴더를 만들고 저장했어요`);
    setFolderSelectRoute(null);
    setPinVersion((v) => v + 1);
  };

  const beginWalk = () => {
    // 1) 둘레길/순환 루프 코스인 경우, 사용자의 현재 위치를 출발점이자 도착점으로 코스를 자연스럽게 회전 재정렬
    const cachedLat = Number(sessionStorage.getItem('soyo-location-lat'));
    const cachedLng = Number(sessionStorage.getItem('soyo-location-lng'));
    const isFallback = sessionStorage.getItem('soyo-location-is-fallback') === 'true';
    const userPos = userGps || (!isFallback && cachedLat && cachedLng ? { lat: cachedLat, lng: cachedLng } : null);

    let activeRoute = selectedRoute;
    if (selectedRoute && userPos) {
      activeRoute = realignLoopRoute(selectedRoute, userPos);
      setSelectedRoute(activeRoute);
    }

    setWalkSeconds(0);
    setIsPaused(false);
    setFollowUser(true);
    setLiveMovedKm(0);
    setLiveProgress(0);
    setGpsDistanceMeters(0);
    totalGpsDistanceRef.current = 0;
    sessionStartSnapDistanceRef.current = null;
    lastGpsPointRef.current = null;
    lastPosRef.current = null;
    lastHeadingRef.current = 0;
    lastSpokenIndexRef.current = -1;
    hasAnnouncedArrivalRef.current = false;
    simIndexRef.current = 0;
    setStep('walking');

    if (userPos) {
      handlePositionUpdate({
        lat: userPos.lat,
        lng: userPos.lng,
        heading: 0,
      });
    } else if (activeRoute?.geoPath?.[0]) {
      const startPt = activeRoute.geoPath[0];
      const nextPt = activeRoute.geoPath[1] || startPt;
      const initialHeading = getBearing(startPt, nextPt);
      handlePositionUpdate({
        lat: startPt.lat,
        lng: startPt.lng,
        heading: initialHeading,
      });
    }
  };

  const finishWalk = () => {
    const finalDistance = Number(displayMovedKm.toFixed(2));
    try {
      const records = JSON.parse(localStorage.getItem('soyo-walk-records') || '[]');
      records.unshift({
        id: `walk-${Date.now()}`,
        title: selectedRoute?.title,
        region: region.name,
        durationMinutes: Math.max(1, Math.round(walkSeconds / 60)),
        distanceKm: finalDistance,
        completedAt: new Date().toISOString(),
      });
      localStorage.setItem('soyo-walk-records', JSON.stringify(records.slice(0, 30)));
    } catch {
      // 기록 저장 실패는 화면 흐름을 막지 않습니다.
    }

    // Supabase DB walk_records 연동
    const currentUserId = localStorage.getItem('soyo-current-user-id');
    if (supabase && currentUserId && selectedRoute) {
      try {
        supabase.from('walk_records').insert([
          {
            user_id: currentUserId,
            destination_name: selectedRoute.destPoint?.name || selectedRoute.title,
            walk_duration_minutes: Math.max(1, Math.round(walkSeconds / 60)),
            walk_distance_km: finalDistance || 1.4,
            perceived_difficulty: '보통',
          },
        ]).then(() => {});
      } catch {
        // ignore
      }
    }
    setShowComplete(false);
    setStep('home');
    setSelectedRoute(null);
    setWalkSeconds(0);
    setNavUserPos(null);
    setToast('오늘의 산책을 마쳤어요');
  };

  // ── No.4 메인 지도 ───────────────────────────────────────────
  if (step === 'home') {
    return (
      <div className="screen screen--map">
        <SoyoMap
          showUser
          region={region}
          userPos={userGps}
          recenterKey={homeRecenterKey}
          className="map-fill"
        />
        <div className="map-top">
          <button type="button" className="search-bar search-bar--full" onClick={() => setStep('region')}>
            <span>어디서 산책할까요?</span>
            <Icon name="search" size={20} />
          </button>
        </div>
        <button
          type="button"
          className="home-recenter-btn"
          aria-label="내 위치로 이동"
          title="내 위치로 이동"
          onClick={() => {
            setHomeRecenterKey((k) => k + 1);
            if (detectedRegion) {
              if (isSupportedRegion(detectedRegion)) {
                setRegion(detectedRegion);
              } else {
                setToast('지원하는 지역이 아닙니다');
              }
            }
          }}
        >
          <Icon name="crosshair" size={22} />
        </button>
        {isLoggedIn ? (
          <div className="map-hint">
            <span className="map-hint-dot" />
            {region.short} 근처에서 산책 코스를 찾아보세요
          </div>
        ) : (
          <div
            className="guest-banner"
            onClick={onRequireLogin}
            role="button"
            tabIndex={0}
            style={{
              position: 'absolute',
              bottom: '16px',
              left: '16px',
              right: '16px',
              background: 'rgba(23, 26, 24, 0.92)',
              color: '#ffffff',
              padding: '12px 16px',
              borderRadius: '14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '13px',
              zIndex: 20,
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(0,0,0,0.18)'
            }}
          >
            <div>
              <strong style={{ fontSize: '13.5px', display: 'block', marginBottom: '2px' }}>비회원 둘러보기 중</strong>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>로그인 시 맞춤 영양 분석 & 핀 저장이 가능해요</div>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 'bold', background: 'var(--emerald)', color: '#fff', padding: '6px 12px', borderRadius: '8px' }}>
              로그인
            </span>
          </div>
        )}
        {toast && <div className="toast">{toast}</div>}
      </div>
    );
  }

  // ── No.5 지역 검색 (Figma: 1 / 3 산책할 지역을 선택하세요) ───
  if (step === 'region') {
    const isCurrentSupported = isSupportedRegion(region);

    return (
      <div className="screen screen--map">
        <SoyoMap variant="search" region={region} className="map-fill" />

        <div className="region-header-overlay">
          <header className="page-head page-head--back" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flex: 1, minWidth: 0 }}>
              <button type="button" className="back-btn" onClick={() => setStep('home')} aria-label="뒤로">
                <Icon name="chevron-left" size={22} />
              </button>
              <div>
                <h1 style={{ fontSize: '20px' }}>지역 검색</h1>
                <p style={{ fontSize: '11.5px', color: 'var(--muted)' }}>1 / 3 산책할 지역을 선택하세요</p>
              </div>
            </div>
            <img src="/pic/SOYO.png" alt="SOYO" className="head-logo" />
          </header>

          <form
            className="search-bar search-bar--input"
            onSubmit={(event) => {
              event.preventDefault();
              const q = regionQuery.trim();
              if (!q) return;
              if (!isSupportedRegion(q)) {
                setToast('지원하는 지역이 아닙니다');
                return;
              }
              const match = filteredRegions.find((item) => isSupportedRegion(item));
              if (match) {
                setRegion(match);
                setRegionQuery('');
              } else {
                setToast('지원하는 지역이 아닙니다');
              }
            }}
          >
            <input
              value={regionQuery}
              onChange={(event) => setRegionQuery(event.target.value)}
              placeholder={region.short || '역곡'}
              aria-label="지역 검색"
              autoFocus
            />
            {regionQuery && (
              <button
                type="button"
                className="search-clear"
                aria-label="검색어 지우기"
                onClick={() => setRegionQuery('')}
              >
                <Icon name="close" size={16} />
              </button>
            )}
            <button
              type="submit"
              className="search-icon"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              aria-label="검색"
            >
              <Icon name="search" size={20} />
            </button>
          </form>

          {regionQuery && filteredRegions.length > 0 && (
            <div className="region-dropdown">
              {filteredRegions.map((item) => {
                const isSupported = isSupportedRegion(item);
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="region-dropdown-item"
                    onClick={() => {
                      setRegion(item);
                      setRegionQuery('');
                      if (!isSupported) {
                        setToast('지원하는 지역이 아닙니다');
                      }
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
                      <strong style={{ color: isSupported ? 'var(--ink)' : '#6b7280' }}>{item.name}</strong>
                      <small style={{ color: isSupported ? 'var(--muted)' : '#dc2626' }}>
                        {isSupported ? formatDistance(item.distanceKm) : '지원하는 지역이 아닙니다'}
                      </small>
                    </div>
                    {isSupported ? (
                      <span style={{ fontSize: '11px', color: '#059669', background: '#ecfdf5', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                        지원
                      </span>
                    ) : (
                      <span style={{ fontSize: '11px', color: '#dc2626', background: '#fee2e2', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                        미지원
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {regionQuery.trim() && filteredRegions.length === 0 && (
            <div className="region-dropdown">
              <button
                type="button"
                className="region-dropdown-item"
                onClick={() => {
                  setToast('지원하는 지역이 아닙니다');
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
                  <strong style={{ color: '#4b5563' }}>{regionQuery.trim()}</strong>
                  <small style={{ color: '#dc2626', fontSize: '11px', marginTop: '2px' }}>
                    지원하는 지역이 아닙니다 (부천 역곡만 지원)
                  </small>
                </div>
                <span style={{ fontSize: '11px', color: '#dc2626', background: '#fee2e2', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                  미지원
                </span>
              </button>
            </div>
          )}
        </div>

        <section className="map-sheet region-card-sheet" aria-label="선택된 지역 정보">
          <div className="sheet-grip" />
          <div className="region-card-info">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', minWidth: 0 }}>
                <strong style={{ fontSize: '20px', fontWeight: 800, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {region.short || region.name}
                </strong>
                <span style={{ fontSize: '13px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{region.name} 주변</span>
              </div>
              {isCurrentSupported ? (
                <span style={{ fontSize: '11px', color: '#059669', background: '#ecfdf5', padding: '3px 8px', borderRadius: '6px', fontWeight: 600, flexShrink: 0 }}>
                  서비스 지원
                </span>
              ) : (
                <span style={{ fontSize: '11px', color: '#dc2626', background: '#fee2e2', padding: '3px 8px', borderRadius: '6px', fontWeight: 600, flexShrink: 0 }}>
                  지원 예정
                </span>
              )}
            </div>
            {isCurrentSupported ? (
              <p style={{ fontSize: '12px', color: 'var(--muted-2)', marginTop: '4px' }}>
                지도에서 산책할 지역을 선택해 주세요.
              </p>
            ) : (
              <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '6px', fontWeight: 500 }}>
                현재 소요(SOYO)는 부천 역곡 지역만 지원하고 있습니다.
              </p>
            )}
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              if (!isCurrentSupported) {
                setToast('지원하는 지역이 아닙니다');
                return;
              }
              setStep('setup');
            }}
            style={{
              width: '100%',
              marginTop: '16px',
              ...(!isCurrentSupported
                ? {
                    background: '#9ca3af',
                    borderColor: '#9ca3af',
                    boxShadow: 'none',
                  }
                : {}),
            }}
          >
            {isCurrentSupported ? '이 지역 선택' : '지원하는 지역이 아닙니다'}
          </button>
        </section>
        {toast && <div className="toast">{toast}</div>}
      </div>
    );
  }

  // ── No.6 코스 설정 ──────────────────────────────────────────
  if (step === 'setup') {
    return (
      <div className="screen page">
        <header className="page-head page-head--back">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flex: 1, minWidth: 0 }}>
            <button type="button" className="back-btn" onClick={() => setStep('region')} aria-label="뒤로">
              <Icon name="chevron-left" size={22} />
            </button>
            <div>
              <h1>코스 설정</h1>
              <p>2 / 2 코스를 설정하세요</p>
            </div>
          </div>
          <img src="/pic/SOYO.png" alt="SOYO" className="head-logo" />
        </header>

        <div className="setup-body">
          <div className="setup-group">
            <span className="field-label accent">선택한 지역</span>
            <div className="static-field">{region.name}</div>
          </div>

          <div className="setup-group">
            <span className="field-label">산책 시간</span>
            <div className="chip-row">
              {WALK_MINUTES.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`chip ${minutes === value ? 'chip--active' : ''}`}
                  onClick={() => setMinutes(value)}
                >
                  약 {value}분
                </button>
              ))}
            </div>
            <p className="helper">예상 시간은 약 ±3분 차이가 날 수 있어요.</p>
          </div>

          <div className="setup-group">
            <span className="field-label">식당 여부</span>
            <div className="chip-row">
              <button
                type="button"
                className={`chip ${includeRestaurant ? 'chip--active' : ''}`}
                onClick={() => setIncludeRestaurant(true)}
              >
                예
              </button>
              <button
                type="button"
                className={`chip ${!includeRestaurant ? 'chip--active' : ''}`}
                onClick={() => setIncludeRestaurant(false)}
              >
                아니요
              </button>
            </div>
            <p className="helper">
              {includeRestaurant ? '식사 후 걷기 좋은 안심식당 연계 코스를 찾아드려요.' : '음식점 없이 순수 보행길 위주로 안내해요.'}
            </p>
          </div>
        </div>

        <div className="bottom-cta">
          <button type="button" className="btn btn-primary" onClick={searchRoutes}>
            다음
          </button>
        </div>
      </div>
    );
  }

  // ── No.8 추천 코스 ───────────────────────────────────────────
  if (step === 'list') {
    return (
      <div className="screen page">
        <header className="page-head page-head--back">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flex: 1, minWidth: 0 }}>
            <button type="button" className="back-btn" onClick={() => setStep('setup')} aria-label="뒤로">
              <Icon name="chevron-left" size={22} />
            </button>
            <div>
              <h1>추천 코스</h1>
              <p>조건에 맞는 {routes.length}가지 코스를 찾았어요</p>
            </div>
          </div>
          <img src="/pic/SOYO.png" alt="SOYO" className="head-logo" />
        </header>

        <div className="filter-chips">
          <span className="chip chip--active">{region.short}</span>
          <span className="chip chip--active">약 {minutes}분</span>
          <span className="chip chip--active" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            {includeRestaurant ? <><Icon name="utensils" size={13} /> 식당 포함</> : '산책만'}
          </span>
        </div>

        {userDiseases.length > 0 && (
          <div className="health-match-notice">
            <span className="health-match-icon"><Icon name="leaf" size={18} /></span>
            <div>
              <strong>기저질환 맞춤 3색 신호등 필터링 적용 중</strong>
              <p>회원님의 건강 정보({userDiseases.length}개 질환) 1끼 임계치를 엄격 병합하여 가장 안전한 안심 메뉴를 우선 추천해요.</p>
            </div>
          </div>
        )}

        <div className="filter-chips" style={{ marginTop: '10px', marginBottom: '8px', gap: '6px' }}>
          <button
            type="button"
            className={`chip ${routeSort === 'recommend' ? 'chip--active' : ''}`}
            onClick={() => setRouteSort('recommend')}
          >
            추천순
          </button>
          <button
            type="button"
            className={`chip ${routeSort === 'duration' ? 'chip--active' : ''}`}
            onClick={() => setRouteSort('duration')}
          >
            소요시간순
          </button>
          <button
            type="button"
            className={`chip ${routeSort === 'distance' ? 'chip--active' : ''}`}
            onClick={() => setRouteSort('distance')}
          >
            거리순
          </button>
        </div>

        <div className="course-list">
          {sortedDisplayRoutes.map((route) => {
            const saved = isRoutePinned(userId, route.id, route.title);
            const effectiveMin = Number(route.durationMin ?? route.duration_minutes ?? route.duration ?? 25);
            return (
              <article key={route.id} className="course-card">
                <button type="button" className="course-card-main" onClick={() => openRoute(route)}>
                  <strong>{formatCourseTitle(route.title, effectiveMin)}</strong>
                  <span className="course-meta">
                    약 {effectiveMin}분 · {formatDistance(route.distanceKm)} ·{' '}
                    {route.hasRestaurant ? '식당 포함' : '산책만'}
                  </span>
                  {route.restaurant && (
                    <div className="course-restaurant-badge">
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Icon name="utensils" size={12} />
                        <span>{route.restaurant.name}</span>
                      </span>
                      <span className={`nutrition-pill nutrition-pill--${route.restaurant.grade || 'green'}`}>
                        {route.restaurant.dot || '🟢'} {route.restaurant.badgeLabel || '안심식당'}
                      </span>
                    </div>
                  )}
                  <span className="course-note">{route.roadType}</span>
                </button>
                <button
                  type="button"
                  className={`bookmark-btn ${saved ? 'is-on' : ''}`}
                  aria-label={saved ? '핀 저장 해제' : '핀에 저장'}
                  aria-pressed={saved}
                  onClick={() => togglePin(route)}
                >
                  <Icon name={saved ? 'bookmark-filled' : 'bookmark'} size={20} />
                </button>
              </article>
            );
          })}
        </div>

        <p className="list-hint">코스를 선택하면 상세 경로를 볼 수 있어요</p>
        {toast && <div className="toast">{toast}</div>}
        {loginPrompt && (
          <LoginPrompt
            onClose={() => setLoginPrompt(false)}
            onLogin={() => {
              setLoginPrompt(false);
              onRequireLogin();
            }}
          />
        )}
        {folderSelectRoute && (
          <FolderSelectSheet
            userId={userId}
            route={folderSelectRoute}
            onClose={() => setFolderSelectRoute(null)}
            onSelectFolder={handleSaveToFolder}
            onCreateAndSelect={handleCreateAndSave}
          />
        )}
      </div>
    );
  }

  // ── No.9 경로 상세 ───────────────────────────────────────────
  if (step === 'detail') {
    return (
      <div className="screen screen--map">
        <SoyoMap route={selectedRoute} className="map-fill" />
        <div className="map-top map-top--compact">
          <button type="button" className="map-round" onClick={() => setStep('list')} aria-label="뒤로">
            <Icon name="chevron-left" size={21} />
          </button>
          <button
            type="button"
            className={`map-round ${pinned ? 'is-on' : ''}`}
            aria-label={pinned ? '핀 저장 해제' : '핀에 저장'}
            onClick={() => togglePin(selectedRoute)}
          >
            <Icon name={pinned ? 'bookmark-filled' : 'bookmark'} size={20} />
          </button>
        </div>

        <section className="map-sheet route-sheet">
          {(() => {
            const detailMin = Number(selectedRoute.durationMin ?? selectedRoute.duration_minutes ?? selectedRoute.duration ?? 25);
            return (
              <>
                <h2>{formatCourseTitle(selectedRoute.title, detailMin)}</h2>
                <p className="route-meta">
                  약 {detailMin}분 · {formatDistance(selectedRoute.distanceKm)} ·{' '}
                  {selectedRoute.hasRestaurant ? '식당 포함' : '산책만'}
                </p>
              </>
            );
          })()}
          <div className="waypoint-box">
            <span>주요 경유지</span>
            <strong>{selectedRoute.waypoints}</strong>
          </div>

          {selectedRoute.restaurant && (
            <div className="restaurant-detail-box">
              <div
                className="restaurant-detail-header"
                style={{
                  borderBottom: showNutritionDetail ? '1px dashed #cbd5e1' : 'none',
                  marginBottom: showNutritionDetail ? '12px' : '0',
                  paddingBottom: showNutritionDetail ? '10px' : '0'
                }}
              >
                <div className="restaurant-title-row">
                  <span className="restaurant-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Icon name="utensils" size={13} />
                    <span>추천 식당</span>
                  </span>
                  <strong>{selectedRoute.restaurant.name}</strong>
                  <span className={`nutrition-pill nutrition-pill--${selectedRoute.restaurant.grade || 'green'}`}>
                    {selectedRoute.restaurant.dot || '🟢'} {selectedRoute.restaurant.badgeLabel || '안심식당'}
                  </span>
                </div>
                <p className="restaurant-address">{selectedRoute.restaurant.address || selectedRoute.restaurant.category}</p>
              </div>

              {/* 🔽 지도를 가리지 않는 '대표메뉴 및 영양정보' 아코디언 토글 버튼 */}
              <button
                type="button"
                className="nutrition-toggle-btn"
                onClick={() => setShowNutritionDetail((prev) => !prev)}
                style={{
                  width: '100%',
                  marginTop: '10px',
                  padding: '10px 14px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#334155',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  cursor: 'pointer'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  🥗 {selectedRoute.restaurant.bestFood?.name ? `대표메뉴: ${selectedRoute.restaurant.bestFood.name}` : '대표메뉴 및 영양정보'}
                </span>
                <span style={{ fontSize: '11px', color: '#059669', fontWeight: 700 }}>
                  {showNutritionDetail ? '영양정보 접기 ▲' : '영양정보 보기 ▼'}
                </span>
              </button>

              {/* 토글 펼침 시에만 렌더링되는 상세 영양 및 메뉴 영역 */}
              {showNutritionDetail && (
                <div style={{ marginTop: '14px' }}>
                  {selectedRoute.restaurant.substituteNotice && (
                    <div style={{ background: '#fef3c7', color: '#92400e', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, marginBottom: '12px', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Icon name="alert" size={15} />
                      <span>{selectedRoute.restaurant.substituteNotice}</span>
                    </div>
                  )}

                  {selectedRoute.restaurant.threshold && (
                    <div className="disease-threshold-box">
                      <div className="threshold-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Icon name="leaf" size={14} />
                        <span>{selectedRoute.restaurant.threshold.isDefault ? '일반 성인 1끼 권장 기준' : `${selectedRoute.restaurant.threshold.name} 1끼 상한`}</span>
                      </div>
                      <div className="threshold-chips">
                        <span>나트륨 ≤ {selectedRoute.restaurant.threshold.sodium}mg</span>
                        <span>당류 ≤ {selectedRoute.restaurant.threshold.sugar}g</span>
                        <span>열량 {selectedRoute.restaurant.threshold.calMin}~{selectedRoute.restaurant.threshold.calMax}kcal</span>
                      </div>
                    </div>
                  )}

                  {selectedRoute.restaurant.foods && selectedRoute.restaurant.foods.length > 0 && (
                    <div className="restaurant-foods-list">
                      <div className="foods-list-title">대표메뉴</div>
                      {selectedRoute.restaurant.foods.map((food, idx) => (
                        <div key={idx} className="food-item-card">
                          <div className="food-item-header">
                            <strong className="food-name">
                              {food.name}
                              {food.isSubstitute && (
                                <span style={{ marginLeft: '6px', fontSize: '11px', background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                  추천 메뉴
                                </span>
                              )}
                            </strong>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span className="food-cal">{food.calories} kcal</span>
                              <span className={`food-grade-badge food-grade-badge--${food.grade || 'green'}`}>
                                {food.dot || '🟢'} {food.gradeText || (food.grade === 'green' ? '안심' : '주의')}
                              </span>
                            </div>
                          </div>
                          <div className="food-nutr-row">
                            <span className="nutr-chip">나트륨 {food.sodium}mg {food.rSod ? `(R: ${food.rSod})` : ''}</span>
                            <span className="nutr-chip">당류 {food.sugar}g {food.rSug ? `(R: ${food.rSug})` : ''}</span>
                            {food.protein ? <span className="nutr-chip">단백질 {food.protein}g</span> : null}
                          </div>
                          {food.guideAdvice && (
                            <div className={`food-guide-advice food-guide-advice--${food.grade || 'green'}`}>
                              <span className="food-guide-icon" aria-hidden="true">💡</span>
                              <span className="food-guide-text">{food.guideAdvice}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <button type="button" className="btn btn-primary" onClick={beginWalk}>
            시작하기
          </button>
        </section>
        {toast && <div className="toast">{toast}</div>}
        {loginPrompt && (
          <LoginPrompt
            onClose={() => setLoginPrompt(false)}
            onLogin={() => {
              setLoginPrompt(false);
              onRequireLogin();
            }}
          />
        )}
        {folderSelectRoute && (
          <FolderSelectSheet
            userId={userId}
            route={folderSelectRoute}
            onClose={() => setFolderSelectRoute(null)}
            onSelectFolder={handleSaveToFolder}
            onCreateAndSelect={handleCreateAndSave}
          />
        )}
      </div>
    );
  }

  // ── No.10 산책 진행 (실시간 내비게이션 모드) ──────────────────────────
  const walkDurationMin = Number(selectedRoute?.durationMin ?? selectedRoute?.duration_minutes ?? selectedRoute?.duration ?? 25);
  const activeGuidance = currentGuidance || {
    maneuver: 'straight',
    distanceToTurnMeters: displayRemainingMeters,
    distanceText: displayRemainingMeters > 0 ? `${displayRemainingMeters}m 앞` : '출발',
    instruction: nextDirection,
    subInstruction: formatCourseTitle(selectedRoute?.title, walkDurationMin),
  };

  return (
    <div className="screen screen--map">
      <SoyoMap
        route={selectedRoute}
        className="map-fill"
        navUserPos={navUserPos}
        navPathSplitIndex={navPathSplitIndex}
        followUser={followUser}
        onUserDrag={() => setFollowUser(false)}
      />

      {/* 🌿 상단 턴바이턴 내비게이션 헤더 카드 */}
      <div className="nav-turn-card">
        <div className="nav-turn-top">
          <div className="nav-turn-main">
            <div
              className={`nav-turn-icon-box ${
                activeGuidance.maneuver === 'destination'
                  ? 'nav-turn-icon-box--destination'
                  : activeGuidance.maneuver === 'restaurant'
                    ? 'nav-turn-icon-box--restaurant'
                    : ''
              }`}
            >
              {renderManeuverIcon(activeGuidance.maneuver)}
            </div>
            <div className="nav-turn-text">
              <div className="nav-turn-dist-row">
                <span className="nav-turn-dist-big">{activeGuidance.distanceText}</span>
                {activeGuidance.subInstruction && (
                  <span className="nav-turn-sub">{activeGuidance.subInstruction}</span>
                )}
              </div>
              <h2 className="nav-turn-title">
                {activeGuidance.instruction || formatCourseTitle(selectedRoute?.title, walkDurationMin)}
              </h2>
            </div>
          </div>

          <div className="nav-top-actions">
            {/* 음성 안내 (TTS) 토글 */}
            <button
              type="button"
              className={`nav-action-btn ${!isVoiceMuted ? 'is-active' : ''}`}
              onClick={() => {
                setIsVoiceMuted((prev) => !prev);
                setToast(!isVoiceMuted ? '음성 안내를 껐어요' : '음성 안내를 켰어요');
              }}
              aria-label={isVoiceMuted ? '음성 안내 켜기' : '음성 안내 끄기'}
              title={isVoiceMuted ? '음성 안내 켜기' : '음성 안내 끄기'}
            >
              <Icon name={isVoiceMuted ? 'volume-x' : 'volume'} size={18} />
            </button>

            {/* 핀 저장 */}
            <button
              type="button"
              className={`nav-action-btn ${pinned ? 'is-active' : ''}`}
              aria-label={pinned ? '핀 저장 해제' : '현재 경로를 핀에 저장'}
              onClick={() => togglePin(selectedRoute)}
            >
              <Icon name={pinned ? 'bookmark-filled' : 'bookmark'} size={18} />
            </button>
          </div>
        </div>

        {/* 보행 정보 & 모의 주행 모드 전환 바 (하단 바텀 시트와 중복되는 소요시간/걸은 거리 제거, 코스 정보 및 GPS 상태 표출) */}
        <div className="nav-sim-bar">
          <span className="nav-course-badge">
            <Icon name="pin" size={13} />
            <span>{formatCourseTitle(selectedRoute?.title, walkDurationMin)}</span>
          </span>
          <button
            type="button"
            className={`nav-sim-badge ${navMode === 'gps' ? 'nav-sim-badge--gps' : ''}`}
            onClick={() => {
              const nextMode = navMode === 'gps' ? 'simulation' : 'gps';
              setNavMode(nextMode);
              setFollowUser(true);
              setToast(nextMode === 'simulation' ? '모의 보행을 시작합니다' : '실시간 GPS를 추적합니다');
            }}
          >
            <span className={`status-indicator-dot ${navMode === 'gps' ? 'pulse' : ''}`} />
            <span>{navMode === 'simulation' ? '모의 보행' : '실시간 GPS 추적 중'}</span>
          </button>
        </div>
      </div>

      {/* 🌿 지도 우측 하단 플로팅 컨트롤 (내 위치로 Follow-me 버튼) */}
      <div className="nav-floating-controls">
        <button
          type="button"
          className={`nav-floating-btn ${followUser ? 'is-active' : ''}`}
          onClick={() => {
            setFollowUser(true);
            setToast('내 위치로 지도를 맞춥니다');
          }}
          aria-label="내 위치로 지도 맞춤"
          title="내 위치로"
        >
          <Icon name="crosshair" size={20} />
        </button>
      </div>

      {/* 🌿 하단 내비게이션 바텀 시트 */}
      <section className="map-sheet walk-sheet">
        <div className="walk-next-row">
          <div>
            <span className="walk-label">남은 거리 및 진행률</span>
            <h2>
              {displayRemainingMeters >= 1000
                ? `${(displayRemainingMeters / 1000).toFixed(1)}km 남음`
                : `${displayRemainingMeters}m 남음`}
            </h2>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className="walk-label">소요 시간</span>
            <strong style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
              {formatClock(walkSeconds)}
            </strong>
          </div>
        </div>

        <div className="progress" style={{ marginTop: '12px' }}>
          <div className="progress-bar" style={{ width: `${displayProgress}%` }} />
        </div>
        <div className="progress-foot">
          <span>{displayProgress}% 완료 ({displayMovedKm.toFixed(2)}km 걸음)</span>
          <button
            type="button"
            className="text-btn"
            onClick={() => {
              setIsPaused((paused) => !paused);
              setToast(isPaused ? '산책을 재개합니다' : '산책을 잠시 멈췄습니다');
            }}
          >
            {isPaused ? '계속 걷기' : '잠시 멈추기'}
          </button>
        </div>

        <button type="button" className="btn btn-primary" onClick={() => setShowComplete(true)}>
          산책 완료하기
        </button>
      </section>

      {toast && <div className="toast">{toast}</div>}

      {showComplete && (
        <Sheet
          title="산책을 마칠까요?"
          subtitle="지금까지의 산책 기록이 저장됩니다"
          onClose={() => setShowComplete(false)}
          footer={
            <div className="stack-8">
              <button type="button" className="btn btn-primary" onClick={finishWalk}>
                완료하고 홈으로
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowComplete(false)}>
                계속 걷기
              </button>
            </div>
          }
        >
          <div className="complete-summary">
            <div>
              <span>산책 시간</span>
              <strong>{formatClock(walkSeconds)}</strong>
            </div>
            <div>
              <span>이동 거리</span>
              <strong>{displayMovedKm.toFixed(2)} km</strong>
            </div>
          </div>
          <p className="complete-note">{formatCourseTitle(selectedRoute?.title, walkDurationMin)}</p>
        </Sheet>
      )}

      {loginPrompt && (
        <LoginPrompt
          onClose={() => setLoginPrompt(false)}
          onLogin={() => {
            setLoginPrompt(false);
            onRequireLogin();
          }}
        />
      )}

      {folderSelectRoute && (
        <FolderSelectSheet
          userId={userId}
          route={folderSelectRoute}
          onClose={() => setFolderSelectRoute(null)}
          onSelectFolder={handleSaveToFolder}
          onCreateAndSelect={handleCreateAndSave}
        />
      )}
    </div>
  );
}

function LoginPrompt({ onClose, onLogin }) {
  return (
    <Sheet
      title="로그인이 필요합니다"
      subtitle="로그인 후 내 핀에 경로를 저장할 수 있어요"
      onClose={onClose}
      footer={
        <div className="stack-8">
          <button type="button" className="btn btn-primary" onClick={onLogin}>
            로그인
          </button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            취소
          </button>
        </div>
      }
    >
      <div className="sheet-illustration">
        <Icon name="lock" size={26} />
      </div>
      <p className="sheet-message">저장한 경로는 핀 탭에서 언제든 다시 확인할 수 있어요.</p>
    </Sheet>
  );
}

function NewFolderForm({ onSubmit, onCancel, existingFolders = [] }) {
  const [name, setName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    // 최초 1회만 포커스하여 부모 컴포넌트 렌더링 시 한글 조합(IME) 깨짐 원천 방지
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 60);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = (event) => {
    event?.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setErrorMsg('폴더 이름을 입력해 주세요');
      return;
    }
    if ((existingFolders || []).some((f) => f?.name === trimmed)) {
      setErrorMsg('이미 존재하는 폴더 이름입니다');
      return;
    }
    onSubmit(trimmed);
  };

  return (
    <form
      className="new-folder-card"
      onSubmit={handleSubmit}
      style={{
        marginTop: '12px',
        padding: '16px',
        background: '#f8faf9',
        border: '1.5px solid #d7e3dc',
        borderRadius: '18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <label
          htmlFor="new-sheet-folder-name"
          style={{ fontSize: '13px', fontWeight: 700, color: '#1a221e' }}
        >
          📁 새 폴더 이름
        </label>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '12px',
              color: '#87938c',
              cursor: 'pointer',
              padding: '2px 4px'
            }}
          >
            닫기 ✕
          </button>
        )}
      </div>

      <div style={{ width: '100%', position: 'relative' }}>
        <input
          ref={inputRef}
          id="new-sheet-folder-name"
          className="input"
          placeholder="예: 우리 동네, 주말 코스"
          value={name}
          maxLength={20}
          onChange={(event) => {
            setName(event.target.value);
            setErrorMsg('');
          }}
          style={{
            width: '100%',
            height: '46px',
            fontSize: '14px',
            boxSizing: 'border-box',
            borderRadius: '12px',
            background: '#ffffff',
            border: errorMsg ? '1.5px solid #e53e3e' : '1px solid #d7e3dc'
          }}
        />
      </div>

      {errorMsg && (
        <p style={{ color: '#e53e3e', fontSize: '12px', margin: '-4px 0 0 2px', fontWeight: 600 }}>
          {errorMsg}
        </p>
      )}

      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{
              flex: 1,
              height: '44px',
              borderRadius: '12px',
              border: '1px solid #d7e3dc',
              background: '#ffffff',
              color: '#4e5b53',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            취소
          </button>
        )}
        <button
          type="submit"
          style={{
            flex: onCancel ? 1.4 : 1,
            height: '44px',
            borderRadius: '12px',
            border: 'none',
            background: 'var(--emerald, #5fb294)',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 3px 10px rgba(95, 178, 148, 0.28)'
          }}
        >
          폴더 생성 및 저장
        </button>
      </div>
    </form>
  );
}

const FolderSelectSheet = React.memo(function FolderSelectSheet({
  userId,
  route,
  onClose,
  onSelectFolder,
  onCreateAndSelect,
}) {
  const [folders, setFolders] = useState(() => getPinFolders(userId));
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (userId && userId !== 'guest') {
      fetchPinFolders(userId)
        .then((res) => {
          if (Array.isArray(res) && res.length > 0) {
            setFolders(res);
          }
        })
        .catch(() => {});
    }
  }, [userId]);

  const handleCreateSubmit = (trimmedName) => {
    const created = createPinFolder(userId, trimmedName);
    if (created) {
      setFolders(getPinFolders(userId));
      onCreateAndSelect(created);
    }
  };

  return (
    <Sheet
      title="어느 폴더에 저장할까요?"
      subtitle={route ? `선택 코스: ${formatCourseTitle(route.title, Number(route.durationMin ?? route.duration_minutes ?? route.duration ?? 25))}` : '저장할 폴더를 선택하세요'}
      onClose={onClose}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '55vh', overflowY: 'auto' }}>
        <div className="folder-list" style={{ overflowY: 'visible' }}>
          {folders.map((folder) => (
            <button
              key={folder.id}
              type="button"
              className="folder-row"
              onClick={() => onSelectFolder(folder)}
            >
              <span className="folder-icon">
                <Icon name="folder" size={18} />
              </span>
              <span className="folder-text">
                <strong>{folder.name}</strong>
                <small>저장 코스 {folder.pins?.length || 0}개</small>
              </span>
              <Icon name="chevron-right" size={18} />
            </button>
          ))}
        </div>

        {isCreating ? (
          <NewFolderForm onSubmit={handleCreateSubmit} onCancel={() => setIsCreating(false)} existingFolders={folders} />
        ) : (
          <button
            type="button"
            className="btn btn-ghost folder-add"
            onClick={() => setIsCreating(true)}
            style={{ width: '100%', marginTop: '4px' }}
          >
            <Icon name="plus" size={17} /> 새 폴더 만들기
          </button>
        )}
      </div>
    </Sheet>
  );
});
