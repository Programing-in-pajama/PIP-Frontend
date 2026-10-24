import React, { useEffect, useMemo, useState } from 'react';
import Icon from '../components/Icons';
import Sheet from '../components/Sheet';
import SoyoMap from '../components/SoyoMap';
import { supabase } from '../supabaseClient';
import { DEFAULT_REGION, REGIONS, WALK_MINUTES, getRoutes } from '../data/routes';
import { formatClock, formatDistance } from '../utils/format';
import {
  isRoutePinned,
  removeRoutePinEverywhere,
  saveRoutePin,
} from '../api/pins';

export default function WalkFlow({
  isLoggedIn,
  userId = 'guest',
  startRoute = null,
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
  const [showComplete, setShowComplete] = useState(false);

  useEffect(() => {
    onSectionChange?.(step);
  }, [step, onSectionChange]);

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
    () => (selectedRoute ? isRoutePinned(userId, selectedRoute.id) : false),
    [userId, selectedRoute, pinVersion],
  );

  const progress = selectedRoute
    ? Math.min(99, Math.round((walkSeconds / Math.max(1, selectedRoute.durationMin * 60)) * 100))
    : 0;
  const movedKm = selectedRoute ? (selectedRoute.distanceKm * progress) / 100 : 0;
  const remainingMeters = selectedRoute
    ? Math.max(0, Math.round(selectedRoute.distanceKm * 1000 * (1 - progress / 100)))
    : 0;

  const nextDirection =
    progress < 25
      ? '잠시 후 오른쪽 골목으로 이동하세요'
      : progress < 55
        ? '120m 앞에서 오른쪽으로 이동'
        : progress < 85
          ? '곧 왼쪽으로 크게 돌아가세요'
          : '목적지가 바로 앞에 있어요';

  const startRegion = (nextRegion) => {
    setRegion(nextRegion);
    setRegionQuery('');
    setStep('setup');
  };

  const searchRoutes = () => {
    let list = getRoutes(region, minutes, userDiseases);
    if (includeRestaurant) {
      const filtered = list.filter((r) => r.hasRestaurant);
      list = filtered.length > 0 ? filtered : list;
    } else {
      const filtered = list.filter((r) => !r.hasRestaurant);
      list = filtered.length > 0 ? filtered : list.map((r) => ({ ...r, hasRestaurant: false, restaurant: null }));
    }
    setRoutes(list);
    setStep('list');
  };

  const openRoute = (route) => {
    setSelectedRoute(route);
    setStep('detail');
  };

  const togglePin = (route) => {
    if (!isLoggedIn) {
      setLoginPrompt(true);
      return;
    }
    if (isRoutePinned(userId, route.id)) {
      removeRoutePinEverywhere(userId, route.id);
      setToast('핀 저장을 해제했어요');
    } else {
      saveRoutePin(userId, route);
      setToast('내 핀에 경로를 저장했어요');
    }
    setPinVersion((version) => version + 1);
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
          <button type="button" className="search-bar" onClick={() => setStep('region')}>
            <span>어디서 산책할까요?</span>
            <Icon name="search" size={20} />
          </button>
          <button
            type="button"
            className="map-close"
            aria-label="지역 선택 초기화"
            onClick={() => {
              setRegion(DEFAULT_REGION);
              setToast('기본 지역으로 돌아왔어요');
            }}
          >
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="map-hint">
          <span className="map-hint-dot" />
          {region.short} 근처에서 산책 코스를 찾아보세요
        </div>

        {!isLoggedIn && (
          <div
            className="guest-banner"
            onClick={onRequireLogin}
            role="button"
            tabIndex={0}
            style={{
              position: 'absolute',
              bottom: '24px',
              left: '16px',
              right: '16px',
              background: 'rgba(17, 24, 39, 0.92)',
              color: '#ffffff',
              padding: '14px 18px',
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
              <strong style={{ fontSize: '14px', display: 'block', marginBottom: '2px' }}>비회원 둘러보기 중</strong>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>로그인하면 건강 맞춤 코스 추천과 핀 저장이 가능해요.</div>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 'bold', background: '#3b82f6', color: '#fff', padding: '6px 12px', borderRadius: '8px' }}>
              로그인
            </span>
          </div>
        )}
        {toast && <div className="toast">{toast}</div>}
      </div>
    );
  }

  // ── No.5 지역 검색 ───────────────────────────────────────────
  if (step === 'region') {
    return (
      <div className="screen screen--map">
        <SoyoMap variant="search" region={region} className="map-fill" />
        <div className="map-top map-top--search">
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
          <button type="button" className="map-close" onClick={() => setStep('home')} aria-label="닫기">
            <Icon name="close" size={18} />
          </button>
        </div>

        <section className="map-sheet region-sheet" aria-label="지역 검색 결과">
          <div className="sheet-grip" />
          <button
            type="button"
            className="focus-chip"
            onClick={() => {
              setRegionQuery('');
              setToast('지도를 현재 위치에 맞췄어요');
            }}
          >
            <Icon name="target" size={14} /> 지도초점
          </button>

          <div className="region-list">
            {filteredRegions.map((item) => (
              <button key={item.id} type="button" className="region-row" onClick={() => startRegion(item)}>
                <span className="region-text">
                  <strong>{item.name}</strong>
                  <small>{formatDistance(item.distanceKm)}</small>
                </span>
                <span className="region-arrow">
                  <Icon name="arrow-right" size={17} />
                </span>
              </button>
            ))}
            {filteredRegions.length === 0 && (
              <div className="empty-state compact">
                <strong>검색 결과가 없어요</strong>
                <p>동 이름의 일부를 다시 입력해 주세요.</p>
              </div>
            )}
          </div>
        </section>
        {toast && <div className="toast">{toast}</div>}
      </div>
    );
  }

  // ── No.6 코스 설정 (식당 여부 제외) ──────────────────────────
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
            <span className="field-label">식당 포함 여부</span>
            <div className="chip-row">
              <button
                type="button"
                className={`chip ${includeRestaurant ? 'chip--active' : ''}`}
                onClick={() => setIncludeRestaurant(true)}
              >
                🍴 식당 포함 (Yes)
              </button>
              <button
                type="button"
                className={`chip ${!includeRestaurant ? 'chip--active' : ''}`}
                onClick={() => setIncludeRestaurant(false)}
              >
                산책로만 (No)
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
            const saved = isRoutePinned(userId, route.id);
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
              <div className="restaurant-detail-header">
                <div className="restaurant-title-row">
                  <span className="restaurant-badge">🍴 추천 식당</span>
                  <strong>{selectedRoute.restaurant.name}</strong>
                  <span className={`nutrition-pill nutrition-pill--${selectedRoute.restaurant.grade || 'green'}`}>
                    {selectedRoute.restaurant.dot || '🟢'} {selectedRoute.restaurant.badgeLabel || '안심식당'}
                  </span>
                </div>
                <p className="restaurant-address">{selectedRoute.restaurant.address || selectedRoute.restaurant.category}</p>
              </div>

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
                  <div className="foods-list-title">식약처 영양성분 DB 기반 대표 메뉴</div>
                  {selectedRoute.restaurant.foods.map((food, idx) => (
                    <div key={idx} className="food-item-card">
                      <div className="food-item-header">
                        <strong className="food-name">{food.name}</strong>
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
