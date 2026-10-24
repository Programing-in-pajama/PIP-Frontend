// 산책 지역 목록 — 지도는 실제 좌표 대신 디자인 시안과 같은 일러스트 지도를 사용합니다.
export const REGIONS = [
  {
    id: 'yeokgok',
    name: '경기 부천시 원미구 역곡동',
    short: '역곡동',
    distanceKm: 1.4,
    center: { lat: 37.4851, lng: 126.8117 },
    polygon: '118,205 292,118 342,250 176,330',
  },
  {
    id: 'yeokgok1',
    name: '경기 부천시 원미구 역곡1동',
    short: '역곡1동',
    distanceKm: 1.4,
    center: { lat: 37.4826, lng: 126.8078 },
    polygon: '96,236 304,152 334,286 138,354',
  },
  {
    id: 'yeokgok2',
    name: '경기 부천시 원미구 역곡2동',
    short: '역곡2동',
    distanceKm: 0.435,
    center: { lat: 37.4792, lng: 126.8152 },
    polygon: '140,250 268,206 306,312 174,368',
  },
  {
    id: 'sangdong',
    name: '경기 부천시 원미구 상동',
    short: '상동',
    distanceKm: 2.1,
    center: { lat: 37.5057, lng: 126.7520 },
    polygon: '108,218 322,160 338,300 132,338',
  },
  {
    id: 'jungdong',
    name: '경기 부천시 소사구 중동',
    short: '중동',
    distanceKm: 2.6,
    center: { lat: 37.4870, lng: 126.7830 },
    polygon: '126,232 300,170 328,300 150,350',
  },
  {
    id: 'songnae',
    name: '경기 부천시 소사구 송내동',
    short: '송내동',
    distanceKm: 3.2,
    center: { lat: 37.4800, lng: 126.7550 },
    polygon: '112,248 286,188 318,310 142,360',
  },
];

export const DEFAULT_REGION = REGIONS[0];

export const WALK_MINUTES = [10, 25, 60];

/*
 * 코스 템플릿: 선택한 지역과 시간에 맞춰 3개의 코스를 만들어 줍니다.
 * path 는 지도 일러스트(SVG, 390x620) 위에 그리는 좌표입니다.
 */
const ROUTE_TEMPLATES = {
  10: [
    {
      title: '역곡천 산책 코스',
      durationMin: 10,
      distanceKm: 0.8,
      hasRestaurant: true,
      roadType: '평탄한 보행로 · 휴식 지점 2곳',
      waypoints: '역곡역 → 역곡천 → 동네 골목 → 역곡역',
      path: [
        [82, 512],
        [126, 462],
        [176, 478],
        [214, 406],
        [268, 362],
      ],
    },
    {
      title: '푸른수목원 순환 코스',
      durationMin: 12,
      distanceKm: 1.1,
      hasRestaurant: false,
      roadType: '평탄한 보행로 · 휴식 지점 1곳',
      waypoints: '수목원 입구 → 저수지 데크 → 잔디광장',
      path: [
        [104, 540],
        [156, 486],
        [204, 500],
        [246, 432],
        [300, 402],
      ],
    },
    {
      title: '가톨릭대 둘레길',
      durationMin: 9,
      distanceKm: 0.6,
      hasRestaurant: true,
      roadType: '경사진 보행로 · 휴식 지점 1곳',
      waypoints: '정문 → 성심관 → 숲길 산책로',
      path: [
        [74, 486],
        [118, 430],
        [162, 442],
        [196, 380],
        [236, 340],
      ],
    },
  ],
  25: [
    {
      title: '역곡천 산책 코스',
      durationMin: 25,
      distanceKm: 1.8,
      hasRestaurant: true,
      roadType: '평탄한 보행로 · 휴식 지점 2곳',
      waypoints: '역곡역 → 역곡천 → 식당 → 역곡역',
      path: [
        [78, 566],
        [122, 468],
        [172, 486],
        [208, 324],
        [282, 118],
      ],
    },
    {
      title: '푸른수목원 순환 코스',
      durationMin: 28,
      distanceKm: 2.1,
      hasRestaurant: true,
      roadType: '평탄한 보행로 · 휴식 지점 1곳',
      waypoints: '수목원 입구 → 저수지 데크 → 온실 → 잔디광장',
      path: [
        [102, 560],
        [164, 470],
        [212, 492],
        [246, 356],
        [316, 192],
      ],
    },
    {
      title: '가톨릭대 둘레길',
      durationMin: 23,
      distanceKm: 1.6,
      hasRestaurant: true,
      roadType: '경사진 보행로 · 휴식 지점 2곳',
      waypoints: '정문 → 성심관 → 숲길 산책로 → 후문',
      path: [
        [94, 580],
        [138, 500],
        [202, 520],
        [238, 392],
        [302, 236],
      ],
    },
  ],
  60: [
    {
      title: '원미산 진달래동산 둘레길',
      durationMin: 58,
      distanceKm: 3.5,
      hasRestaurant: true,
      roadType: '완만한 흙길 · 휴식 지점 3곳',
      waypoints: '운동장역 → 원미산 입구 → 진달래동산 → 정자쉼터',
      path: [
        [62, 588],
        [112, 500],
        [164, 520],
        [204, 392],
        [258, 408],
        [314, 214],
        [334, 118],
      ],
    },
    {
      title: '부천 둘레길 1코스',
      durationMin: 62,
      distanceKm: 3.8,
      hasRestaurant: false,
      roadType: '숲길 · 경사 구간 있음',
      waypoints: '선사유적공원 → 작동산 능선 → 전망 쉼터',
      path: [
        [76, 574],
        [128, 466],
        [180, 488],
        [224, 352],
        [278, 374],
        [322, 198],
      ],
    },
    {
      title: '상동호수공원 수변 코스',
      durationMin: 57,
      distanceKm: 3.2,
      hasRestaurant: true,
      roadType: '수변 데크 · 휴식 지점 4곳',
      waypoints: '호수공원 입구 → 수변 데크 → 분수대 → 잔디마당',
      path: [
        [96, 590],
        [150, 508],
        [204, 528],
        [236, 420],
        [292, 438],
        [330, 268],
      ],
    },
  ],
};

