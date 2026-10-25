import React, { useCallback, useEffect, useState } from 'react';
import BottomNav from './components/BottomNav';
import LocationGate from './pages/LocationGate';
import LoginPage from './pages/LoginPage';
import SignupFlow from './pages/SignupFlow';
import FindAccountPage from './pages/FindAccountPage';
import WalkFlow from './pages/WalkFlow';
import PinsPage from './pages/PinsPage';
import MyPageFlow from './pages/mypage/MyPageFlow';
import { getUserProfile, naverAuthCallback, saveUserProfile } from './api/auth';
import { updateProfile, clearProfileCache } from './api/user';
import { supabase } from './supabaseClient';

function readStoredLogin() {
  const uid = localStorage.getItem('soyo-current-user-id');
  return Boolean(uid && uid !== 'guest');
}

function profileFromServer(payload) {
  if (!payload) return null;
  const medNames = (Array.isArray(payload.medicationNames) && payload.medicationNames.length > 0)
    ? payload.medicationNames
    : (Array.isArray(payload.medications)
        ? payload.medications.map((m) => (typeof m === 'object' && m ? m.name : String(m))).filter(Boolean)
        : []);

  return {
    userId: payload.userId,
    userName: payload.userName || '소요 여행자',
    email: payload.email || localStorage.getItem('soyo-current-email') || '',
    profileImage: null,
    birthDate: payload.birthDate ? String(payload.birthDate).split('T')[0] : '',
    allergies: Array.isArray(payload.allergies)
      ? payload.allergies
      : payload.allergies
        ? String(payload.allergies).split(', ')
        : [],
    diseaseIds: Array.isArray(payload.chronicConditions || payload.diseaseIds)
      ? payload.chronicConditions || payload.diseaseIds
      : [],
    medications: medNames,
    hasMedication: payload.hasMedication ?? (medNames.length > 0)
  };
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('⚠️ [App 화면 오류 포착]:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="screen page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center', minHeight: '60vh' }}>
          <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '8px' }}>화면을 표시하는 중 일시적인 문제가 생겼습니다</h2>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>잠시 후 다시 시도해 주세요.</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              if (this.props.onReset) this.props.onReset();
            }}
          >
            홈으로 이동
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [locationAllowed, setLocationAllowed] = useState(
    () => localStorage.getItem('soyo-location-allowed') === 'true' || sessionStorage.getItem('soyo-location-allowed') === 'true',
  );
  const [screen, setScreen] = useState(() => (readStoredLogin() ? 'main' : 'auth'));
  const [isLoggedIn, setIsLoggedIn] = useState(readStoredLogin);
  const [session, setSession] = useState(null);
  const [authNotice, setAuthNotice] = useState('');
  const [foundLoginId, setFoundLoginId] = useState('');
  const [signupDraft, setSignupDraft] = useState({ loginId: '', password: '' });
  const [walkStart, setWalkStart] = useState(null);
  const [walkKey, setWalkKey] = useState(0);
  const [homeResetTrigger, setHomeResetTrigger] = useState(0);
  const [navVisible, setNavVisible] = useState(true);
  const [myPageResetKey, setMyPageResetKey] = useState(0);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const userId = localStorage.getItem('soyo-current-user-id') || 'guest';

  const storeProfile = (profile) => {
    if (!profile) return;
    try {
      localStorage.setItem('soyo-user-profile', JSON.stringify(profile));
    } catch {
      // ignore
    }
  };

  const resolveProfile = useCallback(async (user) => {
    if (user?.profile) return profileFromServer(user.profile);
    if (user && (user.userName || user.chronicConditions || user.allergies || user.diseaseIds)) {
      return profileFromServer(user);
    }
    const id = user?.supabaseUserId || user?.userId || user?.loginId;
    const email = user?.email || localStorage.getItem('soyo-current-email');
    if (!id && !email) return null;
    try {
      const res = await getUserProfile(id || email, email);
      if (res?.success && res.profile) {
        return profileFromServer({ ...res.profile, userId: res.profile.userId || id });
      }
    } catch (error) {
      console.warn('⚠️ [로그인] 서버 프로필을 불러오지 못했습니다:', error.message);
    }
    return null;
  }, []);

  const finishLogin = useCallback(({ loginId, user, session: loginSession }) => {
    const id = user?.supabaseUserId || user?.userId || loginSession?.user?.id || user?.loginId || loginId;
    const email = user?.email || loginSession?.user?.email || localStorage.getItem('soyo-current-email') || '';
    if (id) localStorage.setItem('soyo-current-user-id', id);
    if (email) localStorage.setItem('soyo-current-email', email);

    // 즉시 로그인 완료 처리하여 화면 전환 지연 차단
    if (loginSession) setSession(loginSession);
    setIsLoggedIn(true);
    setAuthNotice('');
    setWalkStart(null);
    setWalkKey((key) => key + 1);
    setNavVisible(true);
    setScreen('main');

    // 프로필 정보는 백그라운드에서 비동기 조회 및 캐시 갱신
    resolveProfile({ ...user, loginId: id, email }).then((profile) => {
      if (profile) {
        storeProfile({
          ...profile,
          email: profile.email || email,
        });
        mockUpdateProfile(profile);
      }
    }).catch((err) => {
      console.warn('⚠️ [로그인] 프로필 동기화 대기:', err?.message);
    });
  }, [resolveProfile]);

  // 네이버 로그인 콜백 처리
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const naverSavedState = sessionStorage.getItem('naver_oauth_state');
    if (!code || !state) return;
    if (naverSavedState && naverSavedState !== state) return;
    sessionStorage.removeItem('naver_oauth_state');
    window.history.replaceState({}, '', window.location.pathname);
    naverAuthCallback(code, state)
      .then((res) => {
        if (res?.success && res.user) {
          if (res.token) localStorage.setItem('soyo-jwt-token', res.token);
          finishLogin({ loginId: res.user.email, user: { ...res.user, profile: res.user.profile } });
        } else {
          setAuthNotice(res?.error || '네이버 로그인 중 오류가 발생했습니다.');
          if (res?.error) alert(`네이버 로그인 실패 안내:\n${res.error}`);
        }
      })
      .catch((err) => {
        setAuthNotice('네이버 로그인 중 오류가 발생했습니다.');
        alert(`네이버 로그인 통신 오류:\n${err?.message || '알 수 없는 오류'}`);
      });
  }, [finishLogin]);

  // Supabase Auth 세션 감지 및 소셜 로그인 연동
  useEffect(() => {
    if (!supabase) return;

    const handleSupabaseSession = async (sessionUser, event) => {
      if (!sessionUser) return;

      const userMeta = sessionUser.user_metadata || {};
      const userName = userMeta.full_name || userMeta.name || userMeta.user_name || sessionUser.email?.split('@')[0] || '소요 여행자';
      const email = sessionUser.email || '';
      const userId = sessionUser.id;

      console.log('📌 [Supabase/소셜 로그인 세션 확인]:', { id: userId, email, userName, event });

      localStorage.setItem('soyo-current-user-id', userId);
      if (email) localStorage.setItem('soyo-current-email', email);

      // AWS RDS에서 사용자 기존 프로필 조회
      let isNewUser = false;
      let existingProfile = null;
      try {
        console.log('🚀 [AWS RDS 백엔드] 소셜 사용자 프로필 조회:', userId, email);
        const res = await getUserProfile(userId, email);
        if (res?.success && res.profile) {
          const p = res.profile;
          const bDate = p.birthDate ? String(p.birthDate).split('T')[0] : '';
          const hasCustomBirth = bDate && !bDate.startsWith('1970-01-01');
          const hasDiseases = Array.isArray(p.chronicConditions || p.diseaseIds) && (p.chronicConditions || p.diseaseIds).length > 0;
          const hasAllergies = Array.isArray(p.allergies) && p.allergies.length > 0;
          const hasMedications = (Array.isArray(p.medications) && p.medications.length > 0) || (Array.isArray(p.medicationNames) && p.medicationNames.length > 0);

          // DB에 자동 생성된 기본 더미값(1970-01-01, 건강정보 없음)만 있는 경우 최초 가입자로 판정
          if (!p.age && !hasCustomBirth && !hasDiseases && !hasAllergies && !hasMedications) {
            isNewUser = true;
          } else {
            existingProfile = profileFromServer({ ...res.profile, userId: res.profile.userId || userId });
          }
        } else {
          isNewUser = true;
        }
      } catch (e) {
        console.warn('⚠️ [AWS RDS 백엔드] 프로필 조회 대기:', e.message);
        isNewUser = false;
      }

      if (isNewUser) {
        console.log('🌱 [신규 소셜 회원 감지] 2단계 건강정보 프로필 입력 화면으로 이동');
        setSignupDraft({
          loginId: email || userName,
          name: userName,
          email,
          birthDate: '',
          supabaseUserId: userId,
          isSocial: true,
        });
        setAuthNotice('');
        setScreen('signup');
      } else {
        console.log('🎉 [기존 소셜 회원 확인] 로그인 완료 및 메인 화면 이동');
        if (existingProfile) {
          storeProfile({
            ...existingProfile,
            email: existingProfile.email || email,
          });
          await mockUpdateProfile(existingProfile);
        }
        setIsLoggedIn(true);
        setAuthNotice('');
        setWalkStart(null);
        setWalkKey((key) => key + 1);
        setNavVisible(true);
        setScreen('main');
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log('🔔 [Supabase Auth 상태 변경 알림]:', event, newSession?.user?.email);
      setSession(newSession);
      if (newSession?.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        handleSupabaseSession(newSession.user, event);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleTabChange = (tab) => {
    if (tab === 'main') {
      setWalkStart(null);
      setNavVisible(true);
      if (screen !== 'main') {
        setScreen('main');
      }
      setHomeResetTrigger((count) => count + 1);
      return;
    }
    if (tab === 'mypage') {
      setMyPageResetKey((key) => key + 1);
    }
    setScreen(tab);
  };

  const handleRequireLogin = () => {
    setAuthNotice('로그인이 필요합니다.');
    setScreen('auth');
    setNavVisible(true);
  };

  const handleLogout = async () => {
    localStorage.removeItem('soyo-current-user-id');
    localStorage.removeItem('soyo-current-email');
    localStorage.removeItem('soyo-jwt-token');
    localStorage.removeItem('soyo-user-profile');
    clearProfileCache();

    // Supabase Auth 로컬 캐시 토큰 일괄 소거
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('supabase.auth.token'))) {
          localStorage.removeItem(key);
        }
      }
    } catch {
      // ignore
    }

    if (supabase) {
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch {
        // ignore
      }
    }

    setSession(null);
    setIsLoggedIn(false);
    setAuthNotice('로그아웃되었습니다.');
    setScreen('auth');
    setNavVisible(true);
  };

  const handleSkip = () => {
    localStorage.removeItem('soyo-current-user-id');
    localStorage.removeItem('soyo-current-email');
    localStorage.removeItem('soyo-user-profile');
    clearProfileCache();
    setIsLoggedIn(false);
    setAuthNotice('');
    setWalkStart(null);
    setWalkKey((key) => key + 1);
    setNavVisible(true);
    setScreen('main');
  };

  const handleSignupComplete = async (form) => {
    const profile = {
      userName: form.name,
      email: form.email,
      birthDate: form.birthDate,
      allergies: form.noAllergy ? [] : form.allergies,
      diseaseIds: form.noDisease ? [] : form.diseaseIds,
      medications: form.noMedication ? [] : form.medications,
      profileImage: null,
    };

    const newUserId = form.supabaseUserId || form.loginId;
    localStorage.setItem('soyo-current-user-id', newUserId);
    if (form.email) localStorage.setItem('soyo-current-email', form.email);
    storeProfile(profile);

    try {
      const users = JSON.parse(localStorage.getItem('soyo-registered-users') || '[]');
      const filtered = users.filter((user) => user.loginId !== form.loginId);
      filtered.push({
        loginId: form.loginId,
        email: form.email,
        password: form.password,
        supabaseUserId: form.supabaseUserId,
        profile,
      });
      localStorage.setItem('soyo-registered-users', JSON.stringify(filtered));
    } catch {
      // ignore
    }

    try {
      await saveUserProfile({
        userId: newUserId,
        loginId: form.loginId,
        password: form.password,
        email: form.email,
        name: form.name,
        birth: form.birthDate,
        allergies: profile.allergies,
        diseases: profile.diseaseIds,
        medications: profile.medications,
        noAllergy: form.noAllergy,
        noDisease: form.noDisease,
        noMedication: form.noMedication,
      });
    } catch (error) {
      console.warn('⚠️ [회원가입] 서버 저장은 나중에 연결됩니다:', error.message);
    }

    await updateProfile(null, profile);
    setIsLoggedIn(true);
    setAuthNotice('');
    setWalkStart(null);
    setWalkKey((key) => key + 1);
    setNavVisible(true);
    setScreen('main');
  };

  // 비로그인 상태(로그인/회원가입/아이디찾기)에서는 로그인 화면을 먼저 보여주고,
  // 위치 권한은 메인/산책 화면 진입 시 요청하도록 개선
  if (!locationAllowed && screen !== 'auth' && screen !== 'signup' && screen !== 'find') {
    return (
      <div className="app-shell">
        <div className="app-frame app-frame--full">
          <LocationGate onAllowed={() => setLocationAllowed(true)} />
        </div>
      </div>
    );
  }

  let content = null;
  if (screen === 'auth') {
    content = (
      <LoginPage
        initialNotice={authNotice}
        initialLoginId={foundLoginId}
        onSignup={(draft) => {
          setSignupDraft(draft || { loginId: '', password: '' });
          setAuthNotice('');
          setScreen('signup');
        }}
        onFindAccount={({ loginId }) => {
          setSignupDraft({ loginId: loginId || '', password: '' });
          setScreen('find');
        }}
        onLogin={finishLogin}
        onSkip={handleSkip}
      />
    );
  } else if (screen === 'signup') {
    content = (
      <SignupFlow
        initialDraft={signupDraft}
        onBack={() => setScreen('auth')}
        onFindAccount={() => setScreen('find')}
        onComplete={handleSignupComplete}
      />
    );
  } else if (screen === 'find') {
    content = (
      <FindAccountPage
        initialLoginId={signupDraft.loginId || ''}
        onBack={() => setScreen('auth')}
        onDone={({ loginId, notice } = {}) => {
          setFoundLoginId(loginId || '');
          setAuthNotice(notice || '');
          setScreen('auth');
        }}
      />
    );
  } else if (screen === 'pins') {
    content = (
      <PinsPage
        isLoggedIn={isLoggedIn}
        userId={userId}
        onRequireLogin={handleRequireLogin}
        onStartRoute={(route) => {
          setWalkStart(route);
          setWalkKey((key) => key + 1);
          setNavVisible(false);
          setScreen('main');
        }}
      />
    );
  } else if (screen === 'mypage') {
    content = (
      <MyPageFlow
        session={session}
        resetKey={myPageResetKey}
        isLoggedIn={isLoggedIn}
        onLogin={handleRequireLogin}
        onLogout={handleLogout}
      />
    );
  } else {
    content = (
      <WalkFlow
        key={walkKey}
        isLoggedIn={isLoggedIn}
        userId={userId}
        startRoute={walkStart}
        homeResetTrigger={homeResetTrigger}
        onRequireLogin={handleRequireLogin}
        onSectionChange={(step) => setNavVisible(step === 'home')}
      />
    );
  }

  const showNav = ['main', 'pins', 'mypage'].includes(screen) && navVisible;

  return (
    <div className="app-shell">
      <div className={`app-frame ${screen === 'auth' || screen === 'signup' || screen === 'find' ? 'app-frame--full' : ''}`} style={{ position: 'relative' }}>
        {!isOnline && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            background: '#dc2626',
            color: '#ffffff',
            padding: '8px 12px',
            fontSize: '12px',
            fontWeight: 600,
            textAlign: 'center',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
          }}>
            <span>⚡ 인터넷 연결이 끊겼습니다. 저장된 캐시 모드로 안전하게 작동합니다.</span>
          </div>
        )}
        <ErrorBoundary onReset={() => setScreen('main')}>
          {content}
        </ErrorBoundary>
        {showNav && <BottomNav activeTab={screen} onChange={handleTabChange} />}
      </div>
    </div>
  );
}

export default App;
