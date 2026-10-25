import React, { useEffect, useMemo, useState } from 'react';
import Icon from '../components/Icons';
import Sheet from '../components/Sheet';
import SoyoMap from '../components/SoyoMap';
import { supabase } from '../supabaseClient';
import { DEFAULT_REGION, REGIONS, WALK_MINUTES, getRoutes } from '../data/routes';
import { fetchRecommendedRoutes } from '../api/routes';
import { formatClock, formatDistance } from '../utils/format';
import {
  createPinFolder,
  fetchPinFolders,
  getPinFolders,
  isRoutePinned,
  removeRoutePinEverywhere,
  saveRoutePin,
} from '../api/pins';

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
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [regionQuery, setRegionQuery] = useState('');
  const [minutes, setMinutes] = useState(25);
  const [includeRestaurant, setIncludeRestaurant] = useState(true);
  const [routes, setRoutes] = useState(() => getRoutes(DEFAULT_REGION, 25, userDiseases));
  const [selectedRoute, setSelectedRoute] = useState(startRoute);
  const [walkSeconds, setWalkSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [pinVersion, setPinVersion] = useState(0);
  const [toast, setToast] = useState('');
  const [loginPrompt, setLoginPrompt] = useState(false);
  const [folderSelectRoute, setFolderSelectRoute] = useState(null);
  const [showComplete, setShowComplete] = useState(false);
  const [showNutritionDetail, setShowNutritionDetail] = useState(false);

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

  const filteredRegions = useMemo(() => {
    const keyword = regionQuery.trim();
    if (!keyword) return REGIONS;
    return REGIONS.filter(
      (item) => item.name.includes(keyword) || item.short.includes(keyword),
    );
  }, [regionQuery]);

  const pinned = useMemo(
    () => (selectedRoute ? isRoutePinned(userId, selectedRoute.id, selectedRoute.title) : false),
    [userId, selectedRoute, pinVersion],
  );

  const progress = selectedRoute
    ? Math.min(99, Math.round((walkSeconds / Math.max(1, selectedRoute.durationMin * 60)) * 100))
    : 0;
  const movedKm = selectedRoute ? (selectedRoute.distanceKm * progress) / 100 : 0;
  const remainingMeters = selectedRoute
    ? Math.max(0, Math.round(selectedRoute.distanceKm * 1000 * (1 - progress / 100)))
    : 0;

  const nextDirection = useMemo(() => {
    if (Array.isArray(selectedRoute?.turnByTurn) && selectedRoute.turnByTurn.length > 0) {
      const idx = Math.min(
        selectedRoute.turnByTurn.length - 1,
        Math.floor((progress / 100) * selectedRoute.turnByTurn.length)
      );
      return selectedRoute.turnByTurn[idx];
    }
    return progress < 25
      ? '잠시 후 오른쪽 골목으로 이동하세요'
      : progress < 55
        ? '120m 앞에서 오른쪽으로 이동'
        : progress < 85
          ? '곧 왼쪽으로 크게 돌아가세요'
          : '목적지가 바로 앞에 있어요';
  }, [selectedRoute, progress]);

  const startRegion = (nextRegion) => {
    setRegion(nextRegion);
    setRegionQuery('');
    setStep('setup');
  };

  const searchRoutes = async () => {
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
    setWalkSeconds(0);
    setIsPaused(false);
    setStep('walking');
  };

  const finishWalk = () => {
    try {
      const records = JSON.parse(localStorage.getItem('soyo-walk-records') || '[]');
      records.unshift({
        id: `walk-${Date.now()}`,
        title: selectedRoute?.title,
        region: region.name,
        durationMinutes: Math.max(1, Math.round(walkSeconds / 60)),
        distanceKm: Number(movedKm.toFixed(2)),
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
            walk_distance_km: Number(movedKm.toFixed(2)) || 1.4,
            perceived_difficulty: '보통'
          }
        ]).then(() => {});
      } catch {
        // ignore
      }
    }
    setShowComplete(false);
    setStep('home');
    setSelectedRoute(null);
    setWalkSeconds(0);
    setToast('오늘의 산책을 마쳤어요');
  };

  // ── No.4 메인 지도 ───────────────────────────────────────────
  if (step === 'home') {
    return (
      <div className="screen screen--map">
        <SoyoMap showUser region={region} className="map-fill" />
        <div className="map-top">
          <button type="button" className="search-bar search-bar--full" onClick={() => setStep('region')}>
            <span>어디서 산책할까요?</span>
            <Icon name="search" size={20} />
          </button>
        </div>
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
    return (
      <div className="screen screen--map">
        <SoyoMap variant="search" region={region} className="map-fill" />

        <div className="region-header-overlay">
          <header className="page-head page-head--back" style={{ marginBottom: 12 }}>
            <button type="button" className="back-btn" onClick={() => setStep('home')} aria-label="뒤로">
              <Icon name="chevron-left" size={22} />
            </button>
            <div>
              <h1 style={{ fontSize: '20px' }}>지역 검색</h1>
              <p style={{ fontSize: '11.5px', color: 'var(--muted)' }}>1 / 3 산책할 지역을 선택하세요</p>
            </div>
          </header>

          <div className="search-bar search-bar--input">
            <input
              value={regionQuery}
              onChange={(event) => setRegionQuery(event.target.value)}
              placeholder="역곡"
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
            <span className="search-icon"><Icon name="search" size={20} /></span>
          </div>

          {regionQuery && filteredRegions.length > 0 && (
            <div className="region-dropdown">
              {filteredRegions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="region-dropdown-item"
                  onClick={() => {
                    setRegion(item);
                    setRegionQuery('');
                  }}
                >
                  <strong>{item.name}</strong>
                  <small>{formatDistance(item.distanceKm)}</small>
                </button>
              ))}
            </div>
          )}
        </div>

        <section className="map-sheet region-card-sheet" aria-label="선택된 지역 정보">
          <div className="sheet-grip" />
          <div className="region-card-info">
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <strong style={{ fontSize: '20px', fontWeight: 800, color: 'var(--ink)' }}>{region.short || region.name}</strong>
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>{region.name} 주변</span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--muted-2)', marginTop: '4px' }}>
              지도에서 산책할 지역을 선택해 주세요.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setStep('setup')}
            style={{ width: '100%', marginTop: '16px' }}
          >
            이 지역 선택
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
          <button type="button" className="back-btn" onClick={() => setStep('region')} aria-label="뒤로">
            <Icon name="chevron-left" size={22} />
          </button>
          <div>
            <h1>코스 설정</h1>
            <p>2 / 2 코스를 설정하세요</p>
          </div>
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
          <button type="button" className="back-btn" onClick={() => setStep('setup')} aria-label="뒤로">
            <Icon name="chevron-left" size={22} />
          </button>
          <div>
            <h1>추천 코스</h1>
            <p>조건에 맞는 {routes.length}가지 코스를 찾았어요</p>
          </div>
        </header>

        <div className="filter-chips">
          <span className="chip chip--active">{region.short}</span>
          <span className="chip chip--active">약 {minutes}분</span>
          <span className="chip chip--active">{includeRestaurant ? '🍴 식당 포함' : '산책만'}</span>
        </div>

        {userDiseases.length > 0 && (
          <div className="health-match-notice">
            <span className="health-match-icon">🩺</span>
            <div>
              <strong>기저질환 맞춤 3색 신호등 필터링 적용 중</strong>
              <p>회원님의 건강 정보({userDiseases.length}개 질환) 1끼 임계치를 엄격 병합하여 가장 안전한 안심 메뉴를 우선 추천해요.</p>
            </div>
          </div>
        )}

        <div className="course-list">
          {routes.map((route) => {
            const saved = isRoutePinned(userId, route.id, route.title);
            return (
              <article key={route.id} className="course-card">
                <button type="button" className="course-card-main" onClick={() => openRoute(route)}>
                  <strong>{route.title}</strong>
                  <span className="course-meta">
                    약 {route.durationMin}분 · {formatDistance(route.distanceKm)} ·{' '}
                    {route.hasRestaurant ? '식당 포함' : '산책만'}
                  </span>
                  {route.restaurant && (
                    <div className="course-restaurant-badge">
                      <span>🍴 {route.restaurant.name}</span>
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
          <h2>{selectedRoute.title}</h2>
          <p className="route-meta">
            약 {selectedRoute.durationMin}분 · {formatDistance(selectedRoute.distanceKm)} ·{' '}
            {selectedRoute.hasRestaurant ? '식당 포함' : '산책만'}
          </p>
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
                  <span className="restaurant-badge">🍴 추천 식당</span>
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
                    <div style={{ background: '#fef3c7', color: '#92400e', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, marginBottom: '12px', border: '1px solid #fde68a' }}>
                      📢 {selectedRoute.restaurant.substituteNotice}
                    </div>
                  )}

                  {selectedRoute.restaurant.threshold && (
                    <div className="disease-threshold-box">
                      <div className="threshold-title">
                        <span>🩺 {selectedRoute.restaurant.threshold.isDefault ? '일반 성인 1끼 권장 기준' : `${selectedRoute.restaurant.threshold.name} 1끼 상한`}</span>
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
                              💡 {food.guideAdvice}
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

  // ── No.10 산책 진행 ──────────────────────────────────────────
  return (
    <div className="screen screen--map">
      <SoyoMap route={selectedRoute} className="map-fill" />

      <div className="walk-stats">
        <div className="walk-stat">
          <span>진행 시간</span>
          <strong>{formatClock(walkSeconds)}</strong>
        </div>
        <div className="walk-stat walk-stat--right">
          <span>이동 거리</span>
          <strong className="accent">{movedKm.toFixed(2)} km</strong>
        </div>
      </div>

      <section className="map-sheet walk-sheet">
        <div className="walk-next-row">
          <div>
            <span className="walk-label">다음 안내</span>
            <h2>{nextDirection}</h2>
          </div>
          <button
            type="button"
            className={`bookmark-btn ${pinned ? 'is-on' : ''}`}
            aria-label={pinned ? '핀 저장 해제' : '현재 경로를 핀에 저장'}
            aria-pressed={pinned}
            onClick={() => togglePin(selectedRoute)}
          >
            <Icon name={pinned ? 'bookmark-filled' : 'bookmark'} size={21} />
          </button>
        </div>

        <p className="walk-remaining">
          현재 {remainingMeters >= 1000 ? `${(remainingMeters / 1000).toFixed(1)}km` : `${remainingMeters}m`} 남았습니다
        </p>
        <div className="progress">
          <div className="progress-bar" style={{ width: `${progress}%` }} />
        </div>
        <div className="progress-foot">
          <span>{progress}% 완료</span>
          <button type="button" className="text-btn" onClick={() => setIsPaused((paused) => !paused)}>
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
              <strong>{movedKm.toFixed(2)} km</strong>
            </div>
          </div>
          <p className="complete-note">{selectedRoute?.title}</p>
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

function FolderSelectSheet({
  userId,
  route,
  onClose,
  onSelectFolder,
  onCreateAndSelect,
}) {
  const [folders, setFolders] = useState(() => getPinFolders(userId));
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

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

  const handleCreateSubmit = (event) => {
    event?.preventDefault();
    const trimmed = newFolderName.trim();
    if (!trimmed) {
      setErrorMsg('폴더 이름을 입력해 주세요');
      return;
    }
    if (folders.some((f) => f.name === trimmed)) {
      setErrorMsg('이미 존재하는 폴더 이름입니다');
      return;
    }
    const created = createPinFolder(userId, trimmed);
    if (created) {
      onCreateAndSelect(created);
    } else {
      setErrorMsg('폴더를 생성하지 못했습니다');
    }
  };

  return (
    <Sheet
      title="어느 폴더에 저장할까요?"
      subtitle={route ? `선택 코스: ${route.title}` : '저장할 폴더를 선택하세요'}
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
          <form className="folder-form" onSubmit={handleCreateSubmit} style={{ marginTop: '8px' }}>
            <label
              className="field-label"
              htmlFor="new-sheet-folder-name"
              style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
            >
              새 폴더 이름
            </label>
            <div className="input-wrap" style={{ display: 'flex', gap: '8px' }}>
              <input
                id="new-sheet-folder-name"
                className="input"
                placeholder="예: 우리 동네, 주말 코스"
                value={newFolderName}
                onChange={(event) => {
                  setNewFolderName(event.target.value);
                  setErrorMsg('');
                }}
                autoFocus
                style={{ flex: 1 }}
              />
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 'none', padding: '0 16px', height: '44px', minHeight: '44px' }}
              >
                만들고 저장
              </button>
            </div>
            {errorMsg && (
              <p className="form-message" style={{ color: '#e53e3e', fontSize: '12px', marginTop: '4px' }}>
                {errorMsg}
              </p>
            )}
          </form>
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
}