const RESTAURANTS = [
  { name: '소담 보리밥 (안심식당)', menu: '산채 나물 보리밥 정식', grade: 'green' },
  { name: '수목원 웰빙 쌈밥', menu: '우렁 된장 쌈밥', grade: 'green' },
  { name: '대학가 건강 비빔밥', menu: '돌솥 야채 비빔밥', grade: 'yellow' },
];

const DEFAULT_CENTER = { lat: 37.4851, lng: 126.8117 };

/**
 * 일러스트 지도 좌표(390x620)를 실제 위·경도로 변환합니다.
 * 카카오맵으로 전환해도 같은 코스 모양이 유지됩니다.
 */
export function normalizedToLatLng(region, point, scale = 0.00003) {
  const center = region?.center || DEFAULT_CENTER;
  const [x, y] = point;
  return {
    lat: center.lat + (310 - y) * scale,
    lng: center.lng + (x - 195) * scale,
  };
}

/** 지역 선택 영역(폴리곤)을 카카오맵 좌표로 변환 */
export function getRegionGeoPolygon(region) {
  if (!region?.polygon) return [];
  const numbers = region.polygon.split(/[\s,]+/).map(Number).filter((value) => !Number.isNaN(value));
  const points = [];
  for (let index = 0; index < numbers.length - 1; index += 2) {
    points.push(normalizedToLatLng(region, [numbers[index], numbers[index + 1]], 0.00004));
  }
  return points;
}

export function getRoutes(region, minutes) {
  const templates = ROUTE_TEMPLATES[minutes] ?? ROUTE_TEMPLATES[25];
  return templates.map((template, index) => {
    const restaurant = template.hasRestaurant ? RESTAURANTS[index % RESTAURANTS.length] : null;
    const geoPath = template.path.map((point) => normalizedToLatLng(region, point));
    const restaurantPoint = geoPath[Math.min(2, geoPath.length - 1)];
    return {
      ...template,
      id: `${region.id}-${minutes}-${index}`,
      regionId: region.id,
      regionName: region.short,
      title: template.title.replace('역곡천', region.short === '역곡동' ? '역곡천' : `${region.short}천`),
      region: region.name,
      geoPath,
      startPoint: {
        name: `${region.short} 시작 지점`,
        lat: geoPath[0]?.lat,
        lng: geoPath[0]?.lng,
      },
      destPoint: {
        name: `${region.short} 도착 지점`,
        lat: geoPath[geoPath.length - 1]?.lat,
        lng: geoPath[geoPath.length - 1]?.lng,
      },
      restaurant: restaurant
        ? {
            ...restaurant,
            gradeLabel: restaurant.grade === 'green' ? '초록 안심 (저염·저당)' : '노랑 주의 (나트륨 조절)',
            lat: restaurantPoint?.lat,
            lng: restaurantPoint?.lng,
          }
        : null,
      savedAt: null,
    };
  });
}
