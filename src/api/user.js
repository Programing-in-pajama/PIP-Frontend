import { getUserProfile, saveUserProfile } from './auth';
import { mockGetProfile, mockUpdateProfile } from '../mocks/user';

// 약물 형식 맞추기
// - 백엔드(user_medications)는 지금 약물 "이름"만 주고받아요 → ['다이아벡스정', ...]
// - 마이페이지 화면은 { id, name, ingredientName, cautionNote ... } 형태를 써요
// 이름으로 받은 약물은 브라우저 캐시(이전에 고른 약물 정보)에서 성분·주의사항을 되살려요.
const toMedicationObject = (med, cached = []) => {
  if (med && typeof med === 'object') return med;
  const name = String(med ?? '').trim();
  return cached.find((c) => c && typeof c === 'object' && c.name === name)
    ?? { id: `med-${name}`, name, ingredientName: null, timing: null, cautionNote: null, durWarningTags: null };
};
const toMedicationNames = (meds = []) => meds.map((m) => (m && typeof m === 'object' ? m.name : m)).filter(Boolean);

// 회원 정보 API (AWS RDS PostgreSQL DB 직접 연동 및 로컬 캐시 동기화)
export const getProfile = async (token) => {
  const currentUserId = localStorage.getItem('soyo-current-user-id') || localStorage.getItem('soyo-saved-id');
  if (currentUserId) {
    try {
      console.log('🚀 [AWS RDS] 마이페이지 프로필 조회 요청:', currentUserId);
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
        console.log('✅ [AWS RDS] 마이페이지 DB 프로필 로드 성공:', profile);
        return profile;
      }
    } catch (e) {
      console.warn('⚠️ [AWS RDS] 프로필 조회 실패, 로컬 캐시를 사용합니다:', e.message);
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
      console.log('🚀 [AWS RDS] 마이페이지 프로필 변경사항 DB 저장 중:', currentUserId);
      await saveUserProfile({
        userId: currentUserId,
        name: updatedLocal.userName,
        birth: updatedLocal.birthDate,
        allergies: updatedLocal.allergies || [],
        diseases: updatedLocal.diseaseIds || [],
        medications: toMedicationNames(updatedLocal.medications || []),
        noAllergy: (updatedLocal.allergies || []).length === 0,
        noDisease: (updatedLocal.diseaseIds || []).length === 0,
        noMedication: (updatedLocal.medications || []).length === 0
      });
      console.log('✅ [AWS RDS] 마이페이지 변경사항 DB 영구 저장 완료');
    } catch (e) {
      console.error('❌ [AWS RDS] 마이페이지 프로필 DB 저장 실패:', e.message);
      throw e;
    }
  }
  return updatedLocal;
};
