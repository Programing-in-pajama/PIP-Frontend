import React, { useState } from 'react';
import KakaoMap from '../components/KakaoMap';
import { supabase } from '../supabaseClient';

export default function WalkPage({ selectedRoute, onSelectRoute, onFinishWalk, onBackToHome }) {
  const [isSaved, setIsSaved] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  // 경로 북마크(핀) 저장 핸들러
  const handleTogglePin = async () => {
    if (!selectedRoute) return;
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);

    // 1. 로컬 스토리지 즉각 반영 (오프라인 지원)
    try {
      const savedList = JSON.parse(localStorage.getItem('soyo-saved-pins') || '[]');
      if (nextSaved) {
        if (!savedList.some((r) => r.id === selectedRoute.id)) {
          savedList.push(selectedRoute);
          localStorage.setItem('soyo-saved-pins', JSON.stringify(savedList));
        }
        showToast('📌 경로가 핀 보관함에 저장되었습니다.');
      } else {
        const filtered = savedList.filter((r) => r.id !== selectedRoute.id);
        localStorage.setItem('soyo-saved-pins', JSON.stringify(filtered));
        showToast('핀 저장이 해제되었습니다.');
      }
    } catch (e) {
      console.warn('핀 저장 실패:', e);
    }

    // 2. Supabase DB 연동 (saved_routes 테이블 영구 보관)
    const currentUserId = localStorage.getItem('soyo-current-user-id');
    if (supabase && currentUserId) {
      try {
        if (nextSaved) {
          console.log('🚀 [Supabase DB] saved_routes 테이블에 핀 저장 시도:', selectedRoute.title);
          const { error } = await supabase.from('saved_routes').insert([
            {
              user_id: currentUserId,
              title: selectedRoute.title,
              start_place_name: selectedRoute.startPoint?.name || '출발지',
              start_lat: selectedRoute.startPoint?.lat || null,
              start_lng: selectedRoute.startPoint?.lng || null,
              dest_place_name: selectedRoute.destPoint?.name || '도착지',
              dest_lat: selectedRoute.destPoint?.lat || null,
              dest_lng: selectedRoute.destPoint?.lng || null,
              has_restaurant: Boolean(selectedRoute.hasRestaurant),
              duration_minutes: selectedRoute.durationMin || 0,
              distance_meters: Math.round((selectedRoute.distanceKm || 0) * 1000),
              route_geojson: {
                type: 'LineString',
                coordinates: selectedRoute.path?.map((p) => [p.lng, p.lat]) || []
              }
            }
          ]);
          if (error) {
            console.warn('⚠️ [Supabase DB] saved_routes 저장 응답:', error.message);
          } else {
            console.log('✅ [Supabase DB] saved_routes 테이블에 핀 영구 저장 성공');
          }
        }
      } catch (dbErr) {
        console.warn('⚠️ [Supabase DB] 핀 저장 예외:', dbErr.message);
      }
    }
  };

  // 산책 완료하기 클릭
  const handleCompleteWalk = async () => {
    setShowCompleteModal(true);

    // 1. 완보 기록 로컬 스토리지 보관
    try {
      const records = JSON.parse(localStorage.getItem('soyo-walk-records') || '[]');
      records.unshift({
        id: 'rec-' + Date.now(),
        routeId: selectedRoute?.id,
        title: selectedRoute?.title || '자유 산책',
        distanceKm: selectedRoute?.distanceKm || 1.2,
        durationMinutes: selectedRoute?.durationMin || 20,
        completedAt: new Date().toISOString()
      });
      localStorage.setItem('soyo-walk-records', JSON.stringify(records));
    } catch (e) {
      // ignore
    }

    // 2. Supabase DB 연동 (walk_records 테이블 영구 저장)
    const currentUserId = localStorage.getItem('soyo-current-user-id');
    if (supabase && currentUserId) {
      try {
        console.log('🚀 [Supabase DB] walk_records 완보 기록 저장 시도...');
        const { error } = await supabase.from('walk_records').insert([
          {
            user_id: currentUserId,
            destination_name: selectedRoute?.destPoint?.name || selectedRoute?.title || '산책 완료지',
            walk_duration_minutes: selectedRoute?.durationMin || 20,
            walk_distance_km: selectedRoute?.distanceKm || 1.2,
            perceived_difficulty: selectedRoute?.difficulty || '초급(완만)'
          }
        ]);
        if (error) {
          console.warn('⚠️ [Supabase DB] walk_records 저장 응답:', error.message);
        } else {
          console.log('✅ [Supabase DB] walk_records 테이블에 완보 기록 저장 성공');
        }
      } catch (dbErr) {
        console.warn('⚠️ [Supabase DB] 완보 기록 저장 예외:', dbErr.message);
      }
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      {/* 상단 헤더 */}
      <header style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '56px',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        zIndex: 20
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={onBackToHome}
            style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#16a34a', padding: '4px' }}
            title="홈으로"
          >
            ‹
          </button>
          <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#0f172a' }}>
            {selectedRoute ? selectedRoute.title : '소요 실시간 산책 지도'}
          </span>
        </div>

        {selectedRoute && (
          <button
            type="button"
            onClick={handleTogglePin}
            style={{
              background: isSaved ? '#16a34a' : '#f1f5f9',
              color: isSaved ? '#ffffff' : '#64748b',
              border: 'none',
              borderRadius: '20px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.2s'
            }}
          >
            <span>📌</span>
            <span>{isSaved ? '저장됨' : '경로 저장'}</span>
          </button>
        )}
      </header>

      {/* 카카오 지도 영역 */}
      <div style={{ flex: 1, marginTop: '56px', position: 'relative' }}>
        <KakaoMap selectedRoute={selectedRoute} height="100%" />

        {/* 토스트 알림 */}
        {toastMessage && (
          <div style={{
            position: 'absolute',
            top: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(15, 23, 42, 0.9)',
            color: '#ffffff',
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: 500,
            zIndex: 30,
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}>
            {toastMessage}
          </div>
        )}
      </div>

      {/* 하단 산책 제어/정보 카드 */}
      <div style={{
        background: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        padding: '16px',
        zIndex: 20,
        boxShadow: '0 -4px 12px rgba(0,0,0,0.06)'
      }}>
        {selectedRoute ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#dcfce7', color: '#16a34a' }}>
                    {selectedRoute.difficulty}
                  </span>
                  {selectedRoute.barrierFree && (
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#e0f2fe', color: '#0284c7' }}>
                      ♿ 무장애
                    </span>
                  )}
                  {selectedRoute.restaurant && (
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: selectedRoute.restaurant.nutritionGrade === 'green' ? '#ecfdf5' : '#fef9c3',
                      color: selectedRoute.restaurant.nutritionGrade === 'green' ? '#059669' : '#ca8a04'
                    }}>
                      {selectedRoute.restaurant.gradeLabel}
                    </span>
                  )}
                </div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: '#0f172a' }}>
                  {selectedRoute.title}
                </h3>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '18px', fontWeight: 800, color: '#16a34a' }}>
                  약 {selectedRoute.durationMin}분
                </span>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  {selectedRoute.distanceKm} km
                </div>
              </div>
            </div>

            {/* 식당 안내가 있을 때 요약 박스 */}
            {selectedRoute.restaurant && (
              <div style={{ background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '8px', padding: '8px 12px', marginBottom: '12px', fontSize: '12px', color: '#334155' }}>
                <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '2px' }}>
                  🍽️ 추천 안심식당: {selectedRoute.restaurant.name}
                </div>
                <div style={{ color: '#64748b' }}>
                  추천메뉴: {selectedRoute.restaurant.menu} · {selectedRoute.restaurant.calorie} kcal
                </div>
              </div>
            )}

            {/* 산책 완료하기 버튼 */}
            <button
              type="button"
              onClick={handleCompleteWalk}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                background: '#16a34a',
                color: '#ffffff',
                border: 'none',
                fontSize: '15px',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(22, 163, 74, 0.3)'
              }}
            >
              산책 완료하기
            </button>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#64748b' }}>
              현재 위치 주변 지도입니다. 코스를 선택해 산책을 시작해보세요!
            </p>
            <button
              type="button"
              onClick={onBackToHome}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                background: '#16a34a',
                color: '#ffffff',
                border: 'none',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              추천 산책 코스 보러가기
            </button>
          </div>
        )}
      </div>

      {/* 산책 완료 축하 모달 */}
      {showCompleteModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '340px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 8px 0', color: '#0f172a' }}>
              산책을 멋지게 완보하셨어요!
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px 0', lineHeight: 1.5 }}>
              총 <strong>{selectedRoute?.distanceKm || 1.2} km</strong>를 걸으셨습니다.<br />
              건강한 하루를 함께한 소요 기록이 저장되었습니다.
            </p>
            <button
              type="button"
              onClick={() => {
                setShowCompleteModal(false);
                if (onFinishWalk) onFinishWalk();
              }}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                background: '#16a34a',
                color: '#ffffff',
                border: 'none',
                fontSize: '15px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              확인 (홈으로 이동)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
