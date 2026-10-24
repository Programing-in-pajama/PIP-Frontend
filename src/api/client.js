// 백엔드 API 주소 (환경 변수가 없으면 운영 Amplify에서는 Render 백엔드, 로컬에서는 localhost:8080 기본 사용)
export const API_BASE_URL = (
  import.meta.env.VITE_BACKEND_URL ||
  (import.meta.env.PROD ? 'https://program-in-pazama.onrender.com' : 'http://localhost:8080')
).replace(/\/+$/, '');

// true 이면 백엔드 대신 src/mocks 의 가짜 데이터를 사용
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

export async function apiFetch(path, { token, headers, ...options } = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
    }
  });

  const data = await res.json().catch(() => null);
  // 새 응답 형식 { success, data, error } 의 실패(success: false)도 에러로 처리
  if (!res.ok || data?.success === false) {
    const errorMsg = data?.error || (res.status === 404 ? '서버 API 엔드포인트를 찾을 수 없습니다 (404).' : `요청 실패 (HTTP ${res.status})`);
    throw new ApiError(errorMsg, res.status, data);
  }
  return data;
}

// 새 응답 형식 { success, data, error } 에서 data 만 꺼내기
// (기존 형식을 같이 쓰는 /api/test 같은 곳은 apiFetch 를 그대로 쓰세요)
export const apiData = (path, options) => apiFetch(path, options).then((res) => res?.data);

// 서버 에러 — 기존 형식(글자)과 새 형식({ title, code, message }) 및 추가 신호 플래그 보존
export class ApiError extends Error {
  constructor(error, status, data = null) {
    const isObject = error && typeof error === 'object';
    super((isObject ? error.message : error) || `요청 실패 (HTTP ${status})`);
    this.status = status;
    this.code = data?.code || (isObject ? error.code ?? null : null);
    this.title = isObject ? error.title ?? null : null;
    this.alreadyRegistered = Boolean(data?.alreadyRegistered || data?.isDuplicate);
    this.data = data;
  }
}

// 백엔드 연결 테스트 (GET /api/test)
export const checkHealth = () => apiFetch('/api/test');
