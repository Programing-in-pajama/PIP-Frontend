import { sendEmailCode, verifyEmailCode } from '../api/auth';

// TODO(백엔드 팀): 아래 4개는 아직 서버 API 가 없어서 '준비 중' 안내만 띄워요.
//   서버가 생기면 src/api/auth.js 에 함수를 만들고 여기서 바꿔 끼우면 됩니다.
//   - findLoginId(name, email)            → { loginId }
//   - sendPasswordResetCode(loginId)      → 아이디에 등록된 이메일로 인증번호 발송
//   - verifyPasswordResetCode(loginId, code) → { verified }
//   - resetPassword(loginId, code, newPassword)
const notReady = async () => { const err = new Error('서버 준비 중'); err.status = 404; throw err; };
const findLoginId = notReady;
const sendPasswordResetCode = notReady;
const verifyPasswordResetCode = notReady;
const resetPassword = notReady;

// 아이디 찾기 / 비밀번호 찾기 (Figma No.1 - 아이디 찾기 / 비밀번호 찾기)
// 제목의 "아이디 찾기" / "비밀번호 찾기" 글자를 누르면 탭이 바뀌어요. (선택된 쪽이 검정, 나머지는 회색)
// 스타일은 회원가입 화면(styles.css)과 같은 클래스를 그대로 써요.

const EMAIL_RULE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// 비밀번호 조건: 회원가입과 동일 (영문 + 숫자 + 특수문자(!@#$%^&*) 포함 8자 이상)
const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;

export default function FindAccountPage({ initialTab = 'findId', initialLoginId = '', onBack, onDone }) {
  const [tab, setTab] = useState(initialTab); // 'findId' | 'findPassword'

  return (
    <main className="page-shell">
      <section className="signup-card find-card">
        <header className="signup-heading find-heading">
          <h1>
            <button type="button" className={tab === 'findId' ? 'active' : ''} aria-pressed={tab === 'findId'} onClick={() => setTab('findId')}>아이디 찾기</button>
            {' / '}
            <button type="button" className={tab === 'findPassword' ? 'active' : ''} aria-pressed={tab === 'findPassword'} onClick={() => setTab('findPassword')}>비밀번호 찾기</button>
          </h1>
        </header>

        {tab === 'findId'
          ? <FindIdForm key="findId" onBack={onBack} onDone={onDone} />
          : <FindPasswordForm key="findPassword" initialLoginId={initialLoginId} onBack={onBack} onDone={onDone} />}
      </section>
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
  const [foundId, setFoundId] = useState('');
  const [message, setMessage] = useState({ text: '', ok: false });

  const say = (text, ok = false) => setMessage({ text, ok });

  async function sendCode() {
    if (!EMAIL_RULE.test(email)) return say('먼저 올바른 E-mail 주소를 입력해 주세요.');
    try {
      say('인증번호를 발송하는 중입니다...');
      const res = await sendEmailCode(email);
      setCodeSent(true);
      setVerified(false);
      say(res?.message || '인증번호를 발송했습니다. 메일함을 확인해 주세요.', true);
    } catch (err) {
      say(err.message || '인증번호 발송에 실패했습니다. 다시 시도해 주세요.');
    }
  }

  async function verifyCode() {
    if (!codeSent) return say('먼저 인증번호를 전송해 주세요.');
    if (code.length !== 6) return say('인증번호 6자리를 입력해 주세요.');
    try {
      const res = await verifyEmailCode(email, code);
      if (res?.verified) {
        setVerified(true);
        say(res?.message || 'E-mail 인증이 완료됐어요.', true);
      } else {
        setVerified(false);
        say(res?.error || '인증번호를 확인해 주세요.');
      }
    } catch (err) {
      setVerified(false);
      say(err.message || '인증번호가 일치하지 않습니다.');
    }
  }

  async function submit(event) {
    event.preventDefault();
    if (foundId) return onDone?.({ loginId: foundId });
    if (!name.trim()) return say('이름을 입력해 주세요.');
    if (!EMAIL_RULE.test(email)) return say('올바른 E-mail 주소를 입력해 주세요.');
    if (!verified) return say('E-mail 인증을 완료해 주세요.');
    try {
      const res = await findLoginId(name.trim(), email);
      const loginId = res?.loginId ?? res?.data?.loginId;
      if (!loginId) return say('입력한 정보와 일치하는 아이디가 없어요.');
      setFoundId(loginId);
      say(`회원님의 아이디는 ${loginId} 입니다.`, true);
    } catch (err) {
      say(err.status === 404 ? '아이디 찾기 기능은 서버 준비 중이에요.' : (err.message || '아이디를 찾지 못했어요.'));
    }
  }

  return (
    <form className="signup-form find-form" onSubmit={submit}>
      <input className="text-input" aria-label="이름" placeholder="이름" autoComplete="name" value={name} onChange={(e) => { setName(e.target.value); setFoundId(''); }} />
      <div className="verification-row email-row">
        <input className="text-input" aria-label="E-mail" placeholder="E-mail" type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setVerified(false); setFoundId(''); }} />
        <button className="send-code-button" type="button" onClick={sendCode}>{codeSent ? '재전송' : '인증번호 전송'}</button>
      </div>
      <div className="verification-row">
        <input className="text-input" aria-label="인증번호 6자리" placeholder="인증번호 6자리" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
        <button className="verify-button" type="button" onClick={verifyCode}>{verified ? '인증 완료' : '인증 확인'}</button>
      </div>
      {message.text && <p className={`signup-notice ${message.ok ? 'success' : ''}`} role="status">{message.text}</p>}
      <div className="signup-bottom">
        <button className="primary-button" type="submit">{foundId ? '이 아이디로 로그인' : '아이디 찾기'}</button>
        <button className="signup-back-link" type="button" onClick={onBack}>로그인으로 돌아가기</button>
      </div>
    </form>
  );
}

