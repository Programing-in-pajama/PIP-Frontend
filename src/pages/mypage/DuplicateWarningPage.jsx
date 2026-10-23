import React from 'react';
import { PageHeader, DuplicateWarningCard, PillIcon, WarningIcon } from './common';
import { findDuplicateIngredients } from '../../utils/medications';

// no.18 성분 중복 주의 (Figma 204-277)
function DuplicateWarningPage({ medications, onBack, onDone }) {
  const duplicates = findDuplicateIngredients(medications);
  // 겹치는 약물 (같은 약이 여러 성분에서 겹쳐도 한 번만)
  const overlapping = [...new Map(duplicates.flatMap((d) => d.medications).map((m) => [m.id, m])).values()];

  return (
    <div className="mp-page mp-form">
      <PageHeader title="성분 중복 주의" subtitle="등록된 약물 사이에 겹치는 성분이 있어요" onBack={onBack} />

      <DuplicateWarningCard />

      <h2 className="mp-section-title">성분이 겹치는 약물</h2>
      <ul className="mp-card-list">
        {overlapping.map((medication) => (
          <li key={medication.id} className="mp-item-card mp-med-card">
            <PillIcon />
            <span className="mp-item-text">
              <strong>{medication.name}</strong>
              <small className="mp-caution"><WarningIcon /> 성분 중복 안내</small>
            </span>
          </li>
        ))}
      </ul>

      <section className="mp-gray-box mp-gap-top">
        <strong>중복 성분</strong>
        <span>{duplicates.map((d) => d.ingredient).join(' · ')}</span>
      </section>

      <div className="mp-bottom-actions">
        <button type="button" className="mp-primary-button" onClick={onDone}>확인하고 약물 관리로 돌아가기</button>
      </div>
    </div>
  );
}

export default DuplicateWarningPage;
