import React from 'react';
import { PageHeader, PillIcon, CautionLine } from './common';

// no.17 약물 등록 확인 (Figma 204-240)
function MedicationConfirmPage({ selected, existingCount, isLoading, onBack, onRegister }) {
  const total = existingCount + selected.length;

  return (
    <div className="mp-page mp-form">
      <PageHeader title="약물 등록 확인" subtitle="선택한 약물을 한 번 더 확인하세요" onBack={onBack} />

      <h2 className="mp-section-title mp-section-first">추가할 약물 {selected.length}개</h2>
      <ul className="mp-card-list">
        {selected.map((medication) => (
          <li key={medication.id} className="mp-item-card">
            <PillIcon />
            <span className="mp-item-text">
              <strong>{medication.name}</strong>
              <CautionLine text={medication.cautionNote} />
              <small className="mp-selected-text">✓ 선택됨</small>
            </span>
          </li>
        ))}
      </ul>

      <section className="mp-plain-box mp-indent mp-gap-top">
        <strong>등록 후 복용 약물</strong>
        <span>기존 {existingCount}개 + 추가 {selected.length}개 = 총 {total}개</span>
        <span>등록된 약물 간 성분 중복 여부를 확인해요.</span>
      </section>

      <section className="mp-plain-box mp-gap-top">
        <strong>약물 이름과 주의사항을 확인했나요?</strong>
        <span>등록 후에도 약물을 추가하거나 삭제할 수 있어요.</span>
      </section>

      <div className="mp-bottom-actions">
        <button type="button" className="mp-primary-button" disabled={isLoading || selected.length === 0} onClick={onRegister}>
          {isLoading ? '등록 중...' : '약물 등록하기'}
        </button>
      </div>
    </div>
  );
}

export default MedicationConfirmPage;
