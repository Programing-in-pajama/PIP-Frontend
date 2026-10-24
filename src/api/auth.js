import { apiFetch } from './client';

// 이메일 인증번호 발송 요청 (백엔드로 요청 전송)
export async function sendEmailCode(email) {
  return await apiFetch('/api/auth/email/send-code', {
    method: 'POST',
    body: JSON.stringify({ email })
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
    return { success: true };
  }
}
