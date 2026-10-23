// ⚠️ 화면 확인용 예시 약물 목록입니다. Figma 시안의 예시 데이터를 그대로 옮겼어요. (실제 의학 정보 아님)
// 실제 약물 정보(성분·주의사항)는 백엔드가 식약처 데이터로 채워서 보내줄 예정이에요.
// 필드 이름은 DB user_medications 기준 (name, ingredientName, timing, cautionNote, durWarningTags)
// ingredientName 에 성분이 여러 개면 + 로 이어서 적어요. (성분 중복 검사에 사용)

// 약물 검색 결과 (Figma no.15: '다이' 검색)
export const MOCK_MEDICATION_CATALOG = [
  { id: 'm01', name: '다이아벡스정', ingredientName: '메트포르민', timing: null, cautionNote: '약물별 주의사항 내용 (예시)', durWarningTags: null },
  { id: 'm02', name: '다이아릴정', ingredientName: '글리메피리드', timing: null, cautionNote: '약물별 주의사항 내용 (예시)', durWarningTags: null },
  { id: 'm03', name: '다이보정', ingredientName: '성분명 예시', timing: null, cautionNote: '약물별 주의사항 내용 (예시)', durWarningTags: null },
];

// 처음 등록돼 있는 약물 (Figma no.17: "기존 2개" / no.18: 등록 약물 A·B 성분 중복)
export const MOCK_REGISTERED_MEDICATIONS = [
  { id: 'mA', name: '등록 약물 A', ingredientName: '중복 성분 예시', timing: null, cautionNote: '주의사항 내용 (예시)', durWarningTags: null },
  { id: 'mB', name: '등록 약물 B', ingredientName: '중복 성분 예시', timing: null, cautionNote: '주의사항 내용 (예시)', durWarningTags: null },
];

const normalize = (text) => text.replace(/\s+/g, '').toLowerCase();

export const mockSearchMedications = async (query) => {
  await new Promise((resolve) => setTimeout(resolve, 200));
  const keyword = normalize(query);
  if (!keyword) return [];
  return MOCK_MEDICATION_CATALOG.filter((med) => normalize(med.name).includes(keyword));
};
