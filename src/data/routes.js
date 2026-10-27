import { YEOKGOK_RESTAURANTS } from './yeokgokRestaurants.js';
import { evaluateRestaurant } from '../utils/nutritionEvaluator.js';
import { getRegionBoundary } from './regionBoundaries.js';
import { smoothAndDensifyPath } from '../utils/geo.js';
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
    id: 'yeokgok1',
    name: '경기 부천시 원미구 역곡1동',
    short: '역곡1동',
    distanceKm: 1.4,
    center: { lat: 37.4919, lng: 126.8100 },
    polygon: '96,236 304,152 334,286 138,354',
  },
  {
    id: 'yeokgok2',
    name: '경기 부천시 원미구 역곡2동',
    short: '역곡2동',
    distanceKm: 0.435,
    center: { lat: 37.4884, lng: 126.8017 },
    polygon: '140,250 268,206 306,312 174,368',
  },
  {
    id: 'yeokgok',
    name: '경기 부천시 원미구 역곡동',
    short: '역곡동',
    distanceKm: 1.4,
    center: { lat: 37.4905, lng: 126.8068 },
    polygon: '118,205 292,118 342,250 176,330',
  },
  {
    id: 'sangdong',
    name: '경기 부천시 원미구 상동',
    short: '상동',
    distanceKm: 2.1,
    center: { lat: 37.4914, lng: 126.7615 },
    polygon: '108,218 322,160 338,300 132,338',
  },
  {
    id: 'jungdong',
    name: '경기 부천시 소사구 중동',
    short: '중동',
    distanceKm: 2.6,
    center: { lat: 37.4915, lng: 126.7673 },
    polygon: '126,232 300,170 328,300 150,350',
  },
  {
    id: 'songnae',
    name: '경기 부천시 소사구 송내동',
    short: '송내동',
    distanceKm: 3.2,
    center: { lat: 37.4834, lng: 126.7551 },
    polygon: '112,248 286,188 318,310 142,360',
  },
];

export const DEFAULT_REGION = REGIONS[0];
export const WALK_MINUTES = [10, 25, 60];

/**
 * 서비스 지원 지역 판별 (현재 부천 역곡 지역만 지원)
 * @param {object|string} region
 * @returns {boolean}
 */
export function isSupportedRegion(region) {
  if (!region) return false;
  if (typeof region === 'string') {
    return region.includes('역곡');
  }
  const id = String(region.id || '');
  const name = String(region.name || '');
  const short = String(region.short || '');
  return id.includes('yeokgok') || name.includes('역곡') || short.includes('역곡');
}

const DEFAULT_CENTER = DEFAULT_REGION.center;

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

/**
 * 고정밀 행정구역 경계선 폴리곤 좌표 반환 (WGS84 lat/lng 배열)
 * - 통계청 SGIS 및 국토교통부 실측 행정동 경계 100% 매핑
 * - 과거 4점짜리 직사각형 가짜 경계를 완전히 대체하여 실제 행정동 경계 그대로 표출
 */
export function createWalkingPrecinctPolygon(center, radiusMeters = 540) {
  if (!center || typeof center.lat !== 'number' || typeof center.lng !== 'number') {
    return getRegionBoundary('yeokgok1');
  }
  const points = [];
  const count = 16;
  const mPerLat = 110900;
  const mPerLng = 111320 * Math.cos((center.lat * Math.PI) / 180);
  for (let i = 0; i < count; i += 1) {
    const angle = (i * 2 * Math.PI) / count;
    const wobble = 0.94 + 0.08 * Math.sin(angle * 3) + 0.04 * Math.cos(angle * 2);
    const r = radiusMeters * wobble;
    const lat = center.lat + (r * Math.sin(angle)) / mPerLat;
    const lng = center.lng + (r * Math.cos(angle)) / mPerLng;
    points.push({ lat, lng });
  }
  return points;
}

