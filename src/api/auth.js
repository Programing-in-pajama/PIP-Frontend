import { apiFetch } from './client';

// 이메일 인증번호 발송 요청 (백엔드로 요청 전송, type: 'signup' | 'find')
export async function sendEmailCode(email, type = 'signup') {
  return await apiFetch('/api/auth/email/send-code', {
    method: 'POST',
    body: JSON.stringify({ email, type })
  });
}

// 이메일 인증번호 검증 요청 (백엔드로 요청 전송)
export async function verifyEmailCode(email, code) {
  return await apiFetch('/api/auth/email/verify-code', {
    method: 'POST',
    body: JSON.stringify({ email, code })
  });
}

// 2단계 건강 프로필 저장 요청 (AWS RDS PostgreSQL DB 영구 저장)
export async function saveUserProfile(profileData) {
  return await apiFetch('/api/auth/profile', {
    method: 'POST',
    body: JSON.stringify(profileData)
  });
}

// AWS RDS 사용자 프로필 조회 요청
export async function getUserProfile(userId) {
  return await apiFetch(`/api/auth/profile/${encodeURIComponent(userId)}`, {
    method: 'GET'
  });
}

// 일반 아이디/비밀번호 로그인 요청 (모든 기기 동기화)
export async function loginUser(loginId, password) {
  return await apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ loginId, password })
  });
}

// 네이버 소셜 로그인 콜백 처리 요청
export async function naverAuthCallback(code, state) {
  try {
    return await apiFetch('/api/auth/naver', {
      method: 'POST',
      body: JSON.stringify({ code, state })
    });
  } catch (err) {
    console.error('❌ [naverAuthCallback 통신 에러]:', err);
    return {
      success: false,
      error: err.message || (typeof err === 'object' ? JSON.stringify(err) : String(err))
    };
  }
}

// 아이디 찾기 요청 (이름 + 이메일로 아이디 조회)
export async function findLoginId(name, email) {
  return await apiFetch('/api/auth/find-id', {
    method: 'POST',
    body: JSON.stringify({ name, email })
  });
}

// 비밀번호 재설정 인증코드 발송 요청 (아이디로 등록된 이메일 조회 후 발송)
export async function sendPasswordResetCode(loginId) {
  return await apiFetch('/api/auth/password-reset/send-code', {
    method: 'POST',
    body: JSON.stringify({ loginId })
  });
}

// 비밀번호 재설정 인증코드 검증 요청
export async function verifyPasswordResetCode(loginId, code) {
  return await apiFetch('/api/auth/password-reset/verify-code', {
    method: 'POST',
    body: JSON.stringify({ loginId, code })
  });
}

// 비밀번호 재설정 확정 요청 (새 비밀번호 등록)
export async function resetPassword(loginId, code, newPassword) {
  return await apiFetch('/api/auth/password-reset', {
    method: 'POST',
    body: JSON.stringify({ loginId, code, newPassword })
  });
}


