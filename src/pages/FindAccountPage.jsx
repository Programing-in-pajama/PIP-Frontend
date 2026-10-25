import React, { useState } from 'react';
import {
  sendEmailCode,
  verifyEmailCode,
  findLoginId,
  sendPasswordResetCode,
  verifyPasswordResetCode,
  resetPassword,
} from '../api/auth';
import { API_BASE_URL } from '../api/client';
import Icon from '../components/Icons';

// 아이디 찾기 / 비밀번호 찾기 (Figma No.1 - 아이디 찾기 / 비밀번호 찾기)
// 제목의 "아이디 찾기" / "비밀번호 찾기" 글자를 누르면 탭이 바뀌어요. (선택된 쪽이 검정, 나머지는 회색)
// 스타일은 회원가입 1단계 화면(SignupFlow)과 같은 클래스를 그대로 써요. (auth-screen / input / inline-fields / pill-btn …)

const EMAIL_RULE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// 비밀번호 조건: 회원가입과 동일 (영문 + 숫자 + 특수문자(!@#$%^&*) 포함 8자 이상)
const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;

export default function FindAccountPage({ initialTab = 'findId', initialLoginId = '', onBack, onDone }) {
  const [tab, setTab] = useState(initialTab); // 'findId' | 'findPassword'

  return (
    <main className="auth-screen">
      <div className="auth-scroll signup-scroll">
        <header className="signup-head find-head">
          <h1>
            <button type="button" className={tab === 'findId' ? 'active' : ''} aria-pressed={tab === 'findId'} onClick={() => setTab('findId')}>아이디 찾기</button>
            {' / '}
            <button type="button" className={tab === 'findPassword' ? 'active' : ''} aria-pressed={tab === 'findPassword'} onClick={() => setTab('findPassword')}>비밀번호 찾기</button>
          </h1>
        </header>

        {tab === 'findId'
          ? <FindIdForm key="findId" onBack={onBack} onDone={onDone} />
          : <FindPasswordForm key="findPassword" initialLoginId={initialLoginId} onBack={onBack} onDone={onDone} />}
      </div>
    </main>
  );
}

