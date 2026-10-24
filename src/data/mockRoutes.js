// 🌿 소요(SOYO) 맞춤형 산책 코스 데이터
// 기획서 기준: 10분 / 25분 / 60분, 식당 포함 여부(Yes/No), 3색 영양 신호등 연계

export const MOCK_ROUTES = [
  {
    id: 'route-bucheon-10m-rest',
    title: '부천 중앙공원 잔디마당 웰니스 산책',
    region: '경기 부천시',
    durationMin: 12,
    distanceKm: 0.8,
    difficulty: '초급(완만)',
    barrierFree: true,
    hasRestaurant: true,
    description: '경사로가 없고 보도블록이 완만한 10분 가벼운 식후 산책 코스입니다.',
    restaurant: {
      name: '소담 보리밥 (안심식당)',
      category: '한식 / 쌈밥',
      nutritionGrade: 'green', // green: 안심, yellow: 주의, red: 유의
      gradeLabel: '초록 안심 (저염·저당 식단)',
      calorie: 420,
      sodiumMg: 580,
      sugarG: 4.5,
      menu: '산채 나물 보리밥 정식',
      lat: 37.5022,
      lng: 126.7645
    },
    startPoint: { name: '중앙공원 북문 입구', lat: 37.5035, lng: 126.7630 },
    destPoint: { name: '중앙공원 시계탑 쉼터', lat: 37.5008, lng: 126.7662 },
    path: [
      { lat: 37.5035, lng: 126.7630 },
      { lat: 37.5028, lng: 126.7638 },
      { lat: 37.5022, lng: 126.7645 }, // 식당 경유
      { lat: 37.5015, lng: 126.7654 },
      { lat: 37.5008, lng: 126.7662 }
    ]
  },
  {
    id: 'route-bucheon-10m-nowalk',
    title: '도당수목원 무장애 데크로드 10분길',
    region: '경기 부천시',
    durationMin: 10,
    distanceKm: 0.6,
    difficulty: '초급(완만)',
    barrierFree: true,
    hasRestaurant: false,
    description: '휠체어와 보행보조기로도 걷기 편한 피톤치드 쉼터 코스입니다.',
    restaurant: null,
    startPoint: { name: '도당수목원 입구', lat: 37.5188, lng: 126.7865 },
    destPoint: { name: '피톤치드 쉼터', lat: 37.5195, lng: 126.7910 },
    path: [
      { lat: 37.5188, lng: 126.7865 },
      { lat: 37.5190, lng: 126.7880 },
      { lat: 37.5193, lng: 126.7895 },
      { lat: 37.5195, lng: 126.7910 }
    ]
  },
  {
    id: 'route-bucheon-25m-rest',
    title: '상동호수공원 수변 데크 & 웰빙식 코스',
    region: '경기 부천시',
    durationMin: 25,
    distanceKm: 1.6,
    difficulty: '초급(완만)',
    barrierFree: true,
    hasRestaurant: true,
    description: '잔잔한 호수를 바라보며 가볍게 걸을 수 있는 25분 수변 산책로입니다.',
    restaurant: {
      name: '호수마을 연잎 두부마을',
      category: '두부 요리 / 한식',
      nutritionGrade: 'green',
      gradeLabel: '초록 안심 (고단백·당뇨 안심)',
      calorie: 480,
      sodiumMg: 620,
      sugarG: 3.2,
      menu: '순두부 들깨탕 정식',
      lat: 37.5085, lng: 126.7510
    },
    startPoint: { name: '상동호수공원 주차장', lat: 37.5065, lng: 126.7490 },
    destPoint: { name: '호수공원 분수대 전망대', lat: 37.5110, lng: 126.7535 },
    path: [
      { lat: 37.5065, lng: 126.7490 },
      { lat: 37.5073, lng: 126.7500 },
      { lat: 37.5085, lng: 126.7510 }, // 식당
      { lat: 37.5098, lng: 126.7522 },
      { lat: 37.5110, lng: 126.7535 }
    ]
  },
  {
    id: 'route-bucheon-25m-nowalk',
    title: '심곡천 생태하천 물길 산책로',
    region: '경기 부천시',
    durationMin: 26,
    distanceKm: 1.8,
    difficulty: '중급',
    barrierFree: true,
    hasRestaurant: false,
    description: '도심 속 흐르는 맑은 물소리를 들으며 활력을 채우는 25분 산책 코스입니다.',
    restaurant: null,
    startPoint: { name: '심곡천 원미교', lat: 37.4895, lng: 126.7820 },
    destPoint: { name: '심곡천 만남의광장', lat: 37.4860, lng: 126.7725 },
    path: [
      { lat: 37.4895, lng: 126.7820 },
      { lat: 37.4882, lng: 126.7790 },
      { lat: 37.4870, lng: 126.7760 },
      { lat: 37.4860, lng: 126.7725 }
    ]
  },
  {
    id: 'route-bucheon-60m-rest',
    title: '원미산 진달래동산 힐링 둘레길 1시간 완주',
    region: '경기 부천시',
    durationMin: 58,
    distanceKm: 3.5,
    difficulty: '중급',
    barrierFree: false,
    hasRestaurant: true,
    description: '완만한 흙길을 걸으며 심폐 기능과 하체 근력을 증진하는 60분 웰니스 코스입니다.',
    restaurant: {
      name: '원미골 건강 오리백숙 (반상)',
      category: '보양 한식',
      nutritionGrade: 'yellow',
      gradeLabel: '노랑 주의 (나트륨 조절 권장)',
      calorie: 650,
      sodiumMg: 920,
      sugarG: 6.0,
      menu: '능이버섯 닭곰탕 맑은국',
      lat: 37.4980, lng: 126.7985
    },
    startPoint: { name: '부천종합운동장역 2번 출구', lat: 37.5050, lng: 126.7970 },
    destPoint: { name: '원미산 정상 정자쉼터', lat: 37.4930, lng: 126.8010 },
    path: [
      { lat: 37.5050, lng: 126.7970 },
      { lat: 37.5015, lng: 126.7978 },
      { lat: 37.4980, lng: 126.7985 }, // 식당
      { lat: 37.4955, lng: 126.7998 },
      { lat: 37.4930, lng: 126.8010 }
    ]
  },
  {
    id: 'route-bucheon-60m-nowalk',
    title: '부천 둘레길 1코스 향토유적숲길 완보',
    region: '경기 부천시',
    durationMin: 62,
    distanceKm: 3.8,
    difficulty: '중급',
    barrierFree: false,
    hasRestaurant: false,
    description: '고즈넉한 숲길과 도심 전망을 함께 즐길 수 있는 1시간 유산소 걷기 코스입니다.',
    restaurant: null,
    startPoint: { name: '고강선사유적공원', lat: 37.5340, lng: 126.8220 },
    destPoint: { name: '작동산 능선 쉼터', lat: 37.5210, lng: 126.8190 },
    path: [
      { lat: 37.5340, lng: 126.8220 },
      { lat: 37.5295, lng: 126.8210 },
      { lat: 37.5250, lng: 126.8200 },
      { lat: 37.5210, lng: 126.8190 }
    ]
  }
];
