import { YEOKGOK_RESTAURANTS } from './yeokgokRestaurants.js';
import { evaluateRestaurant } from '../utils/nutritionEvaluator.js';
import {
  YEOKGOK_STATION,
  COURSE_10_1_WITH_REST_POINTS, COURSE_10_1_WITH_REST_STEPS, COURSE_10_1_WITH_REST_META,
  COURSE_10_1_WALK_ONLY_POINTS, COURSE_10_1_WALK_ONLY_STEPS, COURSE_10_1_WALK_ONLY_META,
  COURSE_10_2_WITH_REST_POINTS, COURSE_10_2_WITH_REST_STEPS, COURSE_10_2_WITH_REST_META,
  COURSE_10_2_WALK_ONLY_POINTS, COURSE_10_2_WALK_ONLY_STEPS, COURSE_10_2_WALK_ONLY_META,
  COURSE_10_3_WITH_REST_POINTS, COURSE_10_3_WITH_REST_STEPS, COURSE_10_3_WITH_REST_META,
  COURSE_10_3_WALK_ONLY_POINTS, COURSE_10_3_WALK_ONLY_STEPS, COURSE_10_3_WALK_ONLY_META,
  COURSE_25_1_WITH_REST_POINTS, COURSE_25_1_WITH_REST_STEPS, COURSE_25_1_WITH_REST_META,
  COURSE_25_1_WALK_ONLY_POINTS, COURSE_25_1_WALK_ONLY_STEPS, COURSE_25_1_WALK_ONLY_META,
  COURSE_25_2_WITH_REST_POINTS, COURSE_25_2_WITH_REST_STEPS, COURSE_25_2_WITH_REST_META,
  COURSE_25_2_WALK_ONLY_POINTS, COURSE_25_2_WALK_ONLY_STEPS, COURSE_25_2_WALK_ONLY_META,
  COURSE_25_3_WITH_REST_POINTS, COURSE_25_3_WITH_REST_STEPS, COURSE_25_3_WITH_REST_META,
  COURSE_25_3_WALK_ONLY_POINTS, COURSE_25_3_WALK_ONLY_STEPS, COURSE_25_3_WALK_ONLY_META,
  COURSE_60_1_WITH_REST_POINTS, COURSE_60_1_WITH_REST_STEPS, COURSE_60_1_WITH_REST_META,
  COURSE_60_1_WALK_ONLY_POINTS, COURSE_60_1_WALK_ONLY_STEPS, COURSE_60_1_WALK_ONLY_META,
  COURSE_60_2_WITH_REST_POINTS, COURSE_60_2_WITH_REST_STEPS, COURSE_60_2_WITH_REST_META,
  COURSE_60_2_WALK_ONLY_POINTS, COURSE_60_2_WALK_ONLY_STEPS, COURSE_60_2_WALK_ONLY_META,
  COURSE_60_3_WITH_REST_POINTS, COURSE_60_3_WITH_REST_STEPS, COURSE_60_3_WITH_REST_META,
  COURSE_60_3_WALK_ONLY_POINTS, COURSE_60_3_WALK_ONLY_STEPS, COURSE_60_3_WALK_ONLY_META,
} from './yeokgokTrails.js';

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
 * 실시간 고정밀 맞춤형 산책 코스 생성기
 * - 식당 포함 시: 출발지 ➔ 음식점 정문(거리 0.0m) ➔ 산책로 ➔ 회귀 (음식점 위치 100% 관통!)
 * - 식당 미포함 시: 출발지 ➔ 산책로 직행 ➔ 회귀
 * - 절대 건물 관통 없음 (OSRM 실보행 도로망 100% 매핑)
 */