// ─── 아이디 찾기: 이름 · E-mail [인증번호 전송] · 인증번호 6자리 [인증 확인] · [아이디 찾기] ───
function FindIdForm({ onBack, onDone }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [foundId, setFoundId] = useState('');
  const [emailHint, setEmailHint] = useState({ text: '', ok: false });
  const [codeHint, setCodeHint] = useState({ text: '', ok: false });
  const [formMessage, setFormMessage] = useState({ text: '', ok: false });

  async function sendCode() {
    const cleanEmail = email.trim();
    if (!EMAIL_RULE.test(cleanEmail)) {
      console.warn('⚠️ [아이디 찾기] 이메일 유효성 검사 실패: 올바른 이메일 형식이 아닙니다.', email);
      setEmailHint({ text: '먼저 올바른 E-mail 주소를 입력해 주세요.', ok: false });
      return;
    }

    const endpoint = `${API_BASE_URL}/api/auth/email/send-code`;
    const payload = { email: cleanEmail, type: 'find' };
    const timestamp = new Date().toISOString();

    console.group(`📤 [아이디 찾기] 이메일 인증번호 전송 요청 (${timestamp})`);
    console.log('📌 화면: 아이디 찾기 (FindIdForm)');
    console.log('🎯 대상 이메일:', cleanEmail);
    console.log('🌐 API 엔드포인트:', endpoint);
    console.log('📦 요청 본문(Payload):', payload);
    console.groupEnd();

    setIsSending(true);
    setEmailHint({ text: '인증번호를 발송하는 중입니다...', ok: true });
    setCodeHint({ text: '', ok: false });
    setFormMessage({ text: '', ok: false });

    try {
      const res = await sendEmailCode(cleanEmail, 'find');
      setCodeSent(true);
      setVerified(false);

      const serverCode = res?.code || res?.debugCode || res?.data?.code || res?.data?.debugCode;

      console.group(`📥 [아이디 찾기] 이메일 인증번호 전송 응답 (${new Date().toISOString()})`);
      console.log('✅ 성공 여부 (success):', res?.success);
      console.log('📧 메일함 발송 여부 (emailSent):', res?.emailSent);
      console.log('🔑 발급된 인증번호 (code):', serverCode || '(메일함으로만 전송됨)');
      console.log('💬 서버 메시지:', res?.message);
      console.log('🔄 상태 업데이트:', { codeSent: true, verified: false, isSending: false });
      console.groupEnd();

      if (res?.emailSent) {
        setEmailHint({ text: '인증번호를 발송했어요. 메일함을 확인해 주세요.', ok: true });
      } else if (serverCode) {
        setEmailHint({ text: `인증번호가 발송되었어요. [인증번호: ${serverCode}]`, ok: true });
        setCode(String(serverCode));
        setCodeHint({ text: '인증번호가 자동 입력되었어요. [인증 확인] 버튼을 눌러주세요.', ok: true });
      } else {
        setEmailHint({ text: res?.message || '인증번호를 발송했어요. 메일함을 확인해 주세요.', ok: true });
      }
    } catch (err) {
      console.group(`❌ [아이디 찾기] 이메일 인증번호 전송 실패 (${new Date().toISOString()})`);
      console.error('HTTP 상태코드:', err?.status || '네트워크 오류');
      console.error('에러 코드:', err?.code);
      console.error('에러 메시지:', err?.message);
      console.error('상세 에러 내용:', err);
      console.groupEnd();

      setEmailHint({ text: err.message || '인증번호 발송에 실패했습니다. 다시 시도해 주세요.', ok: false });
    } finally {
      setIsSending(false);
    }
  }

  async function verifyCode() {
    const cleanEmail = email.trim();
    const cleanCode = code.trim();
    if (!codeSent) {
      console.warn('⚠️ [아이디 찾기] 인증번호 미발송 상태에서 검증 시도');
      return setCodeHint({ text: '먼저 인증번호를 전송해 주세요.', ok: false });
    }
    if (cleanCode.length !== 6) {
      console.warn('⚠️ [아이디 찾기] 인증번호 6자리 미입력:', cleanCode);
      return setCodeHint({ text: '인증번호 6자리를 입력해 주세요.', ok: false });
    }

    const endpoint = `${API_BASE_URL}/api/auth/email/verify-code`;
    const payload = { email: cleanEmail, code: cleanCode };
    console.group(`🔍 [아이디 찾기] 이메일 인증번호 검증 요청 (${new Date().toISOString()})`);
    console.log('🎯 대상 이메일:', cleanEmail);
    console.log('🔑 인증번호:', cleanCode);
    console.log('🌐 API 엔드포인트:', endpoint);
    console.log('📦 요청 본문:', payload);
    console.groupEnd();

    try {
      const res = await verifyEmailCode(cleanEmail, cleanCode);
      console.group(`📥 [아이디 찾기] 이메일 인증번호 검증 응답 (${new Date().toISOString()})`);
      console.log('✅ 검증 결과 (verified):', res?.verified || res?.success);
      console.log('💬 응답 본문:', res);
      console.groupEnd();

      if (res?.verified || res?.success) {
        setVerified(true);
        setCodeHint({ text: 'E-mail 인증이 완료되었어요.', ok: true });
      } else {
        setVerified(false);
        setCodeHint({ text: res?.error || '인증번호를 확인해 주세요.', ok: false });
      }
    } catch (err) {
      console.group(`❌ [아이디 찾기] 이메일 인증번호 검증 실패 (${new Date().toISOString()})`);
      console.error('에러:', err);
      console.groupEnd();

      setVerified(false);
      setCodeHint({ text: err.message || '인증번호가 일치하지 않습니다.', ok: false });
    }
  }

  async function submit(event) {
    event.preventDefault();
    if (foundId) return onDone?.({ loginId: foundId });
    if (!name.trim()) return setFormMessage({ text: '이름을 입력해 주세요.', ok: false });
    if (!EMAIL_RULE.test(email.trim())) return setFormMessage({ text: '올바른 E-mail 주소를 입력해 주세요.', ok: false });
    if (!verified) return setFormMessage({ text: 'E-mail 인증을 완료해 주세요.', ok: false });

    const endpoint = `${API_BASE_URL}/api/auth/find-id`;
    const payload = { name: name.trim(), email: email.trim() };
    console.group(`🔍 [아이디 찾기] 계정 조회 요청 (${new Date().toISOString()})`);
    console.log('👤 이름:', payload.name);
    console.log('📧 이메일:', payload.email);
    console.log('🌐 API 엔드포인트:', endpoint);
    console.groupEnd();

    try {
      const res = await findLoginId(name.trim(), email.trim());
      const loginId = res?.loginId ?? res?.data?.loginId;
      console.group(`📥 [아이디 찾기] 계정 조회 결과 (${new Date().toISOString()})`);
      console.log('✅ 조회된 아이디:', loginId);
      console.groupEnd();

      if (!loginId) return setFormMessage({ text: '입력한 정보와 일치하는 아이디가 없어요.', ok: false });
      setFoundId(loginId);
      setFormMessage({ text: `회원님의 아이디는 ${loginId} 입니다.`, ok: true });
    } catch (err) {
      console.group(`❌ [아이디 찾기] 계정 조회 실패 (${new Date().toISOString()})`);
      console.error('에러:', err);
      console.groupEnd();

      setFormMessage({ text: err.status === 404 ? '입력하신 정보와 일치하는 계정을 찾을 수 없습니다.' : (err.message || '아이디를 찾지 못했어요.'), ok: false });
    }
  }

  return (
    <form className="signup-form find-form" onSubmit={submit}>
      <input
        className="input"
        aria-label="이름"
        placeholder="이름"
        autoComplete="name"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setFoundId('');
          setFormMessage({ text: '', ok: false });
        }}
      />
      <div className="inline-fields">
        <input
          className="input"
          aria-label="E-mail"
          placeholder="E-mail"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setVerified(false);
            setFoundId('');
            setEmailHint({ text: '', ok: false });
            setFormMessage({ text: '', ok: false });
          }}
        />
        <button className="pill-btn pill-btn--light" type="button" onClick={sendCode} disabled={isSending}>
          {isSending ? '전송 중...' : codeSent ? '재전송' : '인증번호 전송'}
        </button>
      </div>

      {emailHint.text && (
        <p
          className={`input-hint ${emailHint.ok ? 'is-success' : 'is-error'}`}
          style={{
            color: emailHint.ok ? '#15803d' : 'var(--red)',
            fontWeight: 500,
            margin: '-2px 4px 6px',
            fontSize: '12px',
            lineHeight: '1.4'
          }}
        >
          {emailHint.text}
        </p>
      )}

      <div className="inline-fields">
        <input
          className="input"
          aria-label="인증번호 6자리"
          placeholder="인증번호 6자리"
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => {
            setCode(e.target.value.replace(/\D/g, ''));
            setCodeHint({ text: '', ok: false });
          }}
        />
        <button className="pill-btn pill-btn--dark" type="button" onClick={verifyCode}>
          {verified ? '인증 완료' : '인증 확인'}
        </button>
      </div>

      {codeHint.text && (
        <p
          className={`input-hint ${codeHint.ok ? 'is-success' : 'is-error'}`}
          style={{
            color: codeHint.ok ? '#15803d' : 'var(--red)',
            fontWeight: 500,
            margin: '-2px 4px 6px',
            fontSize: '12px',
            lineHeight: '1.4'
          }}
        >
          {codeHint.text}
        </p>
      )}

      {formMessage.text && (
        <p className={`form-message ${formMessage.ok ? 'is-success' : ''}`} role="status">
          {formMessage.text}
        </p>
      )}

      <div className="auth-bottom signup-bottom">
        <button className="btn btn-primary" type="submit">
          {foundId ? '이 아이디로 로그인' : '아이디 찾기'}
        </button>
        <button className="text-btn auth-skip" type="button" onClick={onBack}>
          로그인으로 돌아가기
        </button>
      </div>
    </form>
  );
}

