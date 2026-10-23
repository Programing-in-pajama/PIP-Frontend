import React, { useState } from 'react';
import { PageHeader, ConfirmModal, DuplicateWarningCard, PillIcon, CautionLine } from './common';
import { findDuplicateIngredients } from '../../utils/medications';

// no.14 복용 약물 관리 (Figma 204-409) / 복용약물없음 (204-324) / no.19 약물 삭제 확인 (246-307)
// 변수: medications(DB user_medications), hasMedication(DB has_medication)
function MedicationManagePage({ profile, isLoading, onBack, onSearch, onDelete, onShowDuplicates, onSaveNoMedication }) {
  const medications = profile.medications ?? [];
  const duplicates = findDuplicateIngredients(medications);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [noMedication, setNoMedication] = useState(profile.hasMedication === false);

  if (medications.length === 0) {
    return (
      <div className="mp-page mp-form">
        <PageHeader title="복용 약물 관리" subtitle="현재 복용 중인 약물 정보를 알려주세요" onBack={onBack} />

        <section className="mp-empty-state">
          <PillIcon large />
          <strong>등록된 약물이 없어요</strong>
          <span>복용 중인 약물이 있으면 검색해 등록해 주세요.</span>
        </section>

        <label className="mp-gray-box mp-check-box">
          <input type="checkbox" checked={noMedication} onChange={(e) => setNoMedication(e.target.checked)} />
          복용 중인 약물이 없습니다.
        </label>

        <div className="mp-bottom-actions">
          <button type="button" className="mp-outline-button" onClick={onSearch}>+ 약물 검색하기</button>
          <button type="button" className="mp-primary-button" disabled={isLoading} onClick={() => onSaveNoMedication(noMedication)}>
            {isLoading ? '저장 중...' : '저장하기'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mp-page mp-form">
      <PageHeader title="복용 약물 관리" subtitle="등록한 약물을 확인하고 관리하세요" onBack={onBack} />

      {duplicates.length > 0 && (
        <>
          <DuplicateWarningCard />
          <button type="button" className="mp-link-button" onClick={onShowDuplicates}>중복 성분 확인하기 ›</button>
        </>
      )}

      <h2 className="mp-section-title">등록한 약물 {medications.length}개</h2>
      <ul className="mp-card-list">
        {medications.map((medication) => (
          <li key={medication.id} className="mp-item-card mp-med-card">
            <PillIcon />
            <span className="mp-item-text">
              <strong>{medication.name}</strong>
              <CautionLine text={medication.cautionNote} />
            </span>
            <button type="button" className="mp-text-button" onClick={() => setPendingDelete(medication)}>삭제</button>
          </li>
        ))}
      </ul>

      <div className="mp-bottom-actions">
        <button type="button" className="mp-primary-button" onClick={onSearch}>+ 약물 추가하기</button>
      </div>

      {pendingDelete && (
        <ConfirmModal
          title="등록한 약물을 삭제할까요?"
          itemName={pendingDelete.name}
          description="복용 약물 목록에서 삭제됩니다."
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => { onDelete(pendingDelete); setPendingDelete(null); }}
        />
      )}
    </div>
  );
}

export default MedicationManagePage;
