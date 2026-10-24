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

      {isLoading && <SearchLoading keyword={keyword} />}

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

// 검색 중 화면 (Figma 에 없는 상태라 마이페이지 색으로 맞춤)
// 5초가 넘으면 무료 서버(Render)가 깨어나는 중일 수 있다는 안내를 덧붙여요.
function SearchLoading({ keyword }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 5000);
    return () => clearTimeout(timer);
  }, []);
  return (
    <section className="mp-loading" role="status" aria-live="polite">
      <span className="mp-spinner" aria-hidden="true" />
      <strong>‘{keyword}’ 찾는 중<span className="mp-loading-dots" aria-hidden="true" /></strong>
      <span>약물 정보와 주의사항을 불러오고 있어요.</span>
      {slow && <span className="mp-loading-slow">서버가 잠들어 있었다면 처음 검색은 최대 1분 걸릴 수 있어요. 조금만 기다려 주세요.</span>}
    </section>
  );
}

export default MedicationSearchPage;
