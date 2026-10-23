import { apiFetch, USE_MOCK } from './client';
import { mockSearchMedications } from '../mocks/medications';

/**
 * 약물 검색 API (백엔드 식약처 DUR 및 다빈도 처방 의약품 연동)
 * @param {string} query - 검색어 (예: '다이', '암로디핀')
 * @returns {Promise<Array<{ id, name, ingredientName, timing, cautionNote, durWarningTags }>>}
 */
export async function searchMedications(query) {
  const clean = String(query || '').trim();
  if (!clean) return [];

  if (USE_MOCK) {
    return mockSearchMedications(clean);
  }

  try {
    const list = await apiFetch(`/api/medications/search?query=${encodeURIComponent(clean)}`);
    if (Array.isArray(list)) {
      return list;
    }
    return [];
  } catch (err) {
    console.warn('⚠️ [약물 검색 백엔드 호출 실패, 로컬 목으로 안전 폴백]:', err.message);
    return mockSearchMedications(clean);
  }
}
