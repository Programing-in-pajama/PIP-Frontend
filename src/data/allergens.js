// 알레르기 선택지 (식품 하위 6종 분류 + 약물 / 꽃가루·먼지 / 기타)
export const ALLERGEN_CATEGORIES = [
  {
    id: 'food_dairy_grain_bean',
    group: '식품',
    name: '알류·유제품·곡류·콩류',
    items: [
      { id: 'egg', name: '계란', note: '알류' },
      { id: 'milk', name: '우유', note: '유제품' },
      { id: 'buckwheat', name: '메밀', note: '곡류' },
      { id: 'wheat', name: '밀', note: '곡류' },
      { id: 'soy', name: '대두', note: '콩류' },
      { id: 'bean', name: '콩', note: '콩류' },
    ],
  },
  {
    id: 'food_seafood',
    group: '식품',
    name: '수산물',
    items: [
      { id: 'mackerel', name: '고등어', note: '생선' },
      { id: 'crab', name: '게', note: '갑각류' },
      { id: 'shrimp', name: '새우', note: '갑각류' },
      { id: 'squid', name: '오징어', note: '연체동물' },
      { id: 'shellfish', name: '조개', note: '패류' },
      { id: 'oyster', name: '굴', note: '패류' },
      { id: 'abalone', name: '전복', note: '패류' },
      { id: 'mussel', name: '홍합', note: '패류' },
    ],
  },
  {
    id: 'food_meat',
    group: '식품',
    name: '육류',
    items: [
      { id: 'pork', name: '돼지고기', note: '육류' },
      { id: 'beef', name: '소고기', note: '육류' },
      { id: 'chicken', name: '닭고기', note: '육류' },
    ],
  },
  {
    id: 'food_nuts_seeds',
    group: '식품',
    name: '견과류·씨앗',
    items: [
      { id: 'peanut', name: '땅콩', note: '견과류' },
      { id: 'walnut', name: '호두', note: '견과류' },
      { id: 'pine', name: '잣', note: '견과류' },
      { id: 'sesame', name: '참깨', note: '씨앗류' },
    ],
  },
  {
    id: 'food_fruit_veg',
    group: '식품',
    name: '과일·채소',
    items: [
      { id: 'peach', name: '복숭아', note: '과일' },
      { id: 'tomato', name: '토마토', note: '과채류' },
      { id: 'kiwi', name: '키위', note: '과일' },
    ],
  },
  {
    id: 'food_additive',
    group: '식품',
    name: '첨가물',
    items: [
      { id: 'sulfite', name: '아황산류', note: '식품첨가물' },
    ],
  },
  {
    id: 'drug',
    group: '약물',
    name: '약물',
    items: [
      { id: 'nsaid', name: '소염진통제', note: 'NSAIDs·아스피린' },
      { id: 'penicillin', name: '페니실린', note: '항생제' },
      { id: 'sulfa', name: '설파제', note: '항생제' },
      { id: 'iodine', name: '조영제', note: '요오드' },
    ],
  },
  {
    id: 'environment',
    group: '꽃가루·먼지',
    name: '꽃가루·먼지',
    items: [
      { id: 'pollen', name: '꽃가루', note: '환경' },
      { id: 'dust', name: '집먼지', note: '환경' },
      { id: 'mold', name: '곰팡이', note: '환경' },
      { id: 'pet', name: '반려동물 털', note: '환경' },
      { id: 'cockroach', name: '바퀴벌레', note: '환경' },
    ],
  },
  {
    id: 'other',
    group: '기타',
    name: '기타',
    items: [
      { id: 'latex', name: '라텍스', note: '기타' },
      { id: 'metal', name: '금속', note: '기타' },
      { id: 'perfume', name: '향료', note: '기타' },
      { id: 'sunlight', name: '햇빛', note: '기타' },
    ],
  },
];

export const ALLERGEN_LIST = ALLERGEN_CATEGORIES.flatMap((category) =>
  category.items.map((item) => ({ ...item, categoryId: category.id, categoryName: category.name })),
);

export const getAllergen = (name) => ALLERGEN_LIST.find((item) => item.name === name);
