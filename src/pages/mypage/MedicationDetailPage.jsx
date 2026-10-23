import React from 'react';
import { PageHeader, WarningIcon } from './common';
import { getIngredients } from '../../utils/medications';

// No.16 약물 상세 (Figma 204-204)
// 변수: name, ingredientName, cautionNote (DB user_medications)
function MedicationDetailPage({ medication, isSelected, isRegistered, onBack, onToggle }) {
  return (
    <div className="mp-page mp-form">
      <PageHeader title="약물 상세" subtitle="약물 이름과 개별 주의사항을 확인하세요" onBack={onBack} />

      <section className="mp-gray-box mp-detail-name">
        <strong>{medication.name}</strong>
        <span>검색한 약물</span>
      </section>

      <h2 className="mp-section-title">약물 성분</h2>
      <section className="mp-outline-box">
        {getIngredients(medication).join(', ') || '성분 정보가 없어요'}
      </section>

      <section className="mp-caution-box">
        <strong><WarningIcon /> 약물별 주의사항</strong>
        <span>{medication.cautionNote || '등록된 주의사항이 없어요'}</span>
      </section>

      <p className="mp-subtitle mp-gap-top">등록하면 다른 복용 약물과 성분을 비교해요.</p>

      <div className="mp-bottom-actions">
        {isRegistered ? (
          <button type="button" className="mp-primary-button" disabled>이미 등록한 약물이에요</button>
        ) : (
          <button type="button" className="mp-primary-button" onClick={onToggle}>
            {isSelected ? '선택 해제하기' : '이 약물 선택하기'}
          </button>
        )}
      </div>
    </div>
  );
}

export default MedicationDetailPage;
