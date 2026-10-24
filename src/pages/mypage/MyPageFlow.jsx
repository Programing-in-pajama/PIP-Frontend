import React, { useEffect, useState } from 'react';
import { getProfile, updateProfile } from '../../api/user';
import MyPage from './MyPage';
import ProfileEditPage from './ProfileEditPage';
import HealthPage from './HealthPage';
import AllergyFlow from './AllergyFlow';
import DiseaseSelectPage from './DiseaseSelectPage';
import MedicationFlow from './MedicationFlow';
import './mypage.css';

function MyPageFlow({ session, resetKey, isLoggedIn, onLogin, onLogout }) {
  const [activeScreen, setActiveScreen] = useState('myPage');
  const [profile, setProfile] = useState(() => {
    try {
      const stored = localStorage.getItem('soyo-user-profile');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState(null);

  // 하단 바에서 마이페이지 아이콘을 누르면 하위 화면 스택을 'myPage'로 리셋
  useEffect(() => {
    setActiveScreen('myPage');
  }, [resetKey]);

  // 프로필 데이터 로드 (session 또는 로그인 상태 변경 시에만 실행 — resetKey에 반응하여 중복 fetch하지 않음)
  useEffect(() => {
    if (!isLoggedIn) {
      setProfile(null);
      return;
    }
    let mounted = true;
    if (!profile) setIsLoading(true);
    setError(null);

    getProfile(session?.access_token)
      .then((data) => {
        if (mounted && data) setProfile(data);
      })
      .catch((err) => {
        console.warn('⚠️ [마이페이지] 프로필 로드 대기:', err);
        // 캐시된 프로필이 없을 때만 에러 문구 표시
        if (mounted && !profile) setError('정보를 불러오지 못했어요');
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [session, isLoggedIn]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleSave = async (changes, message = '저장했어요') => {
    setIsLoading(true);
    try {
      const updated = await updateProfile(session?.access_token, changes);
      setProfile((current) => ({ ...(current || {}), ...updated }));
      setToast(message);
      return true;
    } catch (saveError) {
      console.warn('⚠️ [마이페이지] 저장 실패:', saveError);
      setToast('저장하지 못했어요. 다시 시도해 주세요');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="screen page mp-screen">
        <MyPage isLoggedIn={false} onLogin={onLogin} />
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="screen page mp-screen">
        <p className="mp-state">{error}</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="screen page mp-screen">
        <div className="page-loading">
          <span className="spinner" />
          <p>내 정보를 불러오고 있어요</p>
        </div>
      </div>
    );
  }

  let content = null;

  if (activeScreen === 'profileEdit') {
    content = (
      <ProfileEditPage
        profile={profile}
        isLoading={isLoading}
        onBack={() => setActiveScreen('myPage')}
        onSave={async (changes) => {
          const saved = await handleSave(changes, '회원정보를 저장했어요');
          if (saved) setActiveScreen('myPage');
        }}
      />
    );
  } else if (activeScreen === 'health' || activeScreen === 'healthManage') {
    // Figma No.12 건강정보 관리 (알레르기 관리 · 기저질환 관리)
    content = (
      <HealthPage
        profile={profile}
        onBack={() => setActiveScreen('myPage')}
        onAllergy={() => setActiveScreen('allergy')}
        onDisease={() => setActiveScreen('disease')}
      />
    );
  } else if (activeScreen === 'allergy' || activeScreen === 'allergyManage') {
    content = (
      <AllergyFlow
        profile={profile}
        onBack={() => setActiveScreen('health')}
        onSave={(changes) => handleSave(changes, '알레르기 정보를 저장했어요')}
      />
    );
  } else if (activeScreen === 'disease' || activeScreen === 'diseaseSelect') {
    content = (
      <DiseaseSelectPage
        profile={profile}
        isLoading={isLoading}
        onBack={() => setActiveScreen('health')}
        onSave={async (changes) => {
          const saved = await handleSave(changes, '기저질환 정보를 저장했어요');
          if (saved) setActiveScreen('health');
        }}
      />
    );
  } else if (activeScreen === 'medications' || activeScreen === 'medicationManage') {
    content = (
      <MedicationFlow
        profile={profile}
        onBack={() => setActiveScreen('myPage')}
        onSave={handleSave}
      />
    );
  } else {
    content = (
      <MyPage
        profile={profile}
        isLoggedIn={isLoggedIn}
        onNavigate={setActiveScreen}
        onLogout={() => {
          onLogout();
          setToast('로그아웃했어요');
        }}
        onLogin={onLogin}
      />
    );
  }

  return (
    <div className="screen page mp-screen">
      {content}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

export default MyPageFlow;
