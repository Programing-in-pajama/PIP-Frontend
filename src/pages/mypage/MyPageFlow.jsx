import React, { useState, useEffect } from 'react';
import { getProfile, updateProfile } from '../../api/user';
import { findDuplicateIngredients } from '../../utils/medications';
import MyPage from './MyPage';
import ProfileEditPage from './ProfileEditPage';
import HealthManagePage from './HealthManagePage';
import DiseaseSelectPage from './DiseaseSelectPage';
import AllergyManagePage from './AllergyManagePage';
import AllergyEditPage from './AllergyEditPage';
import AllergyCustomPage from './AllergyCustomPage';
import MedicationManagePage from './MedicationManagePage';
import MedicationSearchPage from './MedicationSearchPage';
import MedicationDetailPage from './MedicationDetailPage';
import MedicationConfirmPage from './MedicationConfirmPage';
import DuplicateWarningPage from './DuplicateWarningPage';
import './mypage.css';

// 마이페이지 탭 전체 (Figma No.10 ~ No.19)
//   (Figma 시안 기준 — 문구·순서는 시안 그대로)
//   마이페이지 ─┬─ 회원정보 수정
//              ├─ 건강정보 관리 ─┬─ 알레르기 관리 ── 알레르기 수정 ── 직접 입력
//              │                └─ 기저질환 선택
//              └─ 복용 약물 관리 ── 약물 검색 ─┬─ 약물 상세
//                        └─ 성분 중복 주의      └─ 약물 등록 확인
// 변수: activeScreen, isLoading, error, toast, isLoggedIn (변수 명세서 01·02)
function MyPageFlow({ session, resetKey, isLoggedIn, onLogin, onLogout }) {
  // 지나온 화면 목록 — 맨 끝이 지금 화면, ‹ 를 누르면 하나 전으로
  const [screenStack, setScreenStack] = useState(['myPage']);
  const activeScreen = screenStack[screenStack.length - 1];
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // 저장하기 전까지 임시로 고르는 값들
  const [allergyDraft, setAllergyDraft] = useState({ hasAllergy: true, items: [] });
  const [medicationQuery, setMedicationQuery] = useState('');
  const [selectedMedications, setSelectedMedications] = useState([]);
  const [detailMedication, setDetailMedication] = useState(null);

  const goTo = (screen) => setScreenStack((stack) => [...stack, screen]);
  const goBack = () => setScreenStack((stack) => (stack.length > 1 ? stack.slice(0, -1) : stack));
  const backTo = (screen) => setScreenStack((stack) => {
    const index = stack.lastIndexOf(screen);
    return index >= 0 ? stack.slice(0, index + 1) : ['myPage', screen];
  });

  // 하단 메뉴에서 마이페이지를 다시 누르면 첫 화면으로
  useEffect(() => setScreenStack(['myPage']), [resetKey]);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    getProfile(session?.access_token)
      .then(setProfile)
      .catch((err) => {
        console.warn('⚠️ [마이페이지] 프로필 로드 실패:', err);
        setError('정보를 불러오지 못했어요');
      })
      .finally(() => setIsLoading(false));
  }, [session, resetKey, isLoggedIn]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(timer);
  }, [toast]);

  // 저장 후 이동할 화면(nextScreen)과 알림 문구를 함께 받음
  const save = async (changes, { nextScreen, message = '저장했어요' } = {}) => {
    setIsLoading(true);
    try {
      const updated = await updateProfile(session?.access_token, changes);
      setProfile(updated);
      if (message) setToast(message);
      if (nextScreen) backTo(nextScreen);
      return updated;
    } catch {
      setToast('저장하지 못했어요. 다시 시도해 주세요');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const openAllergyEdit = () => {
    const items = profile.allergies ?? [];
    setAllergyDraft({ hasAllergy: items.length > 0, items });
    goTo('allergyEdit');
  };

  const openMedicationSearch = () => {
    setSelectedMedications([]);
    setMedicationQuery('');
    goTo('medicationSearch');
  };

  const toggleMedication = (medication) => {
    setSelectedMedications((list) =>
      list.some((item) => item.id === medication.id) ? list.filter((item) => item.id !== medication.id) : [...list, medication],
    );
  };

  const registerMedications = async () => {
    const existing = profile.medications ?? [];
    // 새로 등록한 약물이 목록 위쪽에 오도록 (Figma no.14: 다이아벡스정 → 등록 약물 A → B)
    const medications = [...selectedMedications.filter((m) => !existing.some((e) => e.id === m.id)), ...existing];
    const updated = await save({ medications, hasMedication: true }, { message: `약물 ${selectedMedications.length}개를 등록했어요` });
    if (!updated) return;
    setSelectedMedications([]);
    // 성분이 겹치면 바로 성분 중복 주의 화면으로
    if (findDuplicateIngredients(updated.medications).length > 0) setScreenStack(['myPage', 'medicationManage', 'duplicateWarning']);
    else backTo('medicationManage');
  };

  let content;
  if (error) content = <p className="mp-state">{error}</p>;
  else if (!profile) content = <p className="mp-state">불러오는 중...</p>;
  else {
    switch (activeScreen) {
      case 'profileEdit':
        content = <ProfileEditPage profile={profile} isLoading={isLoading} onSave={(changes) => save(changes, { nextScreen: 'myPage' })} />;
        break;
      case 'healthManage':
        content = <HealthManagePage profile={profile} onBack={goBack} onOpen={(screen) => (screen === 'allergyManage' ? goTo(screen) : goTo('diseaseSelect'))} />;
        break;
      case 'diseaseSelect':
        content = <DiseaseSelectPage profile={profile} isLoading={isLoading} onSave={(changes) => save(changes, { nextScreen: 'healthManage' })} />;
        break;
      case 'allergyManage':
        content = (
          <AllergyManagePage
            profile={profile}
            onBack={goBack}
            onEdit={openAllergyEdit}
            onDelete={(name) => save({ allergies: profile.allergies.filter((item) => item !== name) }, { message: '삭제했어요' })}
          />
        );
        break;
      case 'allergyEdit':
        content = (
          <AllergyEditPage
            draft={allergyDraft}
            onChange={setAllergyDraft}
            isLoading={isLoading}
            onBack={goBack}
            onCustom={() => goTo('allergyCustom')}
            onSave={(allergies) => save({ allergies }, { nextScreen: 'allergyManage' })}
          />
        );
        break;
      case 'allergyCustom':
        content = (
          <AllergyCustomPage
            draftItems={allergyDraft.items}
            onBack={goBack}
            onAdd={(name) => { setAllergyDraft((draft) => ({ hasAllergy: true, items: [...draft.items, name] })); goBack(); }}
          />
        );
        break;
      case 'medicationManage':
        content = (
          <MedicationManagePage
            profile={profile}
            isLoading={isLoading}
            onBack={goBack}
            onSearch={openMedicationSearch}
            onShowDuplicates={() => goTo('duplicateWarning')}
            onDelete={(medication) => save({ medications: profile.medications.filter((m) => m.id !== medication.id) }, { message: '삭제했어요' })}
            onSaveNoMedication={(noMedication) => save({ hasMedication: !noMedication }, { nextScreen: 'myPage' })}
          />
        );
        break;
      case 'medicationSearch':
        content = (
          <MedicationSearchPage
            query={medicationQuery}
            onQueryChange={setMedicationQuery}
            selected={selectedMedications}
            registeredIds={(profile.medications ?? []).map((m) => m.id)}
            onBack={goBack}
            onToggle={toggleMedication}
            onOpenDetail={(medication) => { setDetailMedication(medication); goTo('medicationDetail'); }}
            onConfirm={() => goTo('medicationConfirm')}
          />
        );
        break;
      case 'medicationDetail':
        content = (
          <MedicationDetailPage
            medication={detailMedication}
            isSelected={selectedMedications.some((m) => m.id === detailMedication.id)}
            isRegistered={(profile.medications ?? []).some((m) => m.id === detailMedication.id)}
            onBack={goBack}
            onToggle={() => { toggleMedication(detailMedication); goBack(); }}
          />
        );
        break;
      case 'medicationConfirm':
        content = (
          <MedicationConfirmPage
            selected={selectedMedications}
            existingCount={(profile.medications ?? []).length}
            isLoading={isLoading}
            onBack={goBack}
            onRegister={registerMedications}
          />
        );
        break;
      case 'duplicateWarning':
        content = <DuplicateWarningPage medications={profile.medications ?? []} onBack={goBack} onDone={() => backTo('medicationManage')} />;
        break;
      default:
        content = (
          <MyPage
            profile={profile}
            isLoggedIn={isLoggedIn}
            onNavigate={goTo}
            onLogout={() => { onLogout(); setToast('로그아웃했어요'); }}
            onLogin={onLogin}
          />
        );
    }
  }

  return (
    <div className="mp-screen">
      {content}
      {toast && <div className="mp-toast" role="status">{toast}</div>}
    </div>
  );
}

export default MyPageFlow;
