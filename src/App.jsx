import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import BottomNav from './components/BottomNav';
import MyPageFlow from './pages/mypage/MyPageFlow';
import LoginPage from './pages/LoginPage';
import SignupFlow from './pages/SignupFlow';
import FindAccountPage from './pages/FindAccountPage';
import { updateProfile } from './api/user';
import { saveUserProfile, getUserProfile, naverAuthCallback } from './api/auth';
import HomePage from './pages/HomePage';
import WalkPage from './pages/WalkPage';
import WalkMapFlow from './pages/WalkMapFlow';
import PinFlow from './pages/pins/PinFlow';

function App() {
  const [session, setSession] = useState(null);
  // 변수 명세서: activeScreen(현재 화면), authMode(login / signup), isLoggedIn
  const [activeScreen, setActiveScreen] = useState('auth'); // 'auth' | 'main'
  const [authMode, setAuthMode] = useState('login');
  const [authNotice, setAuthNotice] = useState('');
  const [foundLoginId, setFoundLoginId] = useState(''); // 아이디 찾기 결과 → 로그인 칸에 채워 줌
  const [signupDraft, setSignupDraft] = useState({ loginId: '', password: '' });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  // 하단 메뉴 선택 (변수 명세서 activeTab: walk / recommended / records / myPage)
  const [activeTab, setActiveTab] = useState('recommended');
  const [myPageResetKey, setMyPageResetKey] = useState(0);
  const [pinResetKey, setPinResetKey] = useState(0);
  const [selectedRoute, setSelectedRoute] = useState(null);

  // 브라우저 뒤로가기(Alt + ←, 브라우저 상단 뒤로가기 버튼) 히스토리 동기화
  useEffect(() => {
    // 최초 상태 저장
    if (!window.history.state) {
      window.history.replaceState({ activeScreen: 'auth', authMode: 'login', activeTab: 'recommended' }, '');
    }

    const handlePopState = (event) => {
      if (event.state) {
        if (event.state.activeScreen) setActiveScreen(event.state.activeScreen);
        if (event.state.authMode) setAuthMode(event.state.authMode);
        if (event.state.activeTab) setActiveTab(event.state.activeTab);
      } else {
        setActiveScreen('auth');
        setAuthMode('login');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // 화면 전환 시 브라우저 히스토리 스택에 push
  const navigateTo = (screen, mode = 'login', tab = activeTab) => {
    setActiveScreen(screen);
    setAuthMode(mode);
    if (tab) setActiveTab(tab);
    window.history.pushState({ activeScreen: screen, authMode: mode, activeTab: tab }, '');
  };

  const handleTabChange = (tab) => {
    if (tab === 'myPage') setMyPageResetKey((key) => key + 1);
    if (tab === 'walk') setPinResetKey((key) => key + 1);
    setActiveTab(tab);
    window.history.pushState({ activeScreen: 'main', authMode, activeTab: tab }, '');
  };

  // 소셜 로그인 / Supabase 사용자 프로필을 AWS RDS 클라우드와 상호 동기화
  const syncSocialProfileWithCloud = async (sbUser) => {
    if (!sbUser) return;
    const userMeta = sbUser.user_metadata || {};
    const userName = userMeta.full_name || userMeta.name || userMeta.user_name || sbUser.email?.split('@')[0] || '소요 여행자';
    const email = sbUser.email || '';

    console.log('📌 [소셜 로그인/Supabase 사용자 클라우드 연동]:', { id: sbUser.id, email, userName });

    // 1. AWS RDS 클라우드에서 기존 프로필 조회 시도
    let cloudProfile = null;
    try {
      localStorage.setItem('soyo-current-user-id', sbUser.id);
      if (email) localStorage.setItem('soyo-current-email', email);
      console.log('🚀 [AWS RDS 백엔드] 사용자 프로필 조회 요청:', sbUser.id);
      const res = await getUserProfile(sbUser.id);
      if (res?.success && res.profile) {
        cloudProfile = {
          userName: res.profile.userName || userName,
          email,
          birthDate: res.profile.birthDate ? String(res.profile.birthDate).split('T')[0] : '1990-01-01',
          allergies: Array.isArray(res.profile.allergies)
            ? res.profile.allergies
            : (res.profile.allergies ? String(res.profile.allergies).split(', ') : []),
          diseaseIds: Array.isArray(res.profile.chronicConditions)
            ? res.profile.chronicConditions
            : (res.profile.chronicConditions ? String(res.profile.chronicConditions).split(', ') : []),
          medications: Array.isArray(res.profile.medications)
            ? res.profile.medications
            : []
        };
        console.log('✅ [AWS RDS 백엔드] 프로필 조회 및 동기화 완료:', cloudProfile);
      }
    } catch (e) {
      console.warn('⚠️ [AWS RDS 백엔드] 프로필 조회 대기:', e.message);
    }

    if (cloudProfile) {
      await updateProfile(null, cloudProfile);
      return;
    }

    // 2. AWS RDS에 아직 프로필이 없으면 기본 소셜 프로필 저장 (문서 알고리즘 명세 준수)
    const newProfile = {
      userName,
      email,
      birthDate: userMeta.birth_date || '1990-01-01',
      allergies: [],
      diseaseIds: [],
      medications: []
    };
    await updateProfile(null, newProfile);

    try {
      console.log('🚀 [AWS RDS 백엔드] 소셜 사용자 기본 건강 프로필 저장 요청...');
      await saveUserProfile({
        userId: sbUser.id,
        name: userName,
        birth: newProfile.birthDate,
        allergies: [],
        diseases: [],
        medications: [],
        noAllergy: true,
        noDisease: true,
        noMedication: true
      });
      console.log('✅ [AWS RDS 백엔드] 소셜 사용자 프로필 저장 완료');
    } catch (saveErr) {
      console.warn('⚠️ [AWS RDS 백엔드] 소셜 프로필 저장 대기:', saveErr.message);
    }
  };

  // 로그인 상태 구독 및 소셜 로그인 콜백 처리
  
   // ─── [네이버 소셜 로그인 콜백 감지 및 백엔드 연동] ───
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    // 주소창에 네이버가 준 code와 state가 있다면 백엔드로 전송!
    if (code && state) {
      console.log('🚀 [네이버 로그인 콜백 감지] code와 state를 백엔드로 전송합니다...');
      
      // 1. 주소창 깔끔하게 정리 (code 지우기)
      window.history.replaceState({}, document.title, window.location.pathname);
      // 2. 백엔드 API (/api/auth/naver) 호출
      naverAuthCallback(code, state).then(async (res) => {
        if (res?.success && res?.user) {
          console.log('✅ [네이버 로그인 성공]:', res.user);
          // 토큰 및 사용자 ID 브라우저에 저장
          if (res.token) localStorage.setItem('soyo-jwt-token', res.token);
          if (res.user.id) localStorage.setItem('soyo-current-user-id', res.user.id);
          if (res.user.email) localStorage.setItem('soyo-current-email', res.user.email);
          // 로그인 상태 활성화 및 화면 이동
          setIsLoggedIn(true);
          if (res.isNewUser) {
            // 신규 가입자면 2단계 건강정보 프로필 입력 화면으로!
            console.log('🌱 신규 회원 감지: 건강 프로필 설정으로 이동');
            setSignupDraft({
              loginId: res.user.email || res.user.userName,
              name: res.user.userName,
              email: res.user.email,
              birthDate: res.user.birthDate,
              supabaseUserId: res.user.id,
              isSocial: true 
            });
            navigateTo('auth', 'signup');
          } else {
            // 기존 회원이면 바로 메인(마이페이지)으로!
            console.log('🎉 기존 회원 확인: 메인 화면으로 이동');
            setActiveScreen('main');
            setActiveTab('myPage');
          }
        } else {
          console.error('❌ 네이버 로그인 실패:', res?.error);
          setAuthNotice(res?.error || '네이버 로그인 중 오류가 발생했습니다.');
        }
      });
    }
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        syncSocialProfileWithCloud(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔔 [Supabase Auth 상태 변경 알림]:', event, session?.user?.email);
      setSession(session);
      if (session?.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        await syncSocialProfileWithCloud(session.user);
        setIsLoggedIn(true);
        setActiveScreen('main');
        setActiveTab('myPage');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // 로그인 · 회원가입 화면 (하단 메뉴 없이 전체 화면)
  if (activeScreen === 'auth') {
    // 아이디 찾기 / 비밀번호 찾기 (로그인 화면의 '아이디/비밀번호 찾기' 버튼)
    if (authMode === 'find') {
      return (
        <FindAccountPage
          initialLoginId={signupDraft.loginId || ''}
          onBack={() => navigateTo('auth', 'login')}
          onDone={({ loginId, notice } = {}) => {
            setFoundLoginId(loginId || '');
            setAuthNotice(notice || '');
            navigateTo('auth', 'login');
          }}
        />
      );
    }
    if (authMode === 'signup') {
      return (
        <SignupFlow
          initialDraft={signupDraft}
          onBack={() => navigateTo('auth', 'login')}
          onComplete={async (form) => {
            const actualProfile = {
              userName: form.name,
              email: form.email,
              birthDate: form.birthDate,
              allergies: form.noAllergy ? [] : form.allergies,
              diseaseIds: form.noDisease ? [] : form.diseaseIds,
              medications: form.noMedication ? [] : form.medications
            };

            const targetUserId = form.supabaseUserId || form.loginId;

            if (targetUserId) {
              localStorage.setItem('soyo-current-user-id', targetUserId);
              if (form.email) localStorage.setItem('soyo-current-email', form.email);
            }

            // 백엔드로 계정 및 건강 프로필 데이터 전송 (서버 DB 저장)
            console.log('🚀 [서버 DB 백엔드] 회원가입 계정 및 건강 프로필 저장 요청:', targetUserId);
            const saveRes = await saveUserProfile({
              userId: targetUserId,
              loginId: form.loginId,
              password: form.password,
              email: form.email,
              name: form.name,
              birth: form.birthDate,
              allergies: actualProfile.allergies,
              diseases: actualProfile.diseaseIds,
              medications: actualProfile.medications,
              noAllergy: form.noAllergy,
              noDisease: form.noDisease,
              noMedication: form.noMedication
            });
            console.log('✅ [서버 DB 백엔드] 회원가입 프로필 저장 성공:', saveRes);

            // 실제 입력한 정보로 마이페이지 스토어 업데이트
            await updateProfile(null, actualProfile);

            // 가입 계정 로컬 목록에 저장 (재로그인 일치 검증용)
            try {
              const users = JSON.parse(localStorage.getItem('soyo-registered-users') || '[]');
              const filtered = users.filter((u) => u.loginId !== form.loginId);
              filtered.push({
                loginId: form.loginId,
                email: form.email,
                password: form.password,
                supabaseUserId: form.supabaseUserId,
                profile: actualProfile
              });
              localStorage.setItem('soyo-registered-users', JSON.stringify(filtered));
            } catch (e) {
              // ignore
            }

            // 기획서 1.4 명세: 시작하기 클릭 시 메인화면으로 이동 (로그인 상태 완료)
            setIsLoggedIn(true);
            navigateTo('main', 'login', 'myPage');
          }}
        />
      );
    }
    return (
      <LoginPage
        initialNotice={authNotice}
        initialLoginId={foundLoginId}
        onSignup={(draft) => {
          setAuthNotice('');
          setSignupDraft(draft || { loginId: '', password: '' });
          navigateTo('auth', 'signup');
        }}
        onLogin={async ({ loginId, session: loginSession, user }) => {
          const userId = loginSession?.user?.id || user?.supabaseUserId || user?.loginId;
          console.log('📌 [로그인 성공 처리] 사용자 식별자:', userId);

          if (userId) {
            localStorage.setItem('soyo-current-user-id', userId);
            const userEmail = user?.email || loginSession?.user?.email;
            if (userEmail) localStorage.setItem('soyo-current-email', userEmail);
          }

          let fetchedProfile = null;
          if (userId) {
            try {
              console.log('🚀 [AWS RDS 백엔드] 사용자 프로필 조회 중:', userId);
              const res = await getUserProfile(userId);
              if (res?.success && res.profile) {
                fetchedProfile = {
                  userName: res.profile.userName,
                  email: user?.email || loginSession?.user?.email || localStorage.getItem('soyo-current-email') || '',
                  birthDate: res.profile.birthDate ? String(res.profile.birthDate).split('T')[0] : '1970-01-01',
                  allergies: Array.isArray(res.profile.allergies)
                    ? res.profile.allergies
                    : (res.profile.allergies ? String(res.profile.allergies).split(', ') : []),
                  diseaseIds: Array.isArray(res.profile.chronicConditions)
                    ? res.profile.chronicConditions
                    : (res.profile.chronicConditions ? String(res.profile.chronicConditions).split(', ') : []),
                  medications: Array.isArray(res.profile.medications)
                    ? res.profile.medications
                    : []
                };
                console.log('✅ [AWS RDS 백엔드] 프로필 연동 완료:', fetchedProfile);
              }
            } catch (err) {
              console.warn('⚠️ [AWS RDS 백엔드] 프로필 조회 대기:', err.message);
            }
          }

          const finalProfile = fetchedProfile || user?.profile;
          if (finalProfile) {
            await updateProfile(null, finalProfile);
          }

          setIsLoggedIn(true);
          navigateTo('main', 'login', 'myPage'); // 로그인 성공 시 마이페이지로 이동
        }}
        onFindAccount={({ loginId } = {}) => {
          setAuthNotice('');
          setSignupDraft({ loginId: loginId || '', password: '' });
          navigateTo('auth', 'find');
        }}
        onSkip={() => navigateTo('main', 'login', 'recommended')}
      />
    );
  }

  const goToLogin = () => {
    setAuthNotice('');
    navigateTo('auth', 'login');
  };

  const handleLogout = async () => {
    localStorage.removeItem('soyo-current-user-id');
    localStorage.removeItem('soyo-current-email');
    localStorage.removeItem('soyo-jwt-token');
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        // ignore
      }
    }
    setSession(null);
    setIsLoggedIn(false);
    setAuthNotice('로그아웃되었습니다.');
    navigateTo('auth', 'login');
  };


  return (
    <div style={{ maxWidth: '420px', minHeight: '100vh', margin: '0 auto', display: 'flex', flexDirection: 'column', background: '#fff', boxShadow: '0 0 0 1px #eee' }}>
      <main style={{ flex: 1 }}>
        {activeTab === 'myPage' && (
          <MyPageFlow
            session={session}
            resetKey={myPageResetKey}
            isLoggedIn={isLoggedIn}
            onLogin={goToLogin}
            onLogout={handleLogout}
          />
        )}

        {/* 📍 내 핀 탭 (Figma no.15 · N0.19 · No.20 · no.22) */}
        {activeTab === 'walk' && (
          <PinFlow
            isLoggedIn={isLoggedIn}
            resetKey={pinResetKey}
            onStartCourse={(course) => {
              // TODO(지도 담당): selectedRoute 를 WalkMapFlow 에 넘겨서 바로 산책 시작 화면으로
              setSelectedRoute(course);
              handleTabChange('recommended');
            }}
          />
        )}
        {activeTab === 'recommended' && (
          <WalkMapFlow onBackToAuth={goToLogin} />
        )}
      </main>
      <BottomNav activeTab={activeTab} onChange={handleTabChange} />
    </div>
  );
}

// 아직 만들지 않은 탭에 보여주는 안내 (상단 뒤로가기 헤더 포함)
function ComingSoon({ name, onBackToAuth }) {
  return (
    <div style={{ padding: '16px' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid #f0f0f0' }}>
        <button
          type="button"
          onClick={onBackToAuth}
          style={{ background: 'none', border: 'none', fontSize: '14px', color: '#16a34a', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 8px', borderRadius: '4px' }}
        >
          ‹ 로그인 화면으로
        </button>
        <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#333' }}>SOYO</span>
        <span style={{ width: '80px' }}></span>
      </header>
      <div style={{ marginTop: '100px', textAlign: 'center' }}>
        <p style={{ color: '#888', fontSize: '15px', lineHeight: 1.6 }}>
          <strong>{name}</strong> 화면은 구현 예정이에요.<br />
          아래 <strong>마이페이지(👤)</strong> 메뉴를 클릭해 보세요.
        </p>
      </div>
    </div>
  );
}

export default App;
