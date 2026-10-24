import React, { useEffect, useState } from 'react';
import BirthDateInput from '../components/BirthDateInput';
import Icon from '../components/Icons';
import Sheet from '../components/Sheet';
import { ALLERGEN_CATEGORIES } from '../data/allergens';
import { DISEASE_CATEGORIES, getDiseaseName } from '../data/chronicDiseases';
import { MEDICATIONS, searchMedications } from '../data/medications';
import { isValidBirthDate } from '../utils/format';
import { sendEmailCode, verifyEmailCode } from '../api/auth';

const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;

// ✏️ 이미 가입된 이메일일 때 보여줄 문구 — 여기만 고치면 화면 문구가 바뀌어요.
//    (백엔드가 409 + code: 'ALREADY_REGISTERED' 를 보내면 서버 문구 대신 이 문구를 씀)
const ALREADY_REGISTERED_TEXT = {
  title: '이미 가입된 이메일이에요.',
  description: '아이디나 비밀번호가 기억나지 않으면 아래 버튼으로 찾아 주세요.',
  button: '아이디/비밀번호 찾기',
};

export default function SignupFlow({ onBack, onComplete, onFindAccount, initialDraft = {} }) {
  const isSocialUser = Boolean(initialDraft?.supabaseUserId || initialDraft?.isSocial);
  const [step, setStep] = useState(isSocialUser ? 2 : 1);
  const [form, setForm] = useState({
    loginId: initialDraft?.loginId || '',
    password: initialDraft?.password || (isSocialUser ? 'social_oauth_user' : ''),
    passwordConfirm: initialDraft?.password || (isSocialUser ? 'social_oauth_user' : ''),
    email: initialDraft?.email || '',
    supabaseUserId: initialDraft?.supabaseUserId || null,
    code: '',
    termsAgreed: isSocialUser,
    name: initialDraft?.name || '',
    birthDate: initialDraft?.birthDate || '',
    allergies: [],
    diseaseIds: [],
    medications: [],
    healthConsent: isSocialUser,
    noAllergy: false,
    noDisease: false,
    noMedication: false,
  });
  const [codeSent, setCodeSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [demoCode, setDemoCode] = useState(false);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false); // 이미 가입된 이메일 (409)
  const [authMessage, setAuthMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [picker, setPicker] = useState(null); // allergy | disease | medication

  const isPasswordValid = PASSWORD_RULE.test(form.password);
  const hasHealthInfo =
    form.allergies.length > 0 || form.diseaseIds.length > 0 || form.medications.length > 0;

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setAuthMessage('');
  }

  function toggleItem(key, item, emptyKey) {
    setForm((current) => {
      const exists = current[key].includes(item);
      return {
        ...current,
        [key]: exists ? current[key].filter((entry) => entry !== item) : [...current[key], item],
        ...(emptyKey ? { [emptyKey]: false } : {}),
      };
    });
    setAuthMessage('');
  }

  function continueToProfile(event) {
    event.preventDefault();
    if (form.loginId.trim().length < 4) return setAuthMessage('아이디를 4자 이상 입력해 주세요.');
    if (!isPasswordValid) return setAuthMessage('비밀번호 조건을 확인해 주세요.');
    if (form.password !== form.passwordConfirm) return setAuthMessage('비밀번호가 일치하지 않아요.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      return setAuthMessage('올바른 E-mail 주소를 입력해 주세요.');
    }
    if (!verified) return setAuthMessage('E-mail 인증을 완료해 주세요.');
    if (!form.termsAgreed) return setAuthMessage('필수 약관에 동의해 주세요.');

    setStep(2);
    setAuthMessage('');
  }

  async function sendCode() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      return setAuthMessage('먼저 올바른 E-mail 주소를 입력해 주세요.');
    }

    setIsSending(true);
    setAuthMessage('');
    setAlreadyRegistered(false);
    try {
      await sendEmailCode(form.email);
      setCodeSent(true);
      setVerified(false);
      setDemoCode(false);
      // 서버 메시지(res.message)에 인증번호가 들어 있을 수 있어서 화면에는 고정 문구만 보여줘요.
      setAuthMessage('인증번호가 발송되었어요. 메일함을 확인해 주세요.');
    } catch (error) {
      if (error.status === 409 || error.alreadyRegistered || error.code === 'ALREADY_REGISTERED') {
        setCodeSent(false);
        setVerified(false);
        setDemoCode(false);
        setAlreadyRegistered(true);
        setAuthMessage(''); // 안내는 아래 alreadyRegistered 상자에서 보여줌
        return;
      }
      // 백엔드가 아직 연결되지 않은 상태에서도 가입 흐름을 확인할 수 있게 합니다.
      setCodeSent(true);
      setVerified(false);
      setDemoCode(true);
      setAuthMessage('인증번호가 발송되었어요. (개발용 인증번호: 123456)');
      console.warn('⚠️ [회원가입] 메일 서버 대신 개발용 인증번호를 사용합니다:', error.message);
    } finally {
      setIsSending(false);
    }
  }

  async function verifyCode() {
    if (!codeSent || !form.code) return setAuthMessage('인증번호를 입력해 주세요.');

    if (demoCode) {
      if (form.code === '123456') {
        setVerified(true);
        setAuthMessage('E-mail 인증이 완료됐어요.');
      } else {
        setVerified(false);
        setAuthMessage('인증번호를 확인해 주세요.');
      }
      return;
    }

    try {
      const res = await verifyEmailCode(form.email, form.code);
      if (res?.verified) {
        setVerified(true);
        setAuthMessage('E-mail 인증이 완료됐어요.');
      } else {
        setVerified(false);
        setAuthMessage(res?.error || '인증번호를 확인해 주세요.');
      }
    } catch (error) {
      setVerified(false);
      setAuthMessage(error.message || '인증번호가 일치하지 않습니다.');
    }
  }

  async function completeProfile(event) {
    event.preventDefault();
    if (!form.name.trim()) return setAuthMessage('이름을 입력해 주세요.');
    if (!isValidBirthDate(form.birthDate)) {
      return setAuthMessage('생년월일을 달력에서 다시 선택해 주세요.');
    }
    if (hasHealthInfo && !form.healthConsent) {
      return setAuthMessage('건강 정보를 저장하려면 이용 동의가 필요해요.');
    }

    setIsSaving(true);
    setAuthMessage('');
    try {
      await onComplete({ ...form, name: form.name.trim() });
    } catch (error) {
      setAuthMessage(error.message || '회원정보 저장에 실패했어요. 다시 시도해 주세요.');
    } finally {
      setIsSaving(false);
    }
  }

  const allergySummary = form.noAllergy
    ? '알레르기가 없습니다'
    : form.allergies.length
      ? form.allergies.join(', ')
      : '';
  const diseaseSummary = form.noDisease
    ? '기저질환이 없습니다'
    : form.diseaseIds.length
      ? form.diseaseIds.map(getDiseaseName).join(', ')
      : '';
  const medicationSummary = form.noMedication
    ? '복용 중인 약물이 없습니다'
    : form.medications.join(', ');

  return (
    <main className="auth-screen">
      <div className="auth-scroll signup-scroll">
        {step === 1 ? (
          <>
            <header className="signup-head">
              <h1>회원가입</h1>
              <p>1 / 2 계정 정보를 입력해 주세요</p>
            </header>

            <form className="signup-form" onSubmit={continueToProfile} noValidate>
              <input
                className="input"
                aria-label="아이디"
                placeholder="아이디"
                autoComplete="username"
                value={form.loginId}
                onChange={(event) => update('loginId', event.target.value)}
              />

              <div className="input-wrap">
                <input
                  className="input has-icon"
                  aria-label="비밀번호"
                  placeholder="비밀번호"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(event) => update('password', event.target.value)}
                />
                <button
                  type="button"
                  className="input-icon-btn"
                  aria-label="비밀번호 표시/숨기기"
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  <Icon name={showPassword ? 'eye' : 'eye-off'} size={19} />
                </button>
              </div>
              <p className={`password-hint ${form.password && !isPasswordValid ? 'invalid' : ''}`}>
                영문, 숫자, 특수문자 포함 8자 이상, 특수문자 !@#$%^&*만 사용 가능
              </p>

              <div className="input-wrap">
                <input
                  className="input has-icon"
                  aria-label="비밀번호 확인"
                  placeholder="비밀번호 확인"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={form.passwordConfirm}
                  onChange={(event) => update('passwordConfirm', event.target.value)}
                />
                <button
                  type="button"
                  className="input-icon-btn"
                  aria-label="비밀번호 확인 표시/숨기기"
                  onClick={() => setShowConfirm((visible) => !visible)}
                >
                  <Icon name={showConfirm ? 'eye' : 'eye-off'} size={19} />
                </button>
              </div>

              <div className="inline-fields">
                <input
                  className="input"
                  aria-label="E-mail"
                  placeholder="E-mail"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(event) => {
                    update('email', event.target.value);
                    setVerified(false);
                    setCodeSent(false);
                    setAlreadyRegistered(false);
                  }}
                />
                <button type="button" className="pill-btn pill-btn--light" onClick={sendCode} disabled={isSending}>
                  {isSending ? '전송 중' : codeSent ? '재전송' : '인증번호 전송'}
                </button>
              </div>

              <div className="inline-fields">
                <input
                  className="input"
                  aria-label="인증번호 6자리"
                  placeholder="인증번호 6자리"
                  inputMode="numeric"
                  maxLength={6}
                  value={form.code}
                  onChange={(event) => update('code', event.target.value.replace(/\D/g, ''))}
                />
                <button type="button" className="pill-btn pill-btn--dark" onClick={verifyCode}>
                  {verified ? '인증 완료' : '인증 확인'}
                </button>
              </div>

              <label className="check check--terms">
                <input
                  type="checkbox"
                  checked={form.termsAgreed}
                  onChange={(event) => update('termsAgreed', event.target.checked)}
                />
                <span>[필수] 이용약관 및 개인정보 수집·이용에 동의합니다.</span>
              </label>

              {alreadyRegistered && (
                <div className="already-registered" role="alert">
                  <strong>{ALREADY_REGISTERED_TEXT.title}</strong>
                  <p>{ALREADY_REGISTERED_TEXT.description}</p>
                  {onFindAccount && (
                    <button type="button" className="already-registered-btn" onClick={() => onFindAccount({ email: form.email })}>
                      {ALREADY_REGISTERED_TEXT.button}
                    </button>
                  )}
                </div>
              )}

              {authMessage && (
                <p className={`form-message ${verified ? 'is-success' : ''}`} role="status">
                  {authMessage}
                </p>
              )}

              <div className="auth-bottom signup-bottom">
                <button type="submit" className="btn btn-primary">다음</button>
                <button type="button" className="text-btn auth-skip" onClick={onBack}>
                  로그인으로 돌아가기
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <header className="signup-head signup-head--profile">
              <div className="signup-head-row">
                {!isSocialUser && (
                  <button
                    type="button"
                    className="back-btn"
                    onClick={() => {
                      setStep(1);
                      setAuthMessage('');
                    }}
                    aria-label="이전 단계"
                  >
                    <Icon name="chevron-left" size={20} />
                  </button>
                )}
                <h1>나의 정보 입력</h1>
              </div>
              <p>2 / 2 맞춤 추천에 활용됩니다</p>
            </header>

            <form className="signup-form profile-form" onSubmit={completeProfile} noValidate>
              <input
                className="input"
                aria-label="이름"
                placeholder="이름"
                autoComplete="name"
                value={form.name}
                onChange={(event) => update('name', event.target.value)}
              />

              <div>
                <BirthDateInput
                  value={form.birthDate}
                  onChange={(value) => update('birthDate', value)}
                  aria-label="생년월일"
                />
                <p className="input-hint">칸을 누르면 달력이 열려요.</p>
              </div>

              <div className="profile-group">
                <span className="field-label">알레르기 여부</span>
                <button type="button" className="select-field" onClick={() => setPicker('allergy')}>
                  <span className={allergySummary ? '' : 'placeholder'}>
                    {allergySummary || '알레르기 카테고리 선택'}
                  </span>
                  <Icon name="chevron-right" size={18} />
                </button>
                <label className="check check--soft">
                  <input
                    type="checkbox"
                    checked={form.noAllergy}
                    onChange={(event) => {
                      update('noAllergy', event.target.checked);
                      if (event.target.checked) update('allergies', []);
                    }}
                  />
                  <span>알레르기가 없습니다.</span>
                </label>
              </div>

              <div className="profile-group">
                <span className="field-label">기저질환</span>
                <button type="button" className="select-field" onClick={() => setPicker('disease')}>
                  <span className={diseaseSummary ? '' : 'placeholder'}>
                    {diseaseSummary || '질병 카테고리 선택'}
                  </span>
                  <Icon name="chevron-right" size={18} />
                </button>
                <label className="check check--soft">
                  <input
                    type="checkbox"
                    checked={form.noDisease}
                    onChange={(event) => {
                      update('noDisease', event.target.checked);
                      if (event.target.checked) update('diseaseIds', []);
                    }}
                  />
                  <span>기저질환이 없습니다.</span>
                </label>
              </div>

              <div className="profile-group">
                <span className="field-label">복용 중인 약물</span>
                <button type="button" className="select-field" onClick={() => setPicker('medication')}>
                  <span className={medicationSummary ? '' : 'placeholder'}>
                    {medicationSummary || '약물 검색 및 등록'}
                  </span>
                  <Icon name="chevron-right" size={18} />
                </button>
                <label className="check check--soft">
                  <input
                    type="checkbox"
                    checked={form.noMedication}
                    onChange={(event) => {
                      update('noMedication', event.target.checked);
                      if (event.target.checked) update('medications', []);
                    }}
                  />
                  <span>복용중인 약물이 없습니다.</span>
                </label>
              </div>

              <label className="check check--terms">
                <input
                  type="checkbox"
                  checked={form.healthConsent}
                  onChange={(event) => update('healthConsent', event.target.checked)}
                />
                <span>건강 정보를 맞춤 코스 추천에 이용하는 데 동의합니다.</span>
              </label>

              {authMessage && <p className="form-message" role="status">{authMessage}</p>}

              <p className="privacy-note">입력한 정보는 맞춤 코스 추천에 활용됩니다</p>

              <div className="auth-bottom signup-bottom">
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  {isSaving ? '저장 중...' : '시작하기'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>

      {picker === 'allergy' && (
        <Sheet
          title="알레르기 선택"
          subtitle="해당하는 항목을 모두 선택해 주세요"
          onClose={() => setPicker(null)}
          footer={
            <button type="button" className="btn btn-primary" onClick={() => setPicker(null)}>
              선택 완료 {form.allergies.length ? `(${form.allergies.length})` : ''}
            </button>
          }
        >
          {ALLERGEN_CATEGORIES.map((category) => (
            <section key={category.id} className="picker-section">
              <h3>{category.name}</h3>
              <div className="allergen-grid">
                {category.items.map((item) => {
                  const selected = form.allergies.includes(item.name);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`allergen-chip ${selected ? 'selected' : ''}`}
                      onClick={() => toggleItem('allergies', item.name, 'noAllergy')}
                    >
                      <span>
                        {item.name}
                        <small>{item.note}</small>
                      </span>
                      <span className="allergen-mark">{selected ? '✓' : '+'}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </Sheet>
      )}

      {picker === 'disease' && (
        <Sheet
          title="기저질환 선택"
          subtitle="해당하는 질환을 모두 선택해 주세요"
          onClose={() => setPicker(null)}
          footer={
            <button type="button" className="btn btn-primary" onClick={() => setPicker(null)}>
              선택 완료 {form.diseaseIds.length ? `(${form.diseaseIds.length})` : ''}
            </button>
          }
        >
          {DISEASE_CATEGORIES.map((category) => (
            <section key={category.id} className="picker-section">
              <h3>{category.name}</h3>
              <div className="check-list">
                {category.diseases.map((disease) => (
                  <label key={disease.id} className={`check-row ${form.diseaseIds.includes(disease.id) ? 'selected' : ''}`}>
                    <input
                      type="checkbox"
                      checked={form.diseaseIds.includes(disease.id)}
                      onChange={() => toggleItem('diseaseIds', disease.id, 'noDisease')}
                    />
                    <span>{disease.name}</span>
                  </label>
                ))}
              </div>
            </section>
          ))}
        </Sheet>
      )}

      {picker === 'medication' && (
        <MedicationPickerSheet
          selected={form.medications}
          onChange={(next) => update('medications', next)}
          onClose={() => setPicker(null)}
          onClearNoMedication={() => update('noMedication', false)}
        />
      )}
    </main>
  );
}

function MedicationPickerSheet({ selected, onChange, onClose, onClearNoMedication }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(MEDICATIONS.slice(0, 5));
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults(MEDICATIONS.slice(0, 5));
      setIsLoading(false);
      return undefined;
    }
    setIsLoading(true);
    const timer = setTimeout(() => {
      setResults(searchMedications(query));
      setIsLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const toggle = (name) => {
    onClearNoMedication();
    onChange(selected.includes(name) ? selected.filter((item) => item !== name) : [...selected, name]);
  };

  return (
    <Sheet
      title="약물 검색"
      subtitle="약물 이름의 일부를 입력해 찾아보세요"
      onClose={onClose}
      footer={
        <button type="button" className="btn btn-primary" onClick={onClose}>
          선택 완료 {selected.length ? `(${selected.length})` : ''}
        </button>
      }
    >
      <div className="input-wrap">
        <input
          className="input has-icon"
          placeholder="검색어 예시) 다이"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoFocus
        />
        <span className="input-icon-static">
          <Icon name="search" size={18} />
        </span>
      </div>

      {isLoading ? (
        <div className="search-loading">
          <span className="spinner" />
          <p>약물을 검색하고 있어요</p>
        </div>
      ) : (
        <div className="result-list">
          {results.map((med) => {
            const isSelected = selected.includes(med.name);
            return (
              <button
                key={med.id}
                type="button"
                className={`result-row ${isSelected ? 'selected' : ''}`}
                onClick={() => toggle(med.name)}
              >
                <span className="result-main">
                  <strong>{med.name}</strong>
                  <small>{med.ingredients.join(', ')}</small>
                  <em><Icon name="alert" size={12} /> {med.caution}</em>
                </span>
                <span className={`result-select ${isSelected ? 'is-on' : ''}`}>
                  {isSelected ? '✓ 선택됨' : '+ 선택'}
                </span>
              </button>
            );
          })}
          {results.length === 0 && (
            <div className="empty-state compact">
              <strong>검색 결과가 없어요</strong>
              <p>약물 이름의 일부를 다시 입력해 주세요.</p>
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}
