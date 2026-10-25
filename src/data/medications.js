// 복용 약물 카탈로그 (프론트엔드 시연용)
// 성분(ingredients)이 겹치면 '성분 중복 주의' 안내를 표시합니다.
export const MEDICATIONS = [
  {
    id: 'diavex',
    name: '다이아벡스정',
    ingredients: ['메트포르민염산염'],
    category: '당뇨병 치료제',
    caution: '신장 기능이 저하된 경우 사용에 주의가 필요해요.',
  },
  {
    id: 'diamicron',
    name: '다이아미크론정',
    ingredients: ['글리클라지드'],
    category: '당뇨병 치료제',
    caution: '식사 후 저혈당이 나타날 수 있어요.',
  },
  {
    id: 'diaformin',
    name: '다이아포민정',
    ingredients: ['메트포르민염산염', '시타글립틴'],
    category: '당뇨병 치료제',
    caution: '단독 요법으로 사용하지 않도록 주의해요.',
  },
  {
    id: 'glucophage',
    name: '글루코파지정',
    ingredients: ['메트포르민염산염'],
    category: '당뇨병 치료제',
    caution: '위장 장애가 나타나면 식후 복용해 주세요.',
  },
  {
    id: 'januvia',
    name: '자누비아정',
    ingredients: ['시타글립틴'],
    category: '당뇨병 치료제',
    caution: '췌장염 병력이 있다면 의사와 상담하세요.',
  },
  {
    id: 'amaryl',
    name: '아마릴정',
    ingredients: ['글리메피리드'],
    category: '당뇨병 치료제',
    caution: '공복에 복용하면 저혈당 위험이 있어요.',
  },
  {
    id: 'aspirin',
    name: '아스피린프로텍트정',
    ingredients: ['아세틸살리실산'],
    category: '혈전 예방제',
    caution: '출혈 경향이 있거나 수술을 앞두고 있다면 주의하세요.',
  },
  {
    id: 'lipitor',
    name: '리피토정',
    ingredients: ['아토르바스타틴'],
    category: '고지혈증 치료제',
    caution: '근육통이나 전신 피로가 지속되면 진료를 받으세요.',
  },
  {
    id: 'crestor',
    name: '크레스토정',
    ingredients: ['로수바스타틴'],
    category: '고지혈증 치료제',
    caution: '근육 손상 증상이 나타나면 복용을 중단하고 상담하세요.',
  },
  {
    id: 'norvasc',
    name: '노바스크정',
    ingredients: ['암로디핀'],
    category: '고혈압 치료제',
    caution: '발목 부종이나 어지러움이 나타날 수 있어요.',
  },
  {
    id: 'cozaar',
    name: '코자정',
    ingredients: ['로사르탄칼륨'],
    category: '고혈압 치료제',
    caution: '임신 중에는 복용하지 마세요.',
  },
  {
    id: 'amodipin',
    name: '아모잘탄정',
    ingredients: ['암로디핀', '로사르탄칼륨'],
    category: '고혈압 치료제',
    caution: '어지럽거나 기운이 빠지는 느낌이 들 수 있어요.',
  },
  {
    id: 'tylenol',
    name: '타이레놀정',
    ingredients: ['아세트아미노펜'],
    category: '해열진통제',
    caution: '하루 최대 용량을 넘기지 말고 음주를 피하세요.',
  },
  {
    id: 'brufen',
    name: '부루펜정',
    ingredients: ['이부프로펜'],
    category: '소염진통제',
    caution: '위장 장애가 생길 수 있어 식후 복용이 좋아요.',
  },
  {
    id: 'celebrex',
    name: '세레브렉스캡슐',
    ingredients: ['셀레콕시브'],
    category: '소염진통제',
    caution: '심혈관 질환이 있다면 장기 복용에 주의하세요.',
  },
  {
    id: 'zytorin',
    name: '자이토린정',
    ingredients: ['아토르바스타틴', '에제티미브'],
    category: '고지혈증 치료제',
    caution: '간 기능 검사를 정기적으로 확인해 주세요.',
  },
  {
    id: 'plavix',
    name: '플라빅스정',
    ingredients: ['클로피도그렐'],
    category: '혈전 예방제',
    caution: '멍이 쉽게 들거나 출혈이 오래 지속될 수 있어요.',
  },
  {
    id: 'lasix',
    name: '라식스정',
    ingredients: ['푸로세미드'],
    category: '이뇨제',
    caution: '탈수와 전해질 불균형에 주의하고 충분히 수분을 섭취하세요.',
  },
  {
    id: 'omepra',
    name: '오메프라졸캡슐',
    ingredients: ['오메프라졸'],
    category: '위장약',
    caution: '장기 복용 시 골밀도 저하 가능성이 있어요.',
  },
  {
    id: 'gaviscon',
    name: '개비스콘정',
    ingredients: ['알긴산나트륨'],
    category: '위장약',
    caution: '다른 약과 2시간 이상 간격을 두고 복용하세요.',
  },
  {
    id: 'zyrtec',
    name: '지르텍정',
    ingredients: ['세티리진'],
    category: '알레르기 치료제',
    caution: '졸음이 올 수 있어 운전 시 주의하세요.',
  },
  {
    id: 'allegra',
    name: '알레그라정',
    ingredients: ['펙소페나딘'],
    category: '알레르기 치료제',
    caution: '신장 기능이 낮다면 용량 조절이 필요해요.',
  },
  {
    id: 'singulair',
    name: '싱귤레어정',
    ingredients: ['몬테루카스트'],
    category: '천식 치료제',
    caution: '기분 변화나 수면 장애가 나타나면 상담하세요.',
  },
  {
    id: 'ventolin',
    name: '벤토린흡입제',
    ingredients: ['살부타몰'],
    category: '천식 치료제',
    caution: '흡입 후 두근거림이 나타날 수 있어요.',
  },
];

export const findMedication = (name) => {
  const targetName = typeof name === 'object' && name !== null ? (name.name || '') : String(name || '');
  return MEDICATIONS.find((med) => med.name === targetName);
};

/** 이름 일부 검색 (기획서: '다이' → 다이아벡스정 등) */
export const searchMedications = (query) => {
  const keyword = String(query ?? '').trim().toLowerCase();
  if (!keyword) return [];
  return MEDICATIONS.filter(
    (med) =>
      med.name.toLowerCase().includes(keyword) ||
      med.ingredients.some((ingredient) => ingredient.toLowerCase().includes(keyword)),
  );
};

/** 여러 약물에서 겹치는 성분 찾기 */
export const findDuplicateIngredients = (names = []) => {
  const count = new Map();
  (Array.isArray(names) ? names : []).forEach((item) => {
    const name = typeof item === 'object' && item !== null ? (item.name || '') : String(item || '');
    if (!name) return;
    const med = findMedication(name);
    (med?.ingredients ?? []).forEach((ingredient) => {
      if (!count.has(ingredient)) count.set(ingredient, []);
      count.get(ingredient).push(name);
    });
  });
  return [...count.entries()]
    .filter(([, meds]) => meds.length > 1)
    .map(([ingredient, meds]) => ({ ingredient, meds: [...new Set(meds)] }));
};
