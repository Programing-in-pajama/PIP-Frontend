import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { loginUser } from '../api/auth';
import Icon from '../components/Icons';
// 🧪 테스트 계정 (삭제할 때 이 import 와 handleLogin 안의 분기만 지우면 됩니다)
import { isTestAccountLogin, TEST_PROFILE } from '../dev/testAccount';

const SOCIAL_LOGINS = [
  { name: '카카오', image: '/pic/카카오톡.png', className: 'kakao', provider: 'kakao' },
  { name: '네이버', image: '/pic/네이버.png', className: 'naver', provider: 'naver' },
  { name: '구글', image: '/pic/구글.png', className: 'google', provider: 'google' },
];

export default function LoginPage({ onSignup, onLogin, onSkip, onFindAccount, initialNotice = '', initialLoginId = '' }) {
  const [loginId, setLoginId] = useState(() => initialLoginId || localStorage.getItem('soyo-saved-id') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberId, setRememberId] = useState(Boolean(localStorage.getItem('soyo-saved-id')));
  const [authMessage, setAuthMessage] = useState(initialNotice);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const failLogin = () => {
    setLoginId('');
    setPassword('');
    setAuthMessage('아이디/비밀번호를 확인하세요.');
    setIsSubmitting(false);
  };

  async function handleLogin(event) {
    event.preventDefault();
    if (!loginId || !password) {
      setAuthMessage('아이디와 비밀번호를 입력해 주세요.');
      return;
    }

    setIsSubmitting(true);
    setAuthMessage('');
    const trimmedId = loginId.trim();

    // 🧪 테스트 계정 (아이디: test / 비밀번호: 1234)
    if (isTestAccountLogin(trimmedId, password)) {
      localStorage.setItem('soyo-user-profile', JSON.stringify(TEST_PROFILE));
      if (rememberId) localStorage.setItem('soyo-saved-id', trimmedId);
      else localStorage.removeItem('soyo-saved-id');
      setIsSubmitting(false);
      onLogin({
        loginId: trimmedId,
        user: {
          loginId: trimmedId,
          email: TEST_PROFILE.email,
          supabaseUserId: 'test',
          profile: TEST_PROFILE,
        },
      });
      return;
    }

    try {
      const res = await loginUser(trimmedId, password);
      if (res?.success && res?.user) {
        if (rememberId) localStorage.setItem('soyo-saved-id', trimmedId);
        else localStorage.removeItem('soyo-saved-id');
        if (res.token) localStorage.setItem('soyo-jwt-token', res.token);
        if (res.user.email) localStorage.setItem('soyo-current-email', res.user.email);
        setIsSubmitting(false);
        onLogin({ loginId: trimmedId, user: res.user, token: res.token });
        return;
      }
    } catch (apiError) {
      console.warn('⚠️ [로그인] 서버 로그인 실패:', apiError.message);
    }

    if (supabase && trimmedId.includes('@')) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedId,
          password,
        });
        if (!error && data?.session) {
          if (rememberId) localStorage.setItem('soyo-saved-id', trimmedId);
          setIsSubmitting(false);
          onLogin({ loginId: trimmedId, session: data.session });
          return;
        }
      } catch (sbError) {
        console.warn('⚠️ [로그인] Supabase 로그인 실패:', sbError.message);
      }
    }

    let registeredUsers = [];
    try {
      registeredUsers = JSON.parse(localStorage.getItem('soyo-registered-users') || '[]');
    } catch {
      registeredUsers = [];
    }

    const matched = registeredUsers.find(
      (user) => (user.loginId === trimmedId || user.email === trimmedId) && user.password === password,
    );

    if (matched) {
      if (rememberId) localStorage.setItem('soyo-saved-id', trimmedId);
      else localStorage.removeItem('soyo-saved-id');
      setIsSubmitting(false);
      onLogin({ loginId: trimmedId, user: matched });
      return;
    }

    failLogin();
  }

  async function handleSocialLogin(provider) {
    if (provider === 'naver') {
      const clientId = import.meta.env.VITE_NAVER_CLIENT_ID;
      if (!clientId) {
        setAuthMessage('네이버 로그인 설정이 아직 준비되지 않았어요.');
        return;
      }
      const redirectUri =
        import.meta.env.VITE_NAVER_REDIRECT_URI || `${window.location.origin}/oauth/callback/naver`;
      const state = Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem('naver_oauth_state', state);
      window.location.href = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
      return;
    }

    if (!supabase) {
      setAuthMessage('소셜 로그인 설정이 아직 준비되지 않았어요.');
      return;
    }

    setIsSubmitting(true);
    setAuthMessage('소셜 로그인으로 이동 중...');

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin },
      });
      if (error) {
        setAuthMessage(`로그인 오류: ${error.message}`);
        setIsSubmitting(false);
      } else if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setAuthMessage(`로그인 오류: ${err?.message || '연결에 실패했습니다'}`);
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-screen">
      <div className="auth-scroll">
        <img className="auth-logo" src="/pic/SOYO.png" alt="SOYO" />

        <header className="auth-head">
          <h1>로그인</h1>
          <p>나에게 맞는 산책을 시작해 보세요</p>
        </header>

        <form className="auth-form" onSubmit={handleLogin} noValidate>
          <label className="visually-hidden" htmlFor="login-id">아이디</label>
          <input
            id="login-id"
            className="input"
            type="text"
            placeholder="아이디"
            autoComplete="username"
            value={loginId}
            onChange={(event) => {
              setLoginId(event.target.value);
              setAuthMessage('');
            }}
          />

          <label className="visually-hidden" htmlFor="login-password">비밀번호</label>
          <div className="input-wrap">
            <input
              id="login-password"
              className="input has-icon"
              type={showPassword ? 'text' : 'password'}
              placeholder="비밀번호"
              autoComplete="current-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setAuthMessage('');
              }}
            />
            <button
              type="button"
              className="input-icon-btn"
              aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((visible) => !visible)}
            >
              <Icon name={showPassword ? 'eye' : 'eye-off'} size={19} />
            </button>
          </div>

          <div className="auth-options">
            <label className="check check--sm">
              <input
                type="checkbox"
                checked={rememberId}
                onChange={(event) => setRememberId(event.target.checked)}
              />
              <span>내 로그인 정보 기억하기</span>
            </label>
            <button
              type="button"
              className="text-btn"
              onClick={() => {
                if (onFindAccount) onFindAccount({ loginId });
                else setAuthMessage('아이디/비밀번호 찾기는 준비 중이에요.');
              }}
            >
              아이디/비밀번호 찾기
            </button>
          </div>

          {authMessage && (
            <p className="form-message" role="status">
              {authMessage}
            </p>
          )}

          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className="auth-social">
          <p className="auth-caption">또는 소셜 계정으로 로그인</p>
          <div className="social-row">
            {SOCIAL_LOGINS.map((social) => (
              <button
                key={social.name}
                type="button"
                className={`social-btn ${social.className}`}
                aria-label={`${social.name} 로그인`}
                onClick={() => handleSocialLogin(social.provider)}
              >
                <img src={social.image} alt="" />
              </button>
            ))}
          </div>
        </div>

        <div className="auth-bottom">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => onSignup({ loginId, password })}
          >
            회원가입
          </button>
          <button type="button" className="text-btn auth-skip" onClick={onSkip}>
            건너뛰기
          </button>
        </div>
      </div>
    </main>
  );
}
