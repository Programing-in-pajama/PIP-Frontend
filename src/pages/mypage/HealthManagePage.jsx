import React from 'react';
import { PageHeader } from './common';
import { getDiseaseName } from '../../data/chronicDiseases';

// No.12 건강정보 관리 (Figma 204-573)
// 변수: allergies, diseaseIds
function HealthManagePage({ profile, onBack, onOpen }) {
  const allergies = profile.allergies ?? [];
  const diseaseNames = (profile.diseaseIds ?? []).map(getDiseaseName);

  const menuItems = [
    { id: 'allergyManage', title: '알레르기 관리', names: allergies, countLabel: `등록한 알레르기 ${allergies.length}개` },
    { id: 'diseaseSelect', title: '기저질환 관리', names: diseaseNames, countLabel: `등록한 기저질환 ${diseaseNames.length}개` },
  ];

  return (
    <div className="mp-page">
      <PageHeader title="건강정보 관리" subtitle="등록한 정보를 확인하고 수정하세요" onBack={onBack} />

      <section className="mp-gray-box">
        <strong>나에게 맞는 산책을 위해</strong>
        <span>건강정보는 산책 코스와 식당 추천에 활용돼요.</span>
      </section>

      <ul className="mp-menu mp-health-menu">
        {menuItems.map((item) => (
          <li key={item.id}>
            <button type="button" className="mp-menu-item mp-health-item" onClick={() => onOpen(item.id)}>
              <span>
                <strong>{item.title}</strong>
                {item.names.length > 0 ? (
                  <>
                    <span className="mp-health-names">{item.names.join(' · ')}</span>
                    <small>{item.countLabel}</small>
                  </>
                ) : (
                  <span className="mp-health-names">아직 등록한 정보가 없어요</span>
                )}
              </span>
              <span className="mp-chevron" aria-hidden="true">›</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default HealthManagePage;