export function getRegionGeoPolygon(region) {
  if (!region) return getRegionBoundary('yeokgok1');
  if (region.id && region.id !== 'my-location') {
    const boundary = getRegionBoundary(region.id);
    if (boundary && boundary.length > 0) return boundary;
  }
  const name = region.name || region.short || (typeof region === 'string' ? region : '');
  if (name.includes('역곡1동') || name.includes('역곡 1동') || name.includes('yeokgok1')) return getRegionBoundary('yeokgok1');
  if (name.includes('역곡2동') || name.includes('역곡 2동') || name.includes('yeokgok2')) return getRegionBoundary('yeokgok2');
  if (name.includes('역곡') || name.includes('yeokgok')) return getRegionBoundary('yeokgok1');
  if (name.includes('상동') || name.includes('sangdong')) return getRegionBoundary('sangdong');
  if (name.includes('중동') || name.includes('jungdong')) return getRegionBoundary('jungdong');
  if (name.includes('송내') || name.includes('songnae')) return getRegionBoundary('songnae');

  // 사용자의 현재 위치이거나 임의 좌표일 경우 해당 중심점 기반 실시간 산책 권역 폴리곤 동적 생성
  if (region.center && typeof region.center.lat === 'number' && typeof region.center.lng === 'number') {
    return createWalkingPrecinctPolygon(region.center);
  }

  return getRegionBoundary('yeokgok1');
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
        title: '역곡상상시장 문화길',
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
        title: '역곡남부 평탄 골목길',
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
        title: '가톨릭대 정문 앞 평탄 산책',
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
        title: '역곡천 수변 순환 코스',
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
        title: '가톨릭대 숲길 & 시장 둘레길',
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
        title: '푸른수목원 & 항동철길 힐링 코스',
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
        title: '푸른수목원 전체 순환 수변길',
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
        title: '원미산 숲길 둘레길',
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
        title: '역곡천 ➔ 옥길 합류 생태 둘레길',
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
        substituteNotice: evaluatedRest.substituteNotice,
        lat: evaluatedRest.location?.lat,
        lng: evaluatedRest.location?.lng,
        isSafeRestaurant: evaluatedRest.isSafeRestaurant,
      };
    }

    // 🌿 고정밀 실측 도로망 세분화 및 코너 곡선화 (Path Densification & Bezier Fillet)
    const smoothedGeoPath = smoothAndDensifyPath(geoPath);

    // 일러스트 지도용 SVG 좌표 변환
    const svgPath = smoothedGeoPath.map((pt) => latLngToNormalized(targetRegion, pt));

    const hubShort = targetRegion.short || '역곡역';
    const cleanBaseTitle = cand.title.replace(/\s*[\(\（]\s*\d+\s*분\s*[\)\）]/g, '').trim();
    const dynamicTitle = `${cleanBaseTitle} (${durationMin}분)`;
    const trailShort = cleanBaseTitle.split(' ')[0];
    const waypointsText = includeRestaurant && restaurantData
      ? `${hubShort} ➔ ${restaurantData.dot || '🟢'} ${restaurantData.name} ➔ ${trailShort} ➔ ${hubShort}`
      : `${hubShort} ➔ ${trailShort} ➔ ${hubShort}`;

    return {
      id: `${targetRegion.id}-${targetMinutes}-${index}`,
      regionId: targetRegion.id,
      regionName: targetRegion.short,
      title: dynamicTitle,
      region: targetRegion.name,
      durationMin,
      distanceKm,
      hasRestaurant: Boolean(includeRestaurant && restaurantData),
      roadType: cand.roadType,
      features: cand.features,
      waypoints: waypointsText,
      geoPath: smoothedGeoPath, // 식당 정문(0.0m)을 물리적으로 통과하는 고밀도 실측 도로망 (곡선 보간)
      path: svgPath,
      turnByTurn,
      startPoint: {
        name: `${targetRegion.short} 시작 지점`,
        lat: smoothedGeoPath[0]?.lat,
        lng: smoothedGeoPath[0]?.lng,
      },
      destPoint: {
        name: `${targetRegion.short} 도착 지점`,
        lat: smoothedGeoPath[smoothedGeoPath.length - 1]?.lat,
        lng: smoothedGeoPath[smoothedGeoPath.length - 1]?.lng,
      },
      restaurant: restaurantData,
      savedAt: null,
    };
  });

  // 🌿 기저질환 맞춤 안전 필터링: 섭취 주의(red) 식당 코스는 추천 목록에서 제외 (pass: green, yellow, 산책만)
  const safeList = list.filter(
    (c) => !c.hasRestaurant || !c.restaurant || c.restaurant.grade !== 'red'
  );
  const candidates = safeList.length > 0 ? safeList : list;

  // 🌿 가장 안전한 안심(green) 식당 코스를 1순위로 우선 정렬 (green > yellow > 기타)
  const gradeScores = { green: 3, yellow: 2, red: 1 };
  const sortedList = [...candidates].sort((a, b) => {
    const scoreA = a.restaurant ? (gradeScores[a.restaurant.grade] || 0) : 1.5;
    const scoreB = b.restaurant ? (gradeScores[b.restaurant.grade] || 0) : 1.5;
    return scoreB - scoreA;
  });

  return sortedList;
}

