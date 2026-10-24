import React, { useState } from 'react';
import { PageHeader } from './common';
import { DISEASE_CATEGORIES } from '../../data/chronicDiseases';

// No.12 기저질환 선택 (Figma 204-784 — 질환 목록은 엑셀 만성질환 목록표 기준)
// 변수: diseaseList(질병 선택 목록 — data/chronicDiseases.js), diseaseIds(선택한 질병), isLoading
function DiseaseSelectPage({ profile, isLoading, onSave, onBack }) {
  const [diseaseIds, setDiseaseIds] = useState(profile.diseaseIds ?? []);
  // 화면 전용: 지금 펼쳐진 대분류 (한 번에 하나)
  const [openCategoryId, setOpenCategoryId] = useState(null);

  const toggleDisease = (id) => {
    setDiseaseIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  return (
    <div className="mp-page">
      <PageHeader title="기저질환 선택" onBack={onBack} />

      <ul className="mp-category-list">
        {DISEASE_CATEGORIES.map((category) => {
          const isOpen = openCategoryId === category.id;
          const selectedCount = category.diseases.filter((d) => diseaseIds.includes(d.id)).length;
          return (
            <li key={category.id}>
              <button
                type="button"
                className="mp-category"
                aria-expanded={isOpen}
                onClick={() => setOpenCategoryId(isOpen ? null : category.id)}
              >
                <span className={`mp-category-icon ${isOpen || selectedCount > 0 ? 'active' : ''}`} aria-hidden="true" />
                <span className="mp-category-name">{category.name}</span>
                <span className="mp-chevron mp-chevron-down" aria-hidden="true">⌄</span>
              </button>

              {isOpen && (
                <fieldset className="mp-disease-box">
                  <legend>{category.name}</legend>
                  {category.diseases.map((disease) => (
                    <label key={disease.id} className="mp-check">
                      <input
                        type="checkbox"
                        checked={diseaseIds.includes(disease.id)}
                        onChange={() => toggleDisease(disease.id)}
                      />
                      {disease.name}
                    </label>
                  ))}
                </fieldset>
              )}
            </li>
          );
        })}
      </ul>

      <button type="button" className="mp-primary-button" disabled={isLoading} onClick={() => onSave({ diseaseIds })}>
        {isLoading ? '저장 중...' : '저장'}
      </button>
    </div>
  );
}

export default DiseaseSelectPage;
