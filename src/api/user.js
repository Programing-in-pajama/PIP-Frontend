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

// 회원 정보 API (Supabase PostgreSQL DB 직접 연동 및 로컬 캐시 동기화)
export const getProfile = async (token) => {
  const currentUserId = localStorage.getItem('soyo-current-user-id') || localStorage.getItem('soyo-saved-id');
  if (currentUserId) {
    try {
      console.log('🚀 [Supabase DB] 마이페이지 프로필 조회 요청:', currentUserId);
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
        const cached = (await mockGetProfile()).medications ?? [];
        profile.medications = (Array.isArray(p.medications) ? p.medications : []).map((m) => toMedicationObject(m, cached));
        await mockUpdateProfile(profile);
        console.log('✅ [Supabase DB] 마이페이지 프로필 로드 성공:', profile);
        return profile;
      }
    } catch (e) {
      console.warn('⚠️ [Supabase DB] 프로필 조회 실패, 로컬 캐시를 사용합니다:', e.message);
    }
  }
  const local = await mockGetProfile();
  return { ...local, medications: (local.medications ?? []).map((m) => toMedicationObject(m)) };
};

export const updateProfile = async (token, changes) => {
  const currentUserId = localStorage.getItem('soyo-current-user-id') || localStorage.getItem('soyo-saved-id');
  const updatedLocal = await mockUpdateProfile(changes);

  if (currentUserId && changes && (changes.userName || changes.birthDate || changes.diseaseIds || changes.allergies || changes.medications)) {
    try {
      console.log('🚀 [Supabase DB] 마이페이지 프로필 변경사항 DB 저장 중:', currentUserId);
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
      console.log('✅ [Supabase DB] 마이페이지 변경사항 DB 영구 저장 완료 (약물 상세 객체 포함)');
    } catch (e) {
      console.error('❌ [Supabase DB] 마이페이지 프로필 DB 저장 실패:', e.message);
      throw e;
    }
  }
  return updatedLocal;
};
