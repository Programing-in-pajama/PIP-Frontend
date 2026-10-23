import { apiFetch, USE_MOCK, API_BASE_URL } from './client';
import { mockSearchMedications } from '../mocks/medications';

/**
 * 약물 검색 API (백엔드 식약처 DUR 및 다빈도 처방 의약품 연동)
 * @param {string} query - 검색어 (예: '다이', '암로디핀')
 * @returns {Promise<Array<{ id, name, ingredientName, timing, cautionNote, durWarningTags }>>}
 */
export async function searchMedications(query) {
  const clean = String(query || '').trim();
  if (!clean) return [];

  console.log(`\n🔍 [약물 검색 시작] 검색어: "${clean}" ➔ 백엔드(${API_BASE_URL}) 요청 전송`);
  console.log(`⏳ [약물 검색 로딩 중] 정보를 가져오는 중입니다... (식약처 DUR 및 의약품 마스터 DB 조회)`);

  if (USE_MOCK) {
    console.log(`ℹ️ [약물 검색] MOCK 모드 활성화로 로컬 목 데이터를 반환합니다.`);
    return mockSearchMedications(clean);
  }

  try {
    const list = await apiFetch(`/api/medications/search?query=${encodeURIComponent(clean)}`);
    if (Array.isArray(list)) {
      console.log(`✅ [약물 검색 완료] 정보를 성공적으로 가져왔습니다! (총 ${list.length}건 수신)`, list);
      return list;
    }
    console.warn(`⚠️ [약물 검색 응답] 결과가 배열 형태가 아닙니다:`, list);
    return [];
  } catch (err) {
    console.warn(`⚠️ [약물 검색 실패, 로컬 목으로 안전 폴백]:`, err.message);
    return mockSearchMedications(clean);
  }
}
