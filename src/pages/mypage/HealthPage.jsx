import React from 'react';
import Icon from '../../components/Icons';
import { getDiseaseName } from '../../data/chronicDiseases';

// No.12 건강정보 관리 (Figma 204-573)
// 변수: allergies, diseaseIds
export default function HealthPage({ profile = {}, onBack, onAllergy, onDisease, onMedication }) {
  const allergies = profile?.allergies ?? [];
  const diseaseNames = (profile?.diseaseIds ?? []).map(getDiseaseName);
  const medications = profile?.medications ?? [];

  return (
    <>
      <header className="page-head page-head--back">
        <button type="button" className="back-btn" onClick={onBack} aria-label="뒤로">
          <Icon name="chevron-left" size={22} />
        </button>
        <div className="page-head-text">
          <h1>건강정보 관리</h1>
          <p>등록한 정보를 확인하고 수정하세요</p>
        </div>
        <img src="/pic/SOYO.png" alt="SOYO" className="head-logo" />
      </header>

      <div className="info-banner">
        <span className="info-banner-icon"><Icon name="leaf" size={18} /></span>
        <div>
          <strong>나에게 맞는 산책을 위해</strong>
          <p>건강정보는 산책 코스와 식당 추천에 활용돼요.</p>
        </div>
      </div>

      <div className="manage-list">
        <button type="button" className="manage-card" onClick={onAllergy}>
          <div className="manage-text">
            <strong>알레르기 관리</strong>
            <p>{allergies.length ? allergies.join(' · ') : '등록된 정보가 없어요'}</p>
            {allergies.length > 0 && <small>등록한 알레르기 {allergies.length}개</small>}
          </div>
          <Icon name="chevron-right" size={18} />
        </button>

        <button type="button" className="manage-card" onClick={onDisease}>
          <div className="manage-text">
            <strong>기저질환 관리</strong>
            <p>
              {diseaseNames.length
                ? `${diseaseNames.slice(0, 2).join(' · ')}${diseaseNames.length > 2 ? ` 외 ${diseaseNames.length - 2}개` : ''}`
                : '아직 등록된 정보가 없어요'}
            </p>
            {diseaseNames.length > 0 && <small>등록한 기저질환 {diseaseNames.length}개</small>}
          </div>
          <Icon name="chevron-right" size={18} />
        </button>

        {onMedication && (
          <button type="button" className="manage-card" onClick={onMedication}>
            <div className="manage-text">
              <strong>복용 약물 관리</strong>
              <p>{medications.length ? medications.map((m) => (typeof m === 'object' ? m.name : m)).join(' · ') : '등록된 약물이 없어요'}</p>
              {medications.length > 0 && <small>등록한 약물 {medications.length}개</small>}
            </div>
            <Icon name="chevron-right" size={18} />
          </button>
        )}
      </div>

      <p className="mp-guest-note">입력한 정보는 언제든 수정하거나 삭제할 수 있어요.</p>
    </>
  );
}
