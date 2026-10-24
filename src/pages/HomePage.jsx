import React, { useState, useMemo } from 'react';
import { MOCK_ROUTES } from '../data/mockRoutes';

export default function HomePage({ onSelectRoute, isLoggedIn = false, onGoToLogin }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMinutes, setSelectedMinutes] = useState('all'); // 'all' | '10' | '25' | '60'
  const [restaurantFilter, setRestaurantFilter] = useState('all'); // 'all' | 'with' | 'without'

  // 필터링된 코스 목록
  const filteredRoutes = useMemo(() => {
    return MOCK_ROUTES.filter((r) => {
      // 1. 검색어 필터
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matched = r.title.toLowerCase().includes(query) ||
          r.region.toLowerCase().includes(query) ||
          (r.restaurant && r.restaurant.name.toLowerCase().includes(query));
        if (!matched) return false;
      }

      // 2. 시간 필터
      if (selectedMinutes === '10' && r.durationMin > 18) return false;
      if (selectedMinutes === '25' && (r.durationMin <= 18 || r.durationMin > 40)) return false;
      if (selectedMinutes === '60' && r.durationMin <= 40) return false;

      // 3. 식당 유무 필터
      if (restaurantFilter === 'with' && !r.hasRestaurant) return false;
      if (restaurantFilter === 'without' && r.hasRestaurant) return false;

      return true;
    });
  }, [searchTerm, selectedMinutes, restaurantFilter]);

  return (
    <div style={{ padding: '16px', paddingBottom: '80px', background: '#f8fafc', minHeight: '100vh' }}>
      {/* 상단 서비스 헤더 */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="/pic/SOYO.png" alt="SOYO 로고" style={{ width: '28px', height: '28px', borderRadius: '6px' }} onError={(e) => { e.target.style.display = 'none'; }} />
          <span style={{ fontSize: '18px', fontWeight: '800', color: '#16a34a' }}>소요 (SOYO)</span>
        </div>
        {!isLoggedIn ? (
          <button
            type="button"
            onClick={onGoToLogin}
            style={{ fontSize: '12px', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '14px', padding: '5px 10px', cursor: 'pointer', fontWeight: 600 }}
          >
            로그인
          </button>
        ) : (
          <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600, background: '#dcfce7', padding: '4px 8px', borderRadius: '12px' }}>
            맞춤 건강 케어 ON
          </span>
        )}
      </header>

      {/* 검색창 */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="지역, 공원, 안심식당 검색 (예: 부천, 중앙공원)"
          style={{
            width: '100%',
            padding: '12px 14px 12px 38px',
            borderRadius: '12px',
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            fontSize: '14px',
            boxSizing: 'border-box',
            outline: 'none',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}
        />
        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', color: '#94a3b8' }}>
          🔍
        </span>
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '14px' }}
          >
            ✕
          </button>
        )}
      </div>

      {/* 산책 조건 필터: 시간 선택 (10분 / 25분 / 60분) */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
          ⏱️ 목표 산책 시간
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[
            { id: 'all', label: '전체' },
            { id: '10', label: '약 10분' },
            { id: '25', label: '약 25분' },
            { id: '60', label: '약 60분' }
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedMinutes(item.id)}
              style={{
                flex: 1,
                padding: '8px 0',
                borderRadius: '8px',
                border: selectedMinutes === item.id ? '2px solid #16a34a' : '1px solid #e2e8f0',
                background: selectedMinutes === item.id ? '#ecfdf5' : '#ffffff',
                color: selectedMinutes === item.id ? '#16a34a' : '#475569',
                fontSize: '12px',
                fontWeight: selectedMinutes === item.id ? 700 : 500,
                cursor: 'pointer'
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 식당 포함 여부 필터 (Yes / No) */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
          🍽️ 식당 포함 여부
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[
            { id: 'all', label: '전체' },
            { id: 'with', label: 'Yes (안심식당 포함)' },
            { id: 'without', label: 'No (산책만)' }
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setRestaurantFilter(item.id)}
              style={{
                flex: 1,
                padding: '8px 0',
                borderRadius: '8px',
                border: restaurantFilter === item.id ? '2px solid #16a34a' : '1px solid #e2e8f0',
                background: restaurantFilter === item.id ? '#ecfdf5' : '#ffffff',
                color: restaurantFilter === item.id ? '#16a34a' : '#475569',
                fontSize: '12px',
                fontWeight: restaurantFilter === item.id ? 700 : 500,
                cursor: 'pointer'
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 개인화 웰니스 안내 배너 */}
      {isLoggedIn && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '10px 12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>🩺</span>
          <div style={{ fontSize: '12px', color: '#166534', lineHeight: 1.4 }}>
            <strong>개인 맞춤 신호등 분석</strong>: 등록하신 건강정보(혈압/혈당)에 맞춰 식단의 나트륨·당류 신호등을 표시합니다.
          </div>
        </div>
      )}

      {/* 추천 코스 목록 */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
            추천 산책 코스 ({filteredRoutes.length}개)
          </span>
        </div>

        {filteredRoutes.length === 0 ? (
          <div style={{ background: '#ffffff', borderRadius: '12px', padding: '30px 20px', textAlign: 'center', color: '#94a3b8' }}>
            조건에 맞는 산책 코스가 없습니다.<br />
            시간이나 식당 필터를 변경해보세요.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredRoutes.map((route) => (
              <div
                key={route.id}
                onClick={() => onSelectRoute(route)}
                style={{
                  background: '#ffffff',
                  borderRadius: '12px',
                  padding: '16px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                  border: '1px solid #f1f5f9',
                  cursor: 'pointer',
                  transition: 'transform 0.15s, box-shadow 0.15s'
                }}
              >
                {/* 뱃지 영역 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#dcfce7', color: '#16a34a' }}>
                    약 {route.durationMin}분
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    {route.distanceKm} km · {route.difficulty}
                  </span>
                  {route.barrierFree && (
                    <span style={{ fontSize: '11px', color: '#0284c7', background: '#e0f2fe', padding: '2px 6px', borderRadius: '4px' }}>
                      ♿ 무장애길
                    </span>
                  )}
                </div>

                {/* 코스 제목 */}
                <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 'bold', color: '#0f172a' }}>
                  {route.title}
                </h4>

                <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>
                  {route.description}
                </p>

                {/* 식당 포함 시 신호등 배지 */}
                {route.restaurant && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: route.restaurant.nutritionGrade === 'green' ? '#f0fdf4' : '#fefce8',
                    border: `1px solid ${route.restaurant.nutritionGrade === 'green' ? '#bbf7d0' : '#fef08a'}`,
                    borderRadius: '8px',
                    padding: '8px 10px',
                    fontSize: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{route.restaurant.nutritionGrade === 'green' ? '🟢' : '🟡'}</span>
                      <strong style={{ color: '#0f172a' }}>{route.restaurant.name}</strong>
                    </div>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: route.restaurant.nutritionGrade === 'green' ? '#15803d' : '#a16207'
                    }}>
                      {route.restaurant.gradeLabel}
                    </span>
                  </div>
                )}

                {/* 하단 시작 버튼 */}
                <div style={{ marginTop: '12px', textAlign: 'right' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a' }}>
                    코스 상세 & 지도 보기 ›
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
