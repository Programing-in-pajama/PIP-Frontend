import { apiData } from './client';
import { getRoutes } from '../data/routes';

/**
 * 백엔드 Tmap 기반 멀티 세그먼트 보행 코스 추천 API 호출
 * 네트워크 장애/오프라인 시 로컬 고정밀 실측 도로망 코스로 자동 폴백
 */
export async function fetchRecommendedRoutes({
  region,
  minutes = 25,
  includeRestaurant = true,
  userDiseases = [],
  currentLocation = null,
}) {
  const regionId = region?.id || 'yeokgok';
  const diseasesParam = Array.isArray(userDiseases) ? userDiseases.join(',') : '';

  try {
    const query = new URLSearchParams({
      regionId,
      minutes: String(minutes),
      includeRestaurant: String(includeRestaurant),
      diseases: diseasesParam,
    });

    if (currentLocation?.lat && currentLocation?.lng) {
      query.set('lat', String(currentLocation.lat));
      query.set('lng', String(currentLocation.lng));
    }

    const data = await Promise.race([
      apiData(`/api/routes/recommend?${query.toString()}`),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4500)),
    ]);

    if (data?.courses && Array.isArray(data.courses) && data.courses.length > 0) {
      return data.courses;
    }
  } catch (err) {
    console.warn('⚠️ [백엔드 Tmap 코스 조회 실패/대기시간 초과, 로컬 고정밀 도로망으로 즉시 대체]:', err.message);
  }

  return getRoutes(region, minutes, userDiseases, includeRestaurant);
}