// ─── 비밀번호 찾기: 아이디 · 인증번호 6자리 [인증 확인] · 새 비밀번호 · 비밀번호 확인 · [비밀번호 재설정] ───
function FindPasswordForm({ initialLoginId, onBack, onDone }) {
  const [loginId, setLoginId] = useState(initialLoginId);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [sentTo, setSentTo] = useState(''); // 인증번호를 보낸 아이디
  const [verified, setVerified] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [idHint, setIdHint] = useState({ text: '', ok: false });
  const [codeHint, setCodeHint] = useState({ text: '', ok: false });
  const [formMessage, setFormMessage] = useState({ text: '', ok: false });

  const isPasswordValid = PASSWORD_RULE.test(password);

  async function sendCode() {
    const id = loginId.trim();
    if (id.length < 4) {
      console.warn('⚠️ [비밀번호 찾기] 아이디 자릿수 부족 (4자 이상 필요):', id);
      return setIdHint({ text: '아이디를 4자 이상 입력해 주세요.', ok: false });
    }
    if (id === sentTo && verified) return;

    const endpoint = `${API_BASE_URL}/api/auth/password-reset/send-code`;
    const payload = { loginId: id };
    const timestamp = new Date().toISOString();

    console.group(`📤 [비밀번호 찾기] 인증번호 전송 요청 (${timestamp})`);
    console.log('📌 화면: 비밀번호 찾기 (FindPasswordForm)');
    console.log('🎯 대상 아이디/이메일:', id);
    console.log('🌐 API 엔드포인트:', endpoint);
    console.log('📦 요청 본문(Payload):', payload);
    console.groupEnd();

    setIsSending(true);
    setIdHint({ text: '인증번호를 발송하는 중입니다...', ok: true });
    setCodeHint({ text: '', ok: false });
    setFormMessage({ text: '', ok: false });

    try {
      const res = await sendPasswordResetCode(id);
      setSentTo(id);
      setVerified(false);

      const serverCode = res?.code || res?.debugCode || res?.data?.code || res?.data?.debugCode;

      console.group(`📥 [비밀번호 찾기] 인증번호 전송 응답 (${new Date().toISOString()})`);
      console.log('✅ 성공 여부 (success):', res?.success);
      console.log('📧 메일함 발송 여부 (emailSent):', res?.emailSent);
      console.log('🔑 발급된 인증번호 (code):', serverCode || '(메일함으로만 전송됨)');
      console.log('💬 서버 메시지:', res?.message);
      console.log('🔄 상태 업데이트:', { sentTo: id, verified: false, isSending: false });
      console.groupEnd();

      if (res?.emailSent) {
        setIdHint({ text: '등록된 이메일로 인증번호를 발송했어요. 메일함을 확인해 주세요.', ok: true });
      } else if (serverCode) {
        setIdHint({ text: `인증번호가 발송되었어요. [인증번호: ${serverCode}]`, ok: true });
        setCode(String(serverCode));
        setCodeHint({ text: '인증번호가 자동 입력되었어요. [인증 확인] 버튼을 눌러주세요.', ok: true });
      } else {
        setIdHint({ text: res?.message || '등록된 이메일로 인증번호를 발송했어요. 메일함을 확인해 주세요.', ok: true });
      }
    } catch (err) {
      console.group(`❌ [비밀번호 찾기] 인증번호 전송 실패 (${new Date().toISOString()})`);
      console.error('HTTP 상태코드:', err?.status || '네트워크 오류');
      console.error('에러 코드:', err?.code);
      console.error('에러 메시지:', err?.message);
      console.error('상세 에러 내용:', err);
      console.groupEnd();

      const errMsg = err.status === 404
        ? '존재하지 않는 아이디이거나 등록된 이메일이 없습니다.'
        : (err.message || '인증번호 발송에 실패했습니다.');
      setIdHint({ text: errMsg, ok: false });
    } finally {
      setIsSending(false);
    }
  }

  async function verifyCode() {
    const cleanCode = code.trim();
    if (!sentTo) {
      console.warn('⚠️ [비밀번호 찾기] 인증번호 미발송 상태에서 검증 시도');
      return setCodeHint({ text: '아이디를 먼저 입력하고 인증번호를 전송해 주세요.', ok: false });
    }
    if (cleanCode.length !== 6) {
      console.warn('⚠️ [비밀번호 찾기] 인증번호 6자리 미입력:', cleanCode);
      return setCodeHint({ text: '인증번호 6자리를 입력해 주세요.', ok: false });
    }

    const endpoint = `${API_BASE_URL}/api/auth/password-reset/verify-code`;
    const payload = { loginId: sentTo, code: cleanCode };
    console.group(`🔍 [비밀번호 찾기] 인증번호 검증 요청 (${new Date().toISOString()})`);
    console.log('🎯 대상 아이디:', sentTo);
    console.log('🔑 인증번호:', cleanCode);
    console.log('🌐 API 엔드포인트:', endpoint);
    console.log('📦 요청 본문:', payload);
    console.groupEnd();

    try {
      const res = await verifyPasswordResetCode(sentTo, cleanCode);
      console.group(`📥 [비밀번호 찾기] 인증번호 검증 응답 (${new Date().toISOString()})`);
      console.log('✅ 검증 결과 (verified):', res?.verified ?? res?.success);
      console.log('💬 응답 본문:', res);
      console.groupEnd();

      if (res?.verified ?? res?.success) {
        setVerified(true);
        setCodeHint({ text: '인증이 완료됐어요. 새 비밀번호를 입력해 주세요.', ok: true });
      } else {
        setVerified(false);
        setCodeHint({ text: res?.error || '인증번호를 확인해 주세요.', ok: false });
      }
    } catch (err) {
      console.group(`❌ [비밀번호 찾기] 인증번호 검증 실패 (${new Date().toISOString()})`);
      console.error('에러:', err);
      console.groupEnd();

      setVerified(false);
      setCodeHint({ text: err.message || '인증번호가 일치하지 않습니다.', ok: false });
    }
  }

  async function submit(event) {
    event.preventDefault();
    if (loginId.trim().length < 4) return setFormMessage({ text: '아이디를 입력해 주세요.', ok: false });
    if (!verified) return setFormMessage({ text: '인증을 완료해 주세요.', ok: false });
    if (!isPasswordValid) return setFormMessage({ text: '비밀번호 조건을 확인해 주세요.', ok: false });
    if (password !== passwordConfirm) return setFormMessage({ text: '비밀번호가 일치하지 않아요.', ok: false });

    const endpoint = `${API_BASE_URL}/api/auth/password-reset`;
    console.group(`🔑 [비밀번호 찾기] 비밀번호 재설정 제출 (${new Date().toISOString()})`);
    console.log('🎯 대상 아이디:', sentTo);
    console.log('🌐 API 엔드포인트:', endpoint);
    console.groupEnd();

    try {
      await resetPassword(sentTo, code.trim(), password);
      onDone?.({ loginId: sentTo, notice: '비밀번호가 재설정되었어요. 새 비밀번호로 로그인해 주세요.' });
    } catch (err) {
      console.group(`❌ [비밀번호 찾기] 비밀번호 재설정 실패 (${new Date().toISOString()})`);
      console.error('에러:', err);
      console.groupEnd();

      setFormMessage({
        text: err.status === 404 ? '존재하지 않는 아이디이거나 등록된 이메일이 없습니다.' : (err.message || '비밀번호 재설정에 실패했어요.'),
        ok: false
      });
    }
  }

  return (
    <form className="signup-form find-form" onSubmit={submit}>
      <div className="inline-fields">
        <input
          className="input"
          aria-label="아이디"
          placeholder="아이디"
          autoComplete="username"
          value={loginId}
          onChange={(e) => {
            setLoginId(e.target.value);
            setVerified(false);
            setSentTo('');
            setIdHint({ text: '', ok: false });
            setFormMessage({ text: '', ok: false });
          }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); sendCode(); } }}
        />
        <button
          className="pill-btn pill-btn--light"
          type="button"
          onClick={sendCode}
          disabled={isSending}
        >
          {isSending ? '전송 중...' : sentTo ? '재전송' : '인증번호 전송'}
        </button>
      </div>

      {idHint.text && (
        <p
          className={`input-hint ${idHint.ok ? 'is-success' : 'is-error'}`}
          style={{
            color: idHint.ok ? '#15803d' : 'var(--red)',
            fontWeight: 500,
            margin: '-2px 4px 6px',
            fontSize: '12px',
            lineHeight: '1.4'
          }}
        >
          {idHint.text}
        </p>
      )}

      <div className="inline-fields">
        <input
          className="input"
          aria-label="인증번호 6자리"
          placeholder="인증번호 6자리"
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => {
            setCode(e.target.value.replace(/\D/g, ''));
            setCodeHint({ text: '', ok: false });
          }}
        />
        <button className="pill-btn pill-btn--dark" type="button" onClick={verifyCode}>
          {verified ? '인증 완료' : '인증 확인'}
        </button>
      </div>

      {codeHint.text && (
        <p
          className={`input-hint ${codeHint.ok ? 'is-success' : 'is-error'}`}
          style={{
            color: codeHint.ok ? '#15803d' : 'var(--red)',
            fontWeight: 500,
            margin: '-2px 4px 6px',
            fontSize: '12px',
            lineHeight: '1.4'
          }}
        >
          {codeHint.text}
        </p>
      )}

      <div className="input-wrap">
        <input
          className="input has-icon"
          aria-label="비밀번호"
          placeholder="비밀번호"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setFormMessage({ text: '', ok: false });
          }}
        />
        <button
          className="input-icon-btn"
          type="button"
          aria-label="비밀번호 표시/숨기기"
          onClick={() => setShowPassword((v) => !v)}
        >
          <Icon name={showPassword ? 'eye' : 'eye-off'} size={19} />
        </button>
      </div>
      <p className={`password-hint ${password && !isPasswordValid ? 'invalid' : ''}`}>
        영문, 숫자, 특수문자 포함 8자 이상, 특수문자 !@#$%^&amp;*만 사용가능
      </p>

      <div className="input-wrap">
        <input
          className="input has-icon"
          aria-label="비밀번호 확인"
          placeholder="비밀번호 확인"
          type={showConfirm ? 'text' : 'password'}
          autoComplete="new-password"
          value={passwordConfirm}
          onChange={(e) => {
            setPasswordConfirm(e.target.value);
            setFormMessage({ text: '', ok: false });
          }}
        />
        <button
          className="input-icon-btn"
          type="button"
          aria-label="비밀번호 확인 표시/숨기기"
          onClick={() => setShowConfirm((v) => !v)}
        >
          <Icon name={showConfirm ? 'eye' : 'eye-off'} size={19} />
        </button>
      </div>

      {formMessage.text && (
        <p className={`form-message ${formMessage.ok ? 'is-success' : ''}`} role="status">
          {formMessage.text}
        </p>
      )}

      <div className="auth-bottom signup-bottom">
        <button className="btn btn-primary" type="submit">
          비밀번호 재설정
        </button>
        <button className="text-btn auth-skip" type="button" onClick={onBack}>
          로그인으로 돌아가기
        </button>
      </div>
    </form>
  );
}

