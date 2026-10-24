import { YEOKGOK_RESTAURANTS } from './yeokgokRestaurants';
import { evaluateRestaurant } from '../utils/nutritionEvaluator';
import {
  YEOKGOK_STATION,
  YEOKGOK_STREAM_TRAIL,
  CATHOLIC_UNIV_TRAIL,
  PUREUN_ARBORETUM_TRAIL,
  WONMISAN_TRAIL,
} from './yeokgokTrails';

// 산책 지역 목록
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

const DEFAULT_CENTER = { lat: 37.4851, lng: 126.8117 };

/**
 * 일러스트 지도 좌표(390x620)를 실제 위·경도로 변환
 */
export function normalizedToLatLng(region, point, scale = 0.00003) {
  const center = region?.center || DEFAULT_CENTER;
  const [x, y] = point;
  return {
    lat: center.lat + (310 - y) * scale,
    lng: center.lng + (x - 195) * scale,
  };
}

/**
 * 실제 위·경도(WGS84)를 일러스트 지도 좌표(390x620)로 역변환
 */
export function latLngToNormalized(region, { lat, lng }, scale = 0.00003) {
  const center = region?.center || DEFAULT_CENTER;
  const x = Math.round(195 + (lng - center.lng) / scale);
  const y = Math.round(310 - (lat - center.lat) / scale);
  return [Math.max(25, Math.min(365, x)), Math.max(25, Math.min(595, y))];
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

/**
 * 실시간 고정밀 맞춤형 산책 코스 생성기 (실제 WGS84 좌표열 + 안심식당 매핑)
 */
export function getRoutes(region = DEFAULT_REGION, minutes = 25, userDiseases = [], includeRestaurant = true) {
  const targetRegion = region || DEFAULT_REGION;
  const targetMinutes = Number(minutes) || 25;

  // 1. 전체 30개 실제 음식점 사용자 질환 기준 영양 평가 및 안심 신호등 정렬
  const evaluatedAll = YEOKGOK_RESTAURANTS.map((r) => evaluateRestaurant(r, userDiseases));
  const sortedRest = [...evaluatedAll].sort((a, b) => {
    const score = { green: 1, yellow: 2, red: 3 };
    if ((score[a.grade] || 2) !== (score[b.grade] || 2)) {
      return (score[a.grade] || 2) - (score[b.grade] || 2);
    }
    const rA = a.bestFood?.rMax ?? 1.0;
    const rB = b.bestFood?.rMax ?? 1.0;
    return rA - rB;
  });

  // 2. 시간에 맞는 트레일 후보 3개 매핑
  let trailCandidates = [];
  if (targetMinutes <= 15) {
    trailCandidates = [
      { trail: YEOKGOK_STREAM_TRAIL, title: '역곡천 수변 안심 산책길 (초급)', baseMin: 12, baseKm: 0.9, slice: 10 },
      { trail: CATHOLIC_UNIV_TRAIL, title: '역곡상상시장 & 문화거리 산책', baseMin: 10, baseKm: 0.8, slice: 8 },
      { trail: PUREUN_ARBORETUM_TRAIL, title: '항동철길 입구 숲바람길', baseMin: 14, baseKm: 1.1, slice: 8 },
    ];
  } else if (targetMinutes <= 35) {
    trailCandidates = [
      { trail: YEOKGOK_STREAM_TRAIL, title: '역곡천 수변 순환 코스', baseMin: 25, baseKm: 1.8, slice: 18 },
      { trail: CATHOLIC_UNIV_TRAIL, title: '가톨릭대 숲길 & 시장 둘레길', baseMin: 24, baseKm: 1.6, slice: 14 },
      { trail: PUREUN_ARBORETUM_TRAIL, title: '푸른수목원 & 항동철길 힐링 코스', baseMin: 27, baseKm: 2.1, slice: 16 },
    ];
  } else {
    trailCandidates = [
      { trail: PUREUN_ARBORETUM_TRAIL, title: '푸른수목원 전체 순환 수변길', baseMin: 55, baseKm: 3.5, slice: 16 },
      { trail: WONMISAN_TRAIL, title: '원미산 숲길 둘레길 (피톤치드)', baseMin: 58, baseKm: 3.8, slice: 14 },
      { trail: YEOKGOK_STREAM_TRAIL, title: '역곡천 ➔ 옥길 합류 생태 둘레길', baseMin: 52, baseKm: 3.3, slice: 18 },
    ];
  }

  const startHub = {
    lat: targetRegion.center?.lat || YEOKGOK_STATION.south.lat,
    lng: targetRegion.center?.lng || YEOKGOK_STATION.south.lng,
    name: `${targetRegion.short || '역곡역'} 시작 지점`,
  };

  const list = trailCandidates.map((cand, index) => {
    const trail = cand.trail;
    const evaluatedRest = includeRestaurant ? sortedRest[index % sortedRest.length] : null;

    let geoPath = [];
    let turnByTurn = [];
    let finalKm = cand.baseKm;
    let finalMin = cand.baseMin;

    if (includeRestaurant && evaluatedRest) {
      const restPos = {
        lat: evaluatedRest.location.lat,
        lng: evaluatedRest.location.lng,
      };

      // 출발지 ➔ 안심식당 ➔ 트레일 루프 ➔ 회귀
      const trailSlice = trail.loopCoordinates.slice(0, cand.slice);
      geoPath = [
        startHub,
        restPos,
        trail.entryPoint,
        ...trailSlice,
        startHub,
      ];

      turnByTurn = [
        `${targetRegion.short || '역곡역'}에서 출발하여 [${evaluatedRest.name}] 방면으로 이동`,
        `[${evaluatedRest.name}]에서 식사 후 [${trail.name}] 진입로 데크로 이동`,
        `계단 없는 완만한 수변 데크로드 및 쉼터 구간 통과`,
        `${targetRegion.short || '역곡역'} 방면으로 안전하게 회귀`,
      ];

      finalKm = Number((cand.baseKm + 0.3).toFixed(2));
      finalMin = cand.baseMin + 5;
    } else {
      const trailSlice = trail.loopCoordinates.slice(0, cand.slice);
      geoPath = [startHub, ...trailSlice, startHub];
      turnByTurn = [
        `${targetRegion.short || '역곡역'}에서 출발하여 [${trail.name}] 입구로 이동`,
        `완만한 평탄 산책로를 따라 쉼터 및 데크길 순환`,
        `${targetRegion.short || '역곡역'}으로 안전하게 완보 회귀`,
      ];
    }

    // 일러스트 지도용 SVG 좌표 변환
    const svgPath = geoPath.map((pt) => latLngToNormalized(targetRegion, pt));

    const restaurantData = evaluatedRest && includeRestaurant
      ? {
          id: evaluatedRest.id,
          name: evaluatedRest.name,
          category: evaluatedRest.category,
          address: evaluatedRest.location?.address,
          phone: evaluatedRest.phone,
          foods: evaluatedRest.foods,
          menu: evaluatedRest.bestFood?.name || evaluatedRest.foods[0]?.name || '대표 건강식',
          calories: evaluatedRest.bestFood?.calories || 450,
          sodium: evaluatedRest.bestFood?.sodium || 500,
          sugar: evaluatedRest.bestFood?.sugar || 3.0,
          grade: evaluatedRest.grade,
          nutritionGrade: evaluatedRest.grade,
          gradeLabel: evaluatedRest.bestFood?.label || evaluatedRest.badgeLabel,
          badgeLabel: evaluatedRest.badgeLabel || '안심식당',
          threshold: evaluatedRest.threshold,
          bestFood: evaluatedRest.bestFood,
          lat: evaluatedRest.location?.lat,
          lng: evaluatedRest.location?.lng,
          isSafeRestaurant: evaluatedRest.isSafeRestaurant,
        }
      : null;

    const waypointsText = includeRestaurant && restaurantData
      ? `${targetRegion.short || '역곡역'} ➔ 🟢 ${restaurantData.name} ➔ ${trail.name.split(' ')[0]} ➔ ${targetRegion.short || '역곡역'}`
      : `${targetRegion.short || '역곡역'} ➔ ${trail.name} ➔ ${targetRegion.short || '역곡역'}`;

    return {
      id: `${targetRegion.id}-${targetMinutes}-${index}`,
      regionId: targetRegion.id,
      regionName: targetRegion.short,
      title: cand.title,
      region: targetRegion.name,
      durationMin: finalMin,
      distanceKm: finalKm,
      hasRestaurant: Boolean(includeRestaurant && restaurantData),
      roadType: trail.roadType,
      features: trail.features,
      waypoints: waypointsText,
      geoPath,
      path: svgPath,
      turnByTurn,
      startPoint: {
        name: `${targetRegion.short} 시작 지점`,
        lat: geoPath[0]?.lat,
        lng: geoPath[0]?.lng,
      },
      destPoint: {
        name: `${targetRegion.short} 도착 지점`,
        lat: geoPath[geoPath.length - 1]?.lat,
        lng: geoPath[geoPath.length - 1]?.lng,
      },
      restaurant: restaurantData,
      savedAt: null,
    };
  });

  return list.sort((a, b) => {
    if (!a.restaurant && !b.restaurant) return 0;
    if (!a.restaurant) return 1;
    if (!b.restaurant) return -1;
    const order = { green: 0, yellow: 1, red: 2 };
    return (order[a.restaurant.grade] ?? 3) - (order[b.restaurant.grade] ?? 3);
  });
}
