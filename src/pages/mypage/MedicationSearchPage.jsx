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
    console.log(`\n⏳ [화면 상태] "${keyword}" 약물 정보를 가져오는 중입니다... (로딩 시작)`);
    const timer = setTimeout(() => {
      searchMedications(keyword)
        .then((list) => {
          if (!cancelled) {
            setResults(list);
            console.log(`📋 [화면 갱신] 검색 결과 ${list.length}건이 화면에 렌더링되었습니다.`);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setIsLoading(false);
            console.log(`✨ [화면 상태] 약물 정보 로드 완료 (로딩 종료)`);
          }
        });
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

      {isLoading && (
        <section className="mp-empty-state" style={{ padding: '32px 0 16px', color: '#16a34a' }}>
          <div style={{
            margin: '0 auto 12px',
            width: '28px',
            height: '28px',
            border: '3px solid #e2e8f0',
            borderTopColor: '#22c55e',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }} />
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <strong style={{ fontSize: '15px', color: '#1e293b' }}>‘{keyword}’ 정보를 가져오는 중...</strong>
          <span style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>식약처 공공데이터 및 DUR 안전정보를 조회하고 있어요.</span>
        </section>
      )}

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