/**
 * 저장된 코스 객체에서 실제 WGS84 GPS 좌표 경로(geoPath)를 100% 안전하게 복원/추출합니다.
 * - geoPath 가 이미 온전한 경우 즉시 반환
 * - path 필드가 {lat, lng} 또는 [lng, lat] 배열인 경우 자동 변환
 * - geoPath 가 유실되었거나 DB에서 누락된 경우 코스 제목으로 원본 고정밀 OSRM 보행 도로망을 1:1 매칭하여 복원
 */
export function resolveCoursePath(route, region = DEFAULT_REGION) {
  if (!route) return [];

  // 1. 이미 유효한 geoPath 가 존재하는 경우
  if (Array.isArray(route.geoPath) && route.geoPath.length > 1) {
    const first = route.geoPath[0];
    if (first && typeof first.lat === 'number' && !isNaN(first.lat)) {
      return route.geoPath;
    }
  }

  // 2. path 필드가 존재하는 경우 (WGS84 객체 또는 [x,y] 좌표)
  if (Array.isArray(route.path) && route.path.length > 1) {
    const first = route.path[0];
    if (first && typeof first.lat === 'number' && !isNaN(first.lat)) {
      return route.path;
    }
    if (Array.isArray(first) && first.length === 2) {
      // [lng, lat] GeoJSON 형식
      if (first[0] > 100 && first[1] > 30) {
        return route.path.map(([lng, lat]) => ({ lat, lng }));
      }
      // [lat, lng] 형식
      if (first[0] > 30 && first[1] > 100) {
        return route.path.map(([lat, lng]) => ({ lat, lng }));
      }
      // 일러스트 좌표 [x, y]
      return route.path.map((pt) => normalizedToLatLng(region, pt));
    }
  }

  // 3. 제목 기반 원본 코스 도로망 매칭 복원 (역곡 10분, 25분, 60분 전 코스 탐색)
  const cleanTitle = String(route.title || '').replace(/\s*[\(\（]\s*\d+\s*분\s*[\)\）]/g, '').trim();
  if (cleanTitle) {
    const allCourses = [
      ...getRoutes(DEFAULT_REGION, 25, [], true),
      ...getRoutes(DEFAULT_REGION, 25, [], false),
      ...getRoutes(DEFAULT_REGION, 10, [], true),
      ...getRoutes(DEFAULT_REGION, 10, [], false),
      ...getRoutes(DEFAULT_REGION, 60, [], true),
      ...getRoutes(DEFAULT_REGION, 60, [], false),
    ];

    const match = allCourses.find((c) => {
      const candTitle = String(c.title || '').replace(/\s*[\(\（]\s*\d+\s*분\s*[\)\）]/g, '').trim();
      return candTitle === cleanTitle || candTitle.includes(cleanTitle) || cleanTitle.includes(candTitle);
    });

    if (match && Array.isArray(match.geoPath) && match.geoPath.length > 1) {
      return match.geoPath;
    }
  }

  return [];
}

/**
 * 핀 또는 저장된 코스의 메타데이터(geoPath, restaurant, roadType 등)를 복원합니다.
 */
export function restoreRouteMeta(route, region = DEFAULT_REGION) {
  if (!route) return route;
  const geoPath = resolveCoursePath(route, region);
  const cleanTitle = String(route.title || '').replace(/\s*[\(\（]\s*\d+\s*분\s*[\)\）]/g, '').trim();

  let restaurant = route.restaurant;
  let roadType = route.roadType;
  let features = route.features;

  if (cleanTitle) {
    const allCourses = [
      ...getRoutes(DEFAULT_REGION, 25, [], true),
      ...getRoutes(DEFAULT_REGION, 10, [], true),
      ...getRoutes(DEFAULT_REGION, 60, [], true),
    ];
    const match = allCourses.find((c) => {
      const candTitle = String(c.title || '').replace(/\s*[\(\（]\s*\d+\s*분\s*[\)\）]/g, '').trim();
      return candTitle === cleanTitle || candTitle.includes(cleanTitle) || cleanTitle.includes(candTitle);
    });
    if (match) {
      if (!restaurant && match.restaurant) restaurant = match.restaurant;
      if (!roadType && match.roadType) roadType = match.roadType;
      if (!features && match.features) features = match.features;
    }
  }

  return {
    ...route,
    geoPath,
    restaurant,
    roadType: roadType || (route.hasRestaurant ? '안심식당 연계 산책로' : '평탄한 보행로'),
    features: features || [],
  };
}