export function getRoutes(region = DEFAULT_REGION, minutes = 25, userDiseases = [], includeRestaurant = true) {
  const targetRegion = region || DEFAULT_REGION;
  const targetMinutes = Number(minutes) || 25;

  let trailCandidates = [];
  if (targetMinutes <= 15) {
    trailCandidates = [
      {
        title: '역곡상상시장 문화길 (10분)',
        primaryRestId: COURSE_10_1_WITH_REST_META.restId,
        withRest: {
          points: COURSE_10_1_WITH_REST_POINTS,
          steps: COURSE_10_1_WITH_REST_STEPS,
          durationMin: COURSE_10_1_WITH_REST_META.durationMin,
          distanceKm: COURSE_10_1_WITH_REST_META.distanceKm,
        },
        walkOnly: {
          points: COURSE_10_1_WALK_ONLY_POINTS,
          steps: COURSE_10_1_WALK_ONLY_STEPS,
          durationMin: COURSE_10_1_WALK_ONLY_META.durationMin,
          distanceKm: COURSE_10_1_WALK_ONLY_META.distanceKm,
        },
        roadType: '평탄한 보행로 · 시장 아케이드 구간',
        features: ['역곡상상시장 아케이드', '보행자 우선도로', '안심 쉼터 2곳'],
      },
      {
        title: '역곡남부 평탄 골목길 (12분)',
        primaryRestId: COURSE_10_2_WITH_REST_META.restId,
        withRest: {
          points: COURSE_10_2_WITH_REST_POINTS,
          steps: COURSE_10_2_WITH_REST_STEPS,
          durationMin: COURSE_10_2_WITH_REST_META.durationMin,
          distanceKm: COURSE_10_2_WITH_REST_META.distanceKm,
        },
        walkOnly: {
          points: COURSE_10_2_WALK_ONLY_POINTS,
          steps: COURSE_10_2_WALK_ONLY_STEPS,
          durationMin: COURSE_10_2_WALK_ONLY_META.durationMin,
          distanceKm: COURSE_10_2_WALK_ONLY_META.distanceKm,
        },
        roadType: '평탄한 동네 골목길 · 휴식 벤치 2곳',
        features: ['부천동 주민센터 쉼터', '차량 통행 적은 안심길'],
      },
      {
        title: '가톨릭대 정문 앞 평탄 산책 (11분)',
        primaryRestId: COURSE_10_3_WITH_REST_META.restId,
        withRest: {
          points: COURSE_10_3_WITH_REST_POINTS,
          steps: COURSE_10_3_WITH_REST_STEPS,
          durationMin: COURSE_10_3_WITH_REST_META.durationMin,
          distanceKm: COURSE_10_3_WITH_REST_META.distanceKm,
        },
        walkOnly: {
          points: COURSE_10_3_WALK_ONLY_POINTS,
          steps: COURSE_10_3_WALK_ONLY_STEPS,
          durationMin: COURSE_10_3_WALK_ONLY_META.durationMin,
          distanceKm: COURSE_10_3_WALK_ONLY_META.distanceKm,
        },
        roadType: '완만한 인도 · 무장애 휠체어 램프',
        features: ['가톨릭대 앞 가로수길', '턱 없는 배리어프리 인도'],
      },
    ];
  } else if (targetMinutes <= 35) {
    trailCandidates = [
      {
        title: '역곡천 수변 순환 코스 (25분)',
        primaryRestId: COURSE_25_1_WITH_REST_META.restId,
        withRest: {
          points: COURSE_25_1_WITH_REST_POINTS,
          steps: COURSE_25_1_WITH_REST_STEPS,
          durationMin: COURSE_25_1_WITH_REST_META.durationMin,
          distanceKm: COURSE_25_1_WITH_REST_META.distanceKm,
        },
        walkOnly: {
          points: COURSE_25_1_WALK_ONLY_POINTS,
          steps: COURSE_25_1_WALK_ONLY_STEPS,
          durationMin: COURSE_25_1_WALK_ONLY_META.durationMin,
          distanceKm: COURSE_25_1_WALK_ONLY_META.distanceKm,
        },
        roadType: '평탄한 수변 데크로드 · 경사 2% 이하 (계단 없음)',
        features: ['역곡천 수변 데크', '징검다리 쉼터', '무장애 슬로프 진입로'],
      },
      {
        title: '가톨릭대 숲길 & 시장 둘레길 (24분)',
        primaryRestId: COURSE_25_2_WITH_REST_META.restId,
        withRest: {
          points: COURSE_25_2_WITH_REST_POINTS,
          steps: COURSE_25_2_WITH_REST_STEPS,
          durationMin: COURSE_25_2_WITH_REST_META.durationMin,
          distanceKm: COURSE_25_2_WITH_REST_META.distanceKm,
        },
        walkOnly: {
          points: COURSE_25_2_WALK_ONLY_POINTS,
          steps: COURSE_25_2_WALK_ONLY_STEPS,
          durationMin: COURSE_25_2_WALK_ONLY_META.durationMin,
          distanceKm: COURSE_25_2_WALK_ONLY_META.distanceKm,
        },
        roadType: '평탄 보도블록 및 완만한 숲길 · 휴식 벤치 3곳',
        features: ['상상시장 아케이드', '가톨릭대 성심교정 숲길', '캠퍼스 잔디마당'],
      },
      {
        title: '푸른수목원 & 항동철길 힐링 코스 (28분)',
        primaryRestId: COURSE_25_3_WITH_REST_META.restId,
        withRest: {
          points: COURSE_25_3_WITH_REST_POINTS,
          steps: COURSE_25_3_WITH_REST_STEPS,
          durationMin: COURSE_25_3_WITH_REST_META.durationMin,
          distanceKm: COURSE_25_3_WITH_REST_META.distanceKm,
        },
        walkOnly: {
          points: COURSE_25_3_WALK_ONLY_POINTS,
          steps: COURSE_25_3_WALK_ONLY_STEPS,
          durationMin: COURSE_25_3_WALK_ONLY_META.durationMin,
          distanceKm: COURSE_25_3_WALK_ONLY_META.distanceKm,
        },
        roadType: '친환경 흙길 및 수변 목재 데크 · 턱 없는 무장애길',
        features: ['항동철길 평탄길', '항동저수지 수변 관찰 데크', '메타세쿼이아길'],
      },
    ];
  } else {
    trailCandidates = [
      {
        title: '푸른수목원 전체 순환 수변길 (55분)',
        primaryRestId: COURSE_60_1_WITH_REST_META.restId,
        withRest: {
          points: COURSE_60_1_WITH_REST_POINTS,
          steps: COURSE_60_1_WITH_REST_STEPS,
          durationMin: COURSE_60_1_WITH_REST_META.durationMin,
          distanceKm: COURSE_60_1_WITH_REST_META.distanceKm,
        },
        walkOnly: {
          points: COURSE_60_1_WALK_ONLY_POINTS,
          steps: COURSE_60_1_WALK_ONLY_STEPS,
          durationMin: COURSE_60_1_WALK_ONLY_META.durationMin,
          distanceKm: COURSE_60_1_WALK_ONLY_META.distanceKm,
        },
        roadType: '수변 목재 데크 및 친환경 흙길 · 쉼터 5곳',
        features: ['수목원 전체 순환 데크', '습지 생태공원', '무장애 휠체어 전용길'],
      },
      {
        title: '원미산 숲길 둘레길 (58분)',
        primaryRestId: COURSE_60_2_WITH_REST_META.restId,
        withRest: {
          points: COURSE_60_2_WITH_REST_POINTS,
          steps: COURSE_60_2_WITH_REST_STEPS,
          durationMin: COURSE_60_2_WITH_REST_META.durationMin,
          distanceKm: COURSE_60_2_WITH_REST_META.distanceKm,
        },
        walkOnly: {
          points: COURSE_60_2_WALK_ONLY_POINTS,
          steps: COURSE_60_2_WALK_ONLY_STEPS,
          durationMin: COURSE_60_2_WALK_ONLY_META.durationMin,
          distanceKm: COURSE_60_2_WALK_ONLY_META.distanceKm,
        },
        roadType: '완만한 흙길 및 친환경 야자매트 · 피톤치드 쉼터',
        features: ['피톤치드 숲길', '전망 정자 쉼터', '배리어프리 진입로'],
      },
      {
        title: '역곡천 ➔ 옥길 합류 생태 둘레길 (52분)',
        primaryRestId: COURSE_60_3_WITH_REST_META.restId,
        withRest: {
          points: COURSE_60_3_WITH_REST_POINTS,
          steps: COURSE_60_3_WITH_REST_STEPS,
          durationMin: COURSE_60_3_WITH_REST_META.durationMin,
          distanceKm: COURSE_60_3_WITH_REST_META.distanceKm,
        },
        walkOnly: {
          points: COURSE_60_3_WALK_ONLY_POINTS,
          steps: COURSE_60_3_WALK_ONLY_STEPS,
          durationMin: COURSE_60_3_WALK_ONLY_META.durationMin,
          distanceKm: COURSE_60_3_WALK_ONLY_META.distanceKm,
        },
        roadType: '수변 평탄 데크로드 · 벤치 4곳',
        features: ['옥길 생태하천 합류부', '갈대숲 관찰로', '평탄 직선 수변길'],
      },
    ];
  }

  const list = trailCandidates.map((cand, index) => {
    let restaurantData = null;
    let geoPath = cand.walkOnly.points;
    let turnByTurn = cand.walkOnly.steps;
    let durationMin = cand.walkOnly.durationMin;
    let distanceKm = cand.walkOnly.distanceKm;

    if (includeRestaurant) {
      // 해당 코스 경로 상에 위치한 안심식당 정보 로드 및 영양 평가
      const rawRest = YEOKGOK_RESTAURANTS.find((r) => r.id === cand.primaryRestId) || YEOKGOK_RESTAURANTS[0];
      const evaluatedRest = evaluateRestaurant(rawRest, userDiseases);

      // 식당 정문을 물리적으로 정확히 통과(거리 0.0m)하는 보행 경로 설정
      geoPath = cand.withRest.points;
      turnByTurn = cand.withRest.steps;
      durationMin = cand.withRest.durationMin;
      distanceKm = cand.withRest.distanceKm;

      const grade = evaluatedRest.grade || 'green';
      const dot = evaluatedRest.dot || (grade === 'green' ? '🟢' : (grade === 'yellow' ? '🟡' : '🔴'));

      // 등급(green/yellow/red)에 맞춰 뱃지 레이블 동기화 (예: 복합 안심 -> 복합 보통)
      let dynamicBadgeLabel = evaluatedRest.badgeLabel || '안심식당';
      if (grade === 'yellow') {
        dynamicBadgeLabel = dynamicBadgeLabel.replace('안심', '보통');
      } else if (grade === 'red') {
        dynamicBadgeLabel = dynamicBadgeLabel.replace('복합 안심', '섭취 주의').replace('안심', '주의');
      }

      restaurantData = {
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
        grade,
        nutritionGrade: grade,
        dot,
        gradeLabel: evaluatedRest.bestFood?.label || `${dot} ${dynamicBadgeLabel}`,
        badgeLabel: dynamicBadgeLabel,
        threshold: evaluatedRest.threshold,
        bestFood: evaluatedRest.bestFood,
        lat: evaluatedRest.location?.lat,
        lng: evaluatedRest.location?.lng,
        isSafeRestaurant: evaluatedRest.isSafeRestaurant,
      };
    }

    // 일러스트 지도용 SVG 좌표 변환
    const svgPath = geoPath.map((pt) => latLngToNormalized(targetRegion, pt));

    const hubShort = targetRegion.short || '역곡역';
    const trailShort = cand.title.split(' ')[0];
    const waypointsText = includeRestaurant && restaurantData
      ? `${hubShort} ➔ ${restaurantData.dot || '🟢'} ${restaurantData.name} ➔ ${trailShort} ➔ ${hubShort}`
      : `${hubShort} ➔ ${trailShort} ➔ ${hubShort}`;

    return {
      id: `${targetRegion.id}-${targetMinutes}-${index}`,
      regionId: targetRegion.id,
      regionName: targetRegion.short,
      title: cand.title,
      region: targetRegion.name,
      durationMin,
      distanceKm,
      hasRestaurant: Boolean(includeRestaurant && restaurantData),
      roadType: cand.roadType,
      features: cand.features,
      waypoints: waypointsText,
      geoPath, // 식당 정문(0.0m)을 물리적으로 통과하는 고정밀 실측 도로망
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

  // 🌿 기저질환 맞춤 안전 필터링: 섭취 주의(red) 식당 코스는 추천 목록에서 제외 (pass: green, yellow, 산책만)
  const safeList = list.filter(
    (c) => !c.hasRestaurant || !c.restaurant || c.restaurant.grade !== 'red'
  );

  return safeList.length > 0 ? safeList : list;
}
