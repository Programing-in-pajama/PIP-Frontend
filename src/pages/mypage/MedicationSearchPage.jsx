import React, { useEffect, useState } from 'react';
import { PageHeader, CautionLine, SearchIcon } from './common';
import { searchMedications } from '../../api/medications';

// no.15 약물 검색 (Figma 204-460) / 검색결과 없음 (204-392)
// selected: 이번에 고른 약물들 / registeredIds: 이미 등록된 약물 id
function MedicationSearchPage({ query, onQueryChange, selected, registeredIds, onBack, onToggle, onOpenDetail, onConfirm }) {
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const keyword = query.trim();

  // 입력이 멈추고 0.25초 뒤에 검색
  useEffect(() => {
    if (!keyword) return setResults([]);
    let cancelled = false;
    setIsLoading(true);
    const timer = setTimeout(() => {
      searchMedications(keyword)
        .then((list) => { if (!cancelled) setResults(list); })
        .finally(() => { if (!cancelled) setIsLoading(false); });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [keyword]);

  const hasResults = keyword && !isLoading && results.length > 0;
  const noResults = keyword && !isLoading && results.length === 0;
  const isSelected = (medication) => selected.some((item) => item.id === medication.id);

  return (
    <div className="mp-page mp-form">
      <PageHeader
        title="약물 검색"
        subtitle={hasResults ? '약물 이름의 일부만 입력해도 검색할 수 있어요' : '약물 이름의 일부를 입력해 주세요'}
        onBack={onBack}
      />

      <div className="mp-search-bar">
        <input
          className="mp-input"
          placeholder="검색어 예시"
          aria-label="약물 이름 검색"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
        <span className="mp-search-actions">
          <button type="button" className="mp-clear" aria-label="검색어 지우기" onClick={() => onQueryChange('')}>×</button>
          <SearchIcon />
        </span>
      </div>

      {noResults && (
        <section className="mp-empty-state mp-empty-search">
          <strong>검색 결과가 없어요</strong>
          <span>약물 이름의 철자를 확인해 주세요.<br />이름의 일부로 다시 검색할 수 있어요.</span>
        </section>
      )}

      {hasResults && (
        <>
          <h2 className="mp-section-title">‘{keyword}’가 포함된 검색 결과</h2>
          <p className="mp-subtitle mp-subtitle-tight">약물명과 주의사항을 확인하고 선택하세요.</p>
          <ul className="mp-card-list">
            {results.map((medication) => {
              const registered = registeredIds.includes(medication.id);
              const chosen = isSelected(medication);
              return (
                <li key={medication.id} className="mp-item-card mp-result-card">
                  <button type="button" className="mp-item-text mp-plain-button" onClick={() => onOpenDetail(medication)}>
                    <strong>{medication.name}</strong>
                    <CautionLine text={medication.cautionNote} />
                  </button>
                  {registered ? (
                    <span className="mp-badge">등록됨</span>
                  ) : (
                    <button type="button" className={`mp-select-button ${chosen ? 'selected' : ''}`} aria-pressed={chosen} onClick={() => onToggle(medication)}>
                      {chosen ? '✓ 선택됨' : '+ 선택'}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {hasResults && (
        <div className="mp-bottom-actions">
          <p className="mp-count-text">선택한 약물 {selected.length}개</p>
          <button type="button" className="mp-primary-button" disabled={selected.length === 0} onClick={onConfirm}>선택한 약물 확인</button>
        </div>
      )}
    </div>
  );
}

export default MedicationSearchPage;
