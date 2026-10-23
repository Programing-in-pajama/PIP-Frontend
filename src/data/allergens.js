// 알레르기 선택 목록 — Figma "no.14 알레르기 수정" 화면 그대로 (식품 알레르기 25종)
// sub: 항목 아래 작은 설명 (없으면 생략)
export const ALLERGEN_GROUPS = [
  {
    id: 'eggDairyGrain',
    name: '알류·유제품·곡물·콩류',
    items: [
      { name: '알류', sub: '계란 / 가금류' },
      { name: '우유', sub: '유제품' },
      { name: '메밀' },
      { name: '땅콩' },
      { name: '대두', sub: '콩류' },
      { name: '밀', sub: '소맥 / 글루텐' },
    ],
  },
  {
    id: 'seafood',
    name: '수산물',
    items: [
      { name: '고등어' },
      { name: '게', sub: '갑각류' },
      { name: '새우', sub: '갑각류' },
      { name: '오징어' },
      { name: '조개류', sub: '기타' },
      { name: '굴' },
      { name: '전복' },
      { name: '홍합' },
    ],
  },
  {
    id: 'meat',
    name: '육류',
    items: [{ name: '돼지고기' }, { name: '닭고기' }, { name: '쇠고기' }],
  },
  {
    id: 'nutSeed',
    name: '견과류·씨앗',
    items: [
      { name: '호두' },
      { name: '잣' },
      { name: '참깨 및 들깨' },
      { name: '기타 견과류', sub: '아몬드 / 캐슈넛 / 피스타치오' },
    ],
  },
  {
    id: 'fruitVeg',
    name: '과일·채소',
    items: [{ name: '복숭아' }, { name: '토마토' }, { name: '키위 및 아열대 과일' }],
  },
  {
    id: 'additive',
    name: '첨가물',
    items: [{ name: '아황산류' }],
  },
];

export const ALLERGEN_LIST = ALLERGEN_GROUPS.flatMap((group) => group.items.map((item) => item.name));
export const ALLERGEN_COUNT = ALLERGEN_LIST.length; // 25

// 알레르기 관리 카드의 작은 분류 글씨 (Figma: 계란 → 식품). 목록에 없는 직접 입력 항목은 '직접 입력'
export const getAllergenCategory = (name) => (ALLERGEN_LIST.includes(name) ? '식품' : '직접 입력');