// ─── 비밀번호 찾기: 아이디 · 인증번호 6자리 [인증 확인] · 새 비밀번호 · 비밀번호 확인 · [비밀번호 재설정] ───
// Figma 에는 '인증번호 전송' 버튼이 없어서, 아이디를 입력하고 다음 칸으로 넘어가면(또는 Enter) 자동으로 발송해요.
function FindPasswordForm({ initialLoginId, onBack, onDone }) {
  const [loginId, setLoginId] = useState(initialLoginId);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [sentTo, setSentTo] = useState(''); // 인증번호를 보낸 아이디
  const [verified, setVerified] = useState(false);
  const [message, setMessage] = useState({ text: '', ok: false });

  const say = (text, ok = false) => setMessage({ text, ok });
  const isPasswordValid = PASSWORD_RULE.test(password);

  async function sendCode() {
    const id = loginId.trim();
    if (id.length < 4 || id === sentTo) return;
    try {
      say('인증번호를 발송하는 중입니다...');
      await sendPasswordResetCode(id);
      setSentTo(id);
      setVerified(false);
      say('');
    } catch (err) {
      say(err.status === 404 ? '비밀번호 찾기 기능은 서버 준비 중이에요.' : (err.message || '인증번호 발송에 실패했습니다.'));
    }
  }

  async function verifyCode() {
    if (!sentTo) return say('아이디를 먼저 입력해 주세요.');
    if (code.length !== 6) return say('인증번호 6자리를 입력해 주세요.');
    try {
      const res = await verifyPasswordResetCode(sentTo, code);
      if (res?.verified ?? res?.success) {
        setVerified(true);
        say('인증이 완료됐어요. 새 비밀번호를 입력해 주세요.', true);
      } else {
        say('인증번호를 확인해 주세요.');
      }
    } catch (err) {
      say(err.message || '인증번호가 일치하지 않습니다.');
    }
  }

  async function submit(event) {
    event.preventDefault();
    if (loginId.trim().length < 4) return say('아이디를 입력해 주세요.');
    if (!verified) return say('인증을 완료해 주세요.');
    if (!isPasswordValid) return say('비밀번호 조건을 확인해 주세요.');
    if (password !== passwordConfirm) return say('비밀번호가 일치하지 않아요.');
    try {
      await resetPassword(sentTo, code, password);
      onDone?.({ loginId: sentTo, notice: '비밀번호가 재설정되었어요. 새 비밀번호로 로그인해 주세요.' });
    } catch (err) {
      say(err.status === 404 ? '비밀번호 재설정 기능은 서버 준비 중이에요.' : (err.message || '비밀번호 재설정에 실패했어요.'));
    }
  }

  return (
    <form className="signup-form find-form" onSubmit={submit}>
      <input
        className="text-input"
        aria-label="아이디"
        placeholder="아이디"
        autoComplete="username"
        value={loginId}
        onChange={(e) => { setLoginId(e.target.value); setVerified(false); }}
        onBlur={sendCode}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); sendCode(); } }}
      />
      <div className="verification-row">
        <input className="text-input" aria-label="인증번호 6자리" placeholder="인증번호 6자리" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
        <button className="verify-button" type="button" onClick={verifyCode}>{verified ? '인증 완료' : '인증 확인'}</button>
      </div>
      {sentTo && <p className="password-hint find-sent-note">해당 아이디의 이메일로 인증번호를 발송했습니다</p>}
      <div className="password-wrap signup-password">
        <input className="text-input password-input" aria-label="비밀번호" placeholder="비밀번호" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="eye-button" type="button" aria-label="비밀번호 표시/숨기기" onClick={() => setShowPassword((v) => !v)}><EyeIcon /></button>
      </div>
      <p className={`password-hint ${password && !isPasswordValid ? 'invalid' : ''}`}>영문, 숫자, 특수문자 포함 8자 이상, 특수문자 !@#$%^&amp;*만 사용가능</p>
      <div className="password-wrap signup-password">
        <input className="text-input password-input" aria-label="비밀번호 확인" placeholder="비밀번호 확인" type={showConfirm ? 'text' : 'password'} autoComplete="new-password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} />
        <button className="eye-button" type="button" aria-label="비밀번호 확인 표시/숨기기" onClick={() => setShowConfirm((v) => !v)}><EyeIcon /></button>
      </div>
      {message.text && <p className={`signup-notice ${message.ok ? 'success' : ''}`} role="status">{message.text}</p>}
      <div className="signup-bottom">
        <button className="primary-button" type="submit">비밀번호 재설정</button>
        <button className="signup-back-link" type="button" onClick={onBack}>로그인으로 돌아가기</button>
      </div>
    </form>
  );
}

function EyeIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.7" /></svg>;
}
