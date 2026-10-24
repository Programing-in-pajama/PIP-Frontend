// ──────────────────────────────────────────────────────────────
// 🧪 테스트 계정 (아이디: test / 비밀번호: 1234)
//
// 삭제 방법: 이 파일을 지우고 LoginPage.jsx 에서 아래 두 곳만 제거하면 됩니다.
//   1) import { isTestAccountLogin, TEST_PROFILE } from '../dev/testAccount';
//   2) handleLogin 안의 테스트 계정 분기(if (isTestAccountLogin(...)) { ... })
// 그 외 화면·API 코드는 테스트 계정을 전혀 알지 못합니다.
// ──────────────────────────────────────────────────────────────

export const TEST_ACCOUNT = {
  loginId: 'test',
  password: '1234',
};

export const TEST_PROFILE = {
  userName: '테스트',
  email: 'test@soyo.app',
  birthDate: '2007-03-05',
  allergies: ['계란', '꽃가루'],
  diseaseIds: ['D01', 'D05'],
  medications: ['다이아벡스정'],
  profileImage: null,
};

export function isTestAccountLogin(loginId, password) {
  return loginId?.trim() === TEST_ACCOUNT.loginId && password === TEST_ACCOUNT.password;
}
