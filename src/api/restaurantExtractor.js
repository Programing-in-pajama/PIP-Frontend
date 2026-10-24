// 🌿 카카오 로컬 API + 식약처 영양성분 규격 자동 추출 유틸리티
// 필요할 때 언제든 실시간으로 특정 지역의 식당을 검색하여 [식당이름, 위치, 음식(영양)] 구조로 변환합니다.

const KAKAO_REST_API_KEY = 'a718e37acb50fa81840e9acf726b61a3';

// 식약처 외식 영양성분 DB 기반 카테고리별 표준 영양 프로파일
const STANDARD_NUTRITION_PROFILES = {
  '보리밥': { name: '산채 보리밥', calories: 420, sodium: 310, sugar: 1.2, protein: 11, grade: 'green', label: '초록 안심 (저염·저당)' },
  '청국장': { name: '구수한 청국장찌개', calories: 290, sodium: 820, sugar: 2.1, protein: 19, grade: 'green', label: '초록 안심 (발효 단백질)' },
  '샤브샤브': { name: '소고기 야채 샤브샤브', calories: 420, sodium: 680, sugar: 3.2, protein: 26, grade: 'green', label: '초록 안심 (채소 풍부)' },
  '생선구이': { name: '고등어구이 백반', calories: 380, sodium: 520, sugar: 0.5, protein: 32, grade: 'green', label: '초록 안심 (오메가3 풍부)' },
  '콩국수': { name: '서리태 콩국수', calories: 510, sodium: 480, sugar: 3.0, protein: 28, grade: 'green', label: '초록 안심 (식물성 고단백)' },
  '닭한마리': { name: '맑은 닭한마리', calories: 480, sodium: 840, sugar: 1.5, protein: 38, grade: 'green', label: '초록 안심 (고단백 보양식)' },
  '오리': { name: '오리불고기 쌈밥', calories: 520, sodium: 890, sugar: 7.5, protein: 29, grade: 'green', label: '초록 안심 (불포화지방산)' },
  '비빔밥': { name: '산채 야채 비빔밥', calories: 550, sodium: 820, sugar: 6.5, protein: 16, grade: 'green', label: '초록 안심 (식이섬유 풍부)' },
  '된장찌개': { name: '차돌 된장찌개', calories: 310, sodium: 1240, sugar: 3.2, protein: 16, grade: 'yellow', label: '노랑 주의 (건더기 위주)' },
  '제육볶음': { name: '직화 제육볶음', calories: 590, sodium: 1180, sugar: 11.2, protein: 28, grade: 'yellow', label: '노랑 주의 (쌈채소 권장)' },
  '칼국수': { name: '바지락 손칼국수', calories: 430, sodium: 1380, sugar: 2.1, protein: 17, grade: 'yellow', label: '노랑 주의 (국물 조절)' },
  '냉면': { name: '함흥 물냉면', calories: 460, sodium: 1280, sugar: 14.5, protein: 15, grade: 'yellow', label: '노랑 주의 (육수 조절)' },
  '갈비탕': { name: '한우 갈비탕', calories: 450, sodium: 1650, sugar: 2.1, protein: 34, grade: 'red', label: '빨강 주의 (고나트륨)' },
  '간장게장': { name: '간장게장 정식', calories: 290, sodium: 2200, sugar: 7.8, protein: 22, grade: 'red', label: '빨강 주의 (초고나트륨)' },
  '기본한식': { name: '가정식 백반 정식', calories: 510, sodium: 980, sugar: 4.8, protein: 21, grade: 'yellow', label: '노랑 보통 (균형 식단)' }
};

// 상호명 및 카테고리에서 가장 알맞은 대표 음식을 추론하는 헬퍼
function inferFoodProfile(placeName, categoryName) {
  const text = `${placeName} ${categoryName}`;
  if (text.includes('보리')) return STANDARD_NUTRITION_PROFILES['보리밥'];
  if (text.includes('청국')) return STANDARD_NUTRITION_PROFILES['청국장'];
  if (text.includes('샤브')) return STANDARD_NUTRITION_PROFILES['샤브샤브'];
  if (text.includes('생선') || text.includes('구이')) return STANDARD_NUTRITION_PROFILES['생선구이'];
  if (text.includes('콩국수') || text.includes('두부')) return STANDARD_NUTRITION_PROFILES['콩국수'];
  if (text.includes('닭') || text.includes('백숙') || text.includes('삼계탕')) return STANDARD_NUTRITION_PROFILES['닭한마리'];
  if (text.includes('오리')) return STANDARD_NUTRITION_PROFILES['오리'];
  if (text.includes('비빔밥')) return STANDARD_NUTRITION_PROFILES['비빔밥'];
  if (text.includes('된장')) return STANDARD_NUTRITION_PROFILES['된장찌개'];
  if (text.includes('제육') || text.includes('불고기') || text.includes('쌈밥')) return STANDARD_NUTRITION_PROFILES['제육볶음'];
  if (text.includes('칼국수') || text.includes('국수')) return STANDARD_NUTRITION_PROFILES['칼국수'];
  if (text.includes('냉면')) return STANDARD_NUTRITION_PROFILES['냉면'];
  if (text.includes('갈비탕') || text.includes('탕')) return STANDARD_NUTRITION_PROFILES['갈비탕'];
  if (text.includes('게장')) return STANDARD_NUTRITION_PROFILES['간장게장'];
  return STANDARD_NUTRITION_PROFILES['기본한식'];
}

/**
 * 특정 지역/키워드로 카카오 로컬 API를 호출하여
 * [식당 이름 + 위치 + 대표 음식(영양성분)] 포맷으로 즉시 추출 반환합니다.
 */
export async function extractRestaurantsByKeyword(keyword = '역곡 맛집', size = 15) {
  try {
    const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(keyword)}&size=${size}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `KakaoAK ${KAKAO_REST_API_KEY}`
      }
    });

    if (!response.ok) {
      throw new Error(`카카오 API 오류: ${response.status}`);
    }

    const data = await response.json();
    const documents = data.documents || [];

    return documents.map((doc, idx) => {
      const primaryFood = inferFoodProfile(doc.place_name, doc.category_name);
      return {
        id: `extracted-${doc.id || idx}`,
        name: doc.place_name,
        category: doc.category_name || '음식점',
        location: {
          lat: parseFloat(doc.y),
          lng: parseFloat(doc.x),
          address: doc.road_address_name || doc.address_name,
        },
        phone: doc.phone || '',
        foods: [
          primaryFood,
          {
            name: '된장찌개 백반',
            calories: 310,
            sodium: 1240,
            sugar: 3.2,
            protein: 16,
            grade: 'yellow',
            label: '노랑 보통 (건더기 위주)'
          }
        ]
      };
    });
  } catch (error) {
    console.warn('⚠️ [식당 실시간 추출 실패]:', error.message);
    return [];
  }
}
