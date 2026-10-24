import React, { useState } from 'react';
import Icon from '../../components/Icons';
import { DISEASE_CATEGORIES } from '../../data/chronicDiseases';

export default function DiseaseSelectPage({ profile, isLoading, onSave, onBack }) {
  const [diseaseIds, setDiseaseIds] = useState(profile.diseaseIds ?? []);
  const [openCategoryId, setOpenCategoryId] = useState(DISEASE_CATEGORIES[0]?.id ?? null);

  const toggleDisease = (id) => {
    setDiseaseIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  return (
    <>
      <header className="page-head page-head--back">
        <button type="button" className="back-btn" onClick={onBack} aria-label="뒤로">
          <Icon name="chevron-left" size={22} />
        </button>
        <div>
          <h1>기저질환 선택</h1>
          <p>해당하는 질환을 모두 선택해 주세요</p>
        </div>
      </header>

      <ul className="disease-list">
        {DISEASE_CATEGORIES.map((category) => {
          const isOpen = openCategoryId === category.id;
          const selectedCount = category.diseases.filter((disease) => diseaseIds.includes(disease.id)).length;
          return (
            <li key={category.id}>
              <button
                type="button"
                className={`disease-category ${isOpen ? 'is-open' : ''} ${selectedCount ? 'has-selection' : ''}`}
                aria-expanded={isOpen}
                onClick={() => setOpenCategoryId(isOpen ? null : category.id)}
              >
                <span className="disease-icon" aria-hidden="true" />
                <span className="disease-category-text">
                  {category.name}
                  {selectedCount > 0 && <small>{selectedCount}개 선택</small>}
                </span>
                <Icon name="chevron-down" size={18} className={isOpen ? 'rotate' : ''} />
              </button>

              {isOpen && (
                <div className="disease-options">
                  <p className="disease-options-title">{category.name}</p>
                  {category.diseases.map((disease) => (
                    <label
                      key={disease.id}
                      className={`check-row ${diseaseIds.includes(disease.id) ? 'selected' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={diseaseIds.includes(disease.id)}
                        onChange={() => toggleDisease(disease.id)}
                      />
                      <span>{disease.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <p className="selected-summary">
        {diseaseIds.length ? `선택한 기저질환 ${diseaseIds.length}개` : '선택한 기저질환이 없어요'}
      </p>

      <div className="bottom-cta">
        <button
          type="button"
          className="btn btn-primary"
          disabled={isLoading}
          onClick={() => onSave({ diseaseIds })}
        >
          {isLoading ? '저장 중...' : '저장'}
        </button>
      </div>
    </>
  );
}
