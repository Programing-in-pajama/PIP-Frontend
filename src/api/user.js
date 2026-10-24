import { getUserProfile, saveUserProfile } from './auth';
import { mockGetProfile, mockUpdateProfile } from '../mocks/user';

// 약물 형식 정규화
// - 백엔드(user_medications)가 { id, name, ingredientName, timing, cautionNote, durWarningTags } 객체 형태로 제공
// - 혹시 레거시 이름 문자열로 들어올 경우를 대비해 브라우저 캐시 및 기본 객체로 변환
const toMedicationObject = (med, cached = []) => {
  if (med && typeof med === 'object') {
    return {
      id: med.id || `med-${med.name}`,
      name: med.name,
      ingredientName: med.ingredientName || null,
      timing: med.timing || null,
      cautionNote: med.cautionNote || null,
      durWarningTags: med.durWarningTags || null
    };
  }
  const name = String(med ?? '').trim();
  return (
    cached.find((c) => c && typeof c === 'object' && c.name === name) ?? {
      id: `med-${name}`,
      name,
      ingredientName: null,
      timing: null,
      cautionNote: null,
      durWarningTags: null
    }
  );
};

// ─── [프로필 메모리/스토리지 캐시 및 중복 요청 방지(Deduplication)] ───
function readStoredProfile() {
  try {
    const raw = localStorage.getItem('soyo-user-profile');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

let inMemoryProfile = readStoredProfile();
let lastFetchTime = inMemoryProfile ? Date.now() : 0;
let pendingFetchPromise = null;
const CACHE_TTL_MS = 60000; // 캐시 유효 시간 (강제 요청이 아니거나 캐시가 있으면 불필요한 네트워크 호출 차단)

export const getCachedProfile = () => inMemoryProfile || readStoredProfile();

export const clearProfileCache = () => {
  inMemoryProfile = null;
  lastFetchTime = 0;
  pendingFetchPromise = null;
};

// 회원 정보 API (Supabase PostgreSQL DB 직접 연동 및 로컬 캐시 동기화)
export const getProfile = async (token, { force = false } = {}) => {
  const currentUserId = localStorage.getItem('soyo-current-user-id') || localStorage.getItem('soyo-saved-id');

  // 1. 이미 캐시된 프로필이 있고 강제 새로고침이 아닌 경우 즉시 반환
  //    (창/탭 이동 시 불필요한 백엔드 중복 요청 및 502 / CORS 차단 콘솔 에러 원천 방지)
  const cached = inMemoryProfile || readStoredProfile();
  if (!force && cached) {
    inMemoryProfile = cached;
    return cached;
  }

  // 2. 이미 동일한 프로필 조회가 진행 중이면 기존 프로미스 재사용
  if (pendingFetchPromise) {
    return pendingFetchPromise;
  }

  const fetchTask = async () => {
    if (currentUserId) {
      try {
        console.log('🚀 [서버 DB] 마이페이지 프로필 조회 요청:', currentUserId);
        const res = await getUserProfile(currentUserId);
        const p = res?.profile || res?.data;
        if (res?.success && p) {
          const profile = {
            userId: p.userId,
            userName: p.userName || '소요 여행자',
            email: p.email || localStorage.getItem('soyo-current-email') || '',
            profileImage: null,
            birthDate: p.birthDate ? String(p.birthDate).split('T')[0] : '1970-01-01',
            allergies: Array.isArray(p.allergies) ? p.allergies : (p.allergies ? String(p.allergies).split(', ') : []),
            diseaseIds: Array.isArray(p.chronicConditions || p.diseaseIds) ? (p.chronicConditions || p.diseaseIds) : [],
            medications: [],
            hasMedication: p.hasMedication
          };
          const localMock = (await mockGetProfile()).medications ?? [];
          profile.medications = (Array.isArray(p.medications) ? p.medications : []).map((m) => toMedicationObject(m, localMock));
          await mockUpdateProfile(profile);

          inMemoryProfile = profile;
          lastFetchTime = Date.now();
          try {
            localStorage.setItem('soyo-user-profile', JSON.stringify(profile));
          } catch {
            // ignore
          }
          console.log('✅ [서버 DB] 마이페이지 프로필 로드 성공:', profile);
          return profile;
        }
      } catch (e) {
        // 서버 슬립(Render 502/CORS) 또는 일시적 네트워크 장애 시 부드럽게 로컬 캐시 사용
        console.warn('⚠️ [서버 DB] 프로필 조회 대기, 로컬 캐시를 사용합니다:', e.message);
      }
    }

    // 3. 서버 호출 실패 또는 비로그인 상태일 때 로컬 캐시(localStorage / mock) 안전 반환
    const fallback = readStoredProfile();
    if (fallback) {
      inMemoryProfile = fallback;
      return fallback;
    }

    const local = await mockGetProfile();
    const finalProfile = { ...local, medications: (local.medications ?? []).map((m) => toMedicationObject(m)) };
    inMemoryProfile = finalProfile;
    try {
      localStorage.setItem('soyo-user-profile', JSON.stringify(finalProfile));
    } catch {
      // ignore
    }
    return finalProfile;
  };

  pendingFetchPromise = fetchTask().finally(() => {
    pendingFetchPromise = null;
  });

  return pendingFetchPromise;
};

export const updateProfile = async (token, changes) => {
  const currentUserId = localStorage.getItem('soyo-current-user-id') || localStorage.getItem('soyo-saved-id');
  const updatedLocal = await mockUpdateProfile(changes);

  inMemoryProfile = { ...(inMemoryProfile || {}), ...updatedLocal };
  lastFetchTime = Date.now();
  try {
    localStorage.setItem('soyo-user-profile', JSON.stringify(inMemoryProfile));
  } catch {
    // ignore
  }

  if (currentUserId && changes && (changes.userName || changes.birthDate || changes.diseaseIds || changes.allergies || changes.medications)) {
    try {
      console.log('🚀 [서버 DB] 마이페이지 프로필 변경사항 DB 저장 중:', currentUserId);
      await saveUserProfile({
        userId: currentUserId,
        name: updatedLocal.userName,
        birth: updatedLocal.birthDate,
        allergies: updatedLocal.allergies || [],
        diseases: updatedLocal.diseaseIds || [],
        medications: updatedLocal.medications || [],
        noAllergy: (updatedLocal.allergies || []).length === 0,
        noDisease: (updatedLocal.diseaseIds || []).length === 0,
        noMedication: (updatedLocal.medications || []).length === 0
      });
      console.log('✅ [서버 DB] 마이페이지 변경사항 DB 영구 저장 완료');
    } catch (e) {
      console.warn('⚠️ [서버 DB] 마이페이지 프로필 DB 저장 대기 (로컬 캐시 우선 반영):', e.message);
    }
  }
  return updatedLocal;
};
