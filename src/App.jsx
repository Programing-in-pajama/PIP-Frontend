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
  return Boolean(localStorage.getItem('soyo-current-user-id'));
}

function profileFromServer(payload) {
  if (!payload) return null;
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
    medications: Array.isArray(payload.medications) ? payload.medications : [],
  };
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
  const [navVisible, setNavVisible] = useState(true);
  const [myPageResetKey, setMyPageResetKey] = useState(0);

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
    if (user?.profile) return user.profile;
    const id = user?.supabaseUserId || user?.userId || user?.loginId;
    if (!id) return null;
    try {
      const res = await getUserProfile(id);
      if (res?.success && res.profile) {
        return profileFromServer({ ...res.profile, userId: id });
      }
    } catch (error) {
      console.warn('⚠️ [로그인] 서버 프로필을 불러오지 못했습니다:', error.message);
    }
    return null;
  }, []);

  const finishLogin = useCallback(async ({ loginId, user, session: loginSession }) => {
    const id = user?.supabaseUserId || user?.userId || loginSession?.user?.id || user?.loginId || loginId;
    const email = user?.email || loginSession?.user?.email || localStorage.getItem('soyo-current-email') || '';
    if (id) localStorage.setItem('soyo-current-user-id', id);
    if (email) localStorage.setItem('soyo-current-email', email);

    const profile = await resolveProfile({ ...user, loginId: id, email });
    if (profile) {
      storeProfile({
        ...profile,
        email: profile.email || email,
      });
      await updateProfile(null, profile);
    } else {
      localStorage.removeItem('soyo-user-profile');
    }

    if (loginSession) setSession(loginSession);
    setIsLoggedIn(true);
    setAuthNotice('');
    setWalkStart(null);
    setWalkKey((key) => key + 1);
    setNavVisible(true);
    setScreen('main');
  }, [resolveProfile]);

  // 네이버 로그인 콜백 처리
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    if (!code || !state) return;
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

  // Supabase Auth 세션 감지
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      if (currentSession?.user) {
        setIsLoggedIn(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (newSession?.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        setIsLoggedIn(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleTabChange = (tab) => {
    if (tab === 'main') {
      setWalkStart(null);
      setWalkKey((key) => key + 1);
      setNavVisible(true);
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

    if (supabase) {
      try {
        await supabase.auth.signOut();
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
        onRequireLogin={handleRequireLogin}
        onSectionChange={(step) => setNavVisible(step === 'home')}
      />
    );
  }

  const showNav = ['main', 'pins', 'mypage'].includes(screen) && navVisible;

  return (
    <div className="app-shell">
      <div className={`app-frame ${screen === 'auth' || screen === 'signup' || screen === 'find' ? 'app-frame--full' : ''}`}>
        {content}
        {showNav && <BottomNav activeTab={screen} onChange={handleTabChange} />}
      </div>
    </div>
  );
}

export default App;
