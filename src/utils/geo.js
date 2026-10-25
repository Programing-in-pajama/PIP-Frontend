/**
 * 🌿 소요(SOYO) 고정밀 실시간 보행 내비게이션 지리 연산 엔진 (geo.js)
 * - Haversine 거리 계산 (미터 단위)
 * - 방위각(Heading / Bearing) 계산 (0 ~ 360도)
 * - 경로 선분 직교 투영(Snap-to-route) 및 실보행 진행률 연산
 * - Tmap 보행자 실측 단계별 회전 안내(Turn-by-Turn) 지점 동적 거리 계산
 */

const EARTH_RADIUS_METERS = 6371000;

/**
 * 두 위경도 좌표 사이의 대원 거리(미터) 계산 (Haversine Formula)
 */
export function getDistanceMeters(p1, p2) {
  if (!p1 || !p2 || p1.lat == null || p1.lng == null || p2.lat == null || p2.lng == null) {
    return 0;
  }
  const lat1 = (p1.lat * Math.PI) / 180;
  const lng1 = (p1.lng * Math.PI) / 180;
  const lat2 = (p2.lat * Math.PI) / 180;
  const lng2 = (p2.lng * Math.PI) / 180;

  const dLat = lat2 - lat1;
  const dLng = lng2 - lng1;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

/**
 * p1에서 p2로 이동할 때의 방위각(Bearing) 계산 (0° ~ 360°, 북쪽: 0, 동쪽: 90, 남쪽: 180, 서쪽: 270)
 */
export function getBearing(p1, p2) {
  if (!p1 || !p2) return 0;
  const lat1 = (p1.lat * Math.PI) / 180;
  const lng1 = (p1.lng * Math.PI) / 180;
  const lat2 = (p2.lat * Math.PI) / 180;
  const lng2 = (p2.lng * Math.PI) / 180;

  const y = Math.sin(lng2 - lng1) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(lng2 - lng1);

  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

/**
 * 경로의 각 세그먼트 길이 및 시작점으로부터의 누적 거리 배열 계산
 */
export function getCumulativeDistances(geoPath) {
  if (!Array.isArray(geoPath) || geoPath.length === 0) {
    return { segmentDistances: [], cumulativeDistances: [0], totalDistanceMeters: 0 };
  }

  const segmentDistances = [];
  const cumulativeDistances = [0];
  let total = 0;

  for (let i = 0; i < geoPath.length - 1; i += 1) {
    const d = getDistanceMeters(geoPath[i], geoPath[i + 1]);
    segmentDistances.push(d);
    total += d;
    cumulativeDistances.push(total);
  }

  return { segmentDistances, cumulativeDistances, totalDistanceMeters: total };
}

/**
 * 사용자의 GPS 좌표를 코스(geoPath) 선분에 투영(Snap-to-route)
 * - 사용자의 현재 위치에서 가장 가까운 경로 상의 지점 및 진행 거리/남은 거리 계산
 */
export function snapToPath(userPos, geoPath, cachedDistances = null) {
  if (!userPos || !Array.isArray(geoPath) || geoPath.length < 2) {
    return {
      snappedPoint: userPos,
      segmentIndex: 0,
      distanceFromPath: 0,
      pathDistanceMeters: 0,
      progress: 0,
      remainingMeters: 0,
      totalDistanceMeters: 0,
    };
  }

  const { segmentDistances, cumulativeDistances, totalDistanceMeters } =
    cachedDistances || getCumulativeDistances(geoPath);

  if (totalDistanceMeters <= 0) {
    return {
      snappedPoint: geoPath[0],
      segmentIndex: 0,
      distanceFromPath: 0,
      pathDistanceMeters: 0,
      progress: 0,
      remainingMeters: 0,
      totalDistanceMeters: 0,
    };
  }

  let minDistance = Infinity;
  let bestSegmentIndex = 0;
  let bestSnapped = geoPath[0];
  let bestPathDistance = 0;

  const uLat = userPos.lat;
  const uLng = userPos.lng;
  const cosLat = Math.cos((uLat * Math.PI) / 180);

  // 미터 단위 국소 평면 투영 계수
  const mPerLat = 110900;
  const mPerLng = 111320 * cosLat;

  for (let i = 0; i < geoPath.length - 1; i += 1) {
    const p1 = geoPath[i];
    const p2 = geoPath[i + 1];

    // 선분 벡터 (미터 단위)
    const vx = (p2.lng - p1.lng) * mPerLng;
    const vy = (p2.lat - p1.lat) * mPerLat;
    const vLenSq = vx * vx + vy * vy;

    // 사용자 벡터
    const wx = (uLng - p1.lng) * mPerLng;
    const wy = (uLat - p1.lat) * mPerLat;

    let t = 0;
    if (vLenSq > 0.0001) {
      t = (wx * vx + wy * vy) / vLenSq;
      t = Math.max(0, Math.min(1, t));
    }

    const snappedLat = p1.lat + t * (p2.lat - p1.lat);
    const snappedLng = p1.lng + t * (p2.lng - p1.lng);
    const snapped = { lat: snappedLat, lng: snappedLng };

    const distFromPath = getDistanceMeters(userPos, snapped);

    if (distFromPath < minDistance) {
      minDistance = distFromPath;
      bestSegmentIndex = i;
      bestSnapped = snapped;
      const segLen = segmentDistances[i] || 0;
      bestPathDistance = cumulativeDistances[i] + t * segLen;
    }
  }

  const isOffRoute = minDistance > 500;
  if (isOffRoute) {
    return {
      snappedPoint: geoPath[0],
      segmentIndex: 0,
      distanceFromPath: Math.round(minDistance),
      pathDistanceMeters: 0,
      progress: 0,
      remainingMeters: Math.round(totalDistanceMeters),
      totalDistanceMeters: Math.round(totalDistanceMeters),
      isOffRoute: true,
    };
  }

  const remainingMeters = Math.max(0, Math.round(totalDistanceMeters - bestPathDistance));
  const progress = Math.min(100, Math.max(0, Math.round((bestPathDistance / totalDistanceMeters) * 100)));

  return {
    snappedPoint: bestSnapped,
    segmentIndex: bestSegmentIndex,
    distanceFromPath: Math.round(minDistance),
    pathDistanceMeters: Math.round(bestPathDistance),
    progress,
    remainingMeters,
    totalDistanceMeters: Math.round(totalDistanceMeters),
    isOffRoute: false,
  };
}

/**
 * 턴바이턴 안내 문구에서 이동 동작 유형(maneuver) 판별
 */
export function getManeuverType(stepText = '') {
  const text = String(stepText || '');
  if (text.includes('도착')) return 'destination';
  if (text.includes('경유지') || text.includes('식당') || text.includes('음식점')) return 'restaurant';
  if (text.includes('횡단보도')) return 'crosswalk';
  if (text.includes('좌회전') || text.includes('좌측') || text.includes('10시') || text.includes('8시')) return 'turn-left';
  if (text.includes('우회전') || text.includes('우측') || text.includes('2시') || text.includes('4시')) return 'turn-right';
  if (text.includes('직진') || text.includes('따라')) return 'straight';
  return 'straight';
}

/**
 * 코스의 턴바이턴 텍스트 안내 목록을 실제 geoPath 상의 지리적 웨이포인트로 정밀 매핑
 */
export function buildRouteWaypoints(route) {
  const geoPath = route?.geoPath || [];
  const steps = route?.turnByTurn || [];

  if (!Array.isArray(geoPath) || geoPath.length === 0) return [];

  const { cumulativeDistances, totalDistanceMeters } = getCumulativeDistances(geoPath);

  if (steps.length === 0) {
    return [
      {
        index: 0,
        text: '경로를 따라 이동하세요',
        maneuver: 'straight',
        targetDistMeters: totalDistanceMeters,
        lat: geoPath[geoPath.length - 1].lat,
        lng: geoPath[geoPath.length - 1].lng,
      },
    ];
  }

  // 1) 각 단계 텍스트에서 거리(m, km) 추출
  const parsedStepDistances = steps.map((step) => {
    const kmMatch = step.match(/([\d.]+)\s*km/i);
    if (kmMatch) return parseFloat(kmMatch[1]) * 1000;
    const mMatch = step.match(/(\d+)\s*m/i);
    if (mMatch) return parseInt(mMatch[1], 10);
    return null;
  });

  // 거리 합산 및 스케일링 계수 계산
  const totalParsed = parsedStepDistances.reduce((sum, d) => sum + (d || 0), 0);
  const scale = totalParsed > 0 && totalDistanceMeters > 0 ? totalDistanceMeters / totalParsed : 1;

  let currentDist = 0;
  const waypoints = [];

  for (let i = 0; i < steps.length; i += 1) {
    const stepText = steps[i];
    const parsedD = parsedStepDistances[i];
    const stepDist = (parsedD != null ? parsedD * scale : totalDistanceMeters / steps.length);

    currentDist += stepDist;
    const targetDist = Math.min(totalDistanceMeters, currentDist);

    // targetDist에 해당하는 geoPath 상의 위치 보간
    let wpLat = geoPath[geoPath.length - 1].lat;
    let wpLng = geoPath[geoPath.length - 1].lng;

    for (let j = 0; j < cumulativeDistances.length - 1; j += 1) {
      if (targetDist >= cumulativeDistances[j] && targetDist <= cumulativeDistances[j + 1]) {
        const segLen = cumulativeDistances[j + 1] - cumulativeDistances[j];
        const t = segLen > 0 ? (targetDist - cumulativeDistances[j]) / segLen : 0;
        wpLat = geoPath[j].lat + t * (geoPath[j + 1].lat - geoPath[j].lat);
        wpLng = geoPath[j].lng + t * (geoPath[j + 1].lng - geoPath[j].lng);
        break;
      }
    }

    waypoints.push({
      index: i,
      text: stepText,
      maneuver: getManeuverType(stepText),
      targetDistMeters: targetDist,
      lat: wpLat,
      lng: wpLng,
    });
  }

  // 마지막 웨이포인트는 정확히 도착 지점과 일치
  if (waypoints.length > 0) {
    const last = waypoints[waypoints.length - 1];
    last.maneuver = 'destination';
    last.targetDistMeters = totalDistanceMeters;
    last.lat = geoPath[geoPath.length - 1].lat;
    last.lng = geoPath[geoPath.length - 1].lng;
  }

  return waypoints;
}

/**
 * 사용자의 현재 진행 거리(pathDistanceMeters)에 기초하여 실시간 턴바이턴 안내 생성
 */
export function getNextNavigationGuidance(userPathDistanceMeters, waypoints, totalDistanceMeters) {
  if (!Array.isArray(waypoints) || waypoints.length === 0) {
    return {
      maneuver: 'straight',
      distanceToTurnMeters: 0,
      distanceText: '',
      instruction: '산책을 시작하세요',
      subInstruction: '',
      isArrived: false,
      waypointIndex: 0,
    };
  }

  const remainingToGoal = Math.max(0, totalDistanceMeters - userPathDistanceMeters);

  // 목적지 25m 이내 진입 시 도착 판정
  if (remainingToGoal <= 25) {
    return {
      maneuver: 'destination',
      distanceToTurnMeters: remainingToGoal,
      distanceText: remainingToGoal <= 10 ? '도착' : `${remainingToGoal}m 앞`,
      instruction: '목적지 부근에 도착했습니다',
      subInstruction: '산책을 완료해보세요!',
      isArrived: true,
      waypointIndex: waypoints.length - 1,
    };
  }

  // 다음 웨이포인트 탐색: 사용자가 아직 지나가지 않은 첫 번째 웨이포인트 (마진 8m)
  let activeWp = waypoints[waypoints.length - 1];
  let activeIdx = waypoints.length - 1;

  for (let i = 0; i < waypoints.length; i += 1) {
    const wp = waypoints[i];
    if (wp.targetDistMeters - userPathDistanceMeters > 8) {
      activeWp = wp;
      activeIdx = i;
      break;
    }
  }

  const distanceToTurn = Math.max(0, Math.round(activeWp.targetDistMeters - userPathDistanceMeters));
  let distanceText = `${distanceToTurn}m 앞`;
  if (distanceToTurn <= 15) {
    distanceText = '잠시 후';
  }

  const nextWp = waypoints[activeIdx + 1];
  const subInstruction = nextWp ? nextWp.text : '';

  return {
    maneuver: activeWp.maneuver,
    distanceToTurnMeters: distanceToTurn,
    distanceText,
    instruction: activeWp.text,
    subInstruction,
    isArrived: false,
    waypointIndex: activeIdx,
  };
}
