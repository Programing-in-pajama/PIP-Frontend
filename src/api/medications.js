import { mockSearchMedications } from '../mocks/medications';

// 약물 검색 — 백엔드 API(식약처 연계)가 정해지기 전까지 가짜 목록을 씁니다.
// 백엔드가 완성되면 apiData('/api/medications/search?query=...') 같은 형태로 교체하세요. (주소는 백엔드와 확정 필요)
export const searchMedications = (query) => mockSearchMedications(query);
