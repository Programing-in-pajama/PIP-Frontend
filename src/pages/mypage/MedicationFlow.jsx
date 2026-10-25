import React, { useEffect, useMemo, useState } from 'react';
import Icon from '../../components/Icons';
import {
  findDuplicateIngredients,
  findMedication,
  searchMedications,
} from '../../data/medications';

const toMedName = (item) => (typeof item === 'object' && item !== null ? (item.name || '') : String(item || '')).trim();

export default function MedicationFlow({ profile = {}, onSave, onBack }) {
  const [screen, setScreen] = useState('manage');
  const [medications, setMedications] = useState(() =>
    (profile?.medications ?? []).map(toMedName).filter(Boolean)
  );
  const [selected, setSelected] = useState([]);
  const [detailMed, setDetailMed] = useState(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [notice, setNotice] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setMedications((profile?.medications ?? []).map(toMedName).filter(Boolean));
  }, [profile?.medications]);

  useEffect(() => {
    if (screen !== 'search') return undefined;
    if (!query.trim()) {
      setResults([]);
      setIsSearching(false);
      return undefined;
    }
    setIsSearching(true);
    const timer = setTimeout(() => {
      setResults(searchMedications(query));
      setIsSearching(false);
    }, 380);
    return () => clearTimeout(timer);
  }, [query, screen]);

  const duplicateGroups = useMemo(() => findDuplicateIngredients(medications), [medications]);

  const pendingDuplicates = useMemo(
    () => findDuplicateIngredients([...medications, ...selected]),
    [medications, selected],
  );

  const saveMedications = async (next, message) => {
    setIsSaving(true);
    const cleaned = next.map(toMedName).filter(Boolean);
    const saved = await onSave({ medications: cleaned }, message);
    setIsSaving(false);
    if (saved) setMedications(cleaned);
    return saved;
  };

  const removeMedication = async (name) => {
    const target = toMedName(name);
    const next = medications.filter((item) => toMedName(item) !== target);
    await saveMedications(next, '약물을 삭제했어요');
  };

  const commitSelected = async () => {
    const currentList = medications.map(toMedName);
    const next = [...currentList, ...selected.map(toMedName).filter((name) => !currentList.includes(name))];
    const saved = await saveMedications(next, '복용 약물을 등록했어요');
    if (saved) {
      setSelected([]);
      setQuery('');
      setScreen('manage');
    }
  };

  const toggleSelected = (name) => {
    const target = toMedName(name);
    setSelected((current) =>
      current.includes(target) ? current.filter((item) => item !== target) : [...current, target],
    );
  };

  const confirmRegistration = () => {
    if (pendingDuplicates.length > 0) {
      setScreen('duplicate');
      return;
    }
    commitSelected();
  };

  // ── 폴더형 화면 헤더 ────────────────────────────────────────
  const BackHeader = ({ title, subtitle, onBackClick }) => (
    <header className="page-head page-head--back">
      <button type="button" className="back-btn" onClick={onBackClick} aria-label="뒤로">
        <Icon name="chevron-left" size={22} />
      </button>
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </header>
  );

  // ── No.16 약물 상세 ─────────────────────────────────────────
  if (screen === 'detail' && detailMed) {
    return (
      <>
        <BackHeader
          title="약물 상세"
          subtitle="약물 이름과 주의사항을 확인하세요"
          onBackClick={() => setScreen('search')}
        />
        <div className="med-detail-head">
          <h2>{detailMed.name}</h2>
          <p>{detailMed.category}</p>
        </div>

        <span className="field-label">약물 성분</span>
        <div className="ingredient-box">{detailMed.ingredients.join(', ')}</div>

        <div className="warning-box warning-box--soft">
          <div className="warning-title">
            <Icon name="alert" size={17} />
            <strong>약물별 주의사항</strong>
          </div>
          <p>{detailMed.caution}</p>
        </div>

        <p className="helper">복용 중인 다른 약물과 성분이 겹치지 않는지 꼭 확인해 주세요.</p>

        <div className="bottom-cta">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              if (!selected.includes(detailMed.name)) {
                setSelected((current) => [...current, detailMed.name]);
              }
              setScreen('search');
            }}
          >
            {selected.includes(detailMed.name) ? '선택한 약물이에요' : '이 약물 선택하기'}
          </button>
        </div>
      </>
    );
  }

  // ── No.17 약물 등록 확인 ────────────────────────────────────
  if (screen === 'confirm') {
    return (
      <>
        <BackHeader
          title="약물 등록 확인"
          subtitle="선택한 약물을 한 번 더 확인하세요"
          onBackClick={() => setScreen('search')}
        />
        <h2 className="section-count">추가할 약물 <strong>{selected.length}개</strong></h2>
        <div className="med-list">
          {selected.map((name) => {
            const med = findMedication(name);
            return (
              <article key={name} className="med-card">
                <div>
                  <strong>{med?.name ?? name}</strong>
                  <small>{med?.category ?? '직접 입력한 약물'}</small>
                  {med && <em className="med-caution"><Icon name="alert" size={12} /> {med.caution}</em>}
                </div>
              </article>
            );
          })}
        </div>

        <div className="info-banner info-banner--gray">
          <div>
            <strong>약물 이름과 주의사항을 확인했나요?</strong>
            <p>등록 후 복용 약물 관리에서 언제든 수정할 수 있어요.</p>
          </div>
        </div>

        <div className="bottom-cta">
          <button type="button" className="btn btn-primary" onClick={confirmRegistration} disabled={isSaving}>
            {isSaving ? '등록 중...' : '약물 등록하기'}
          </button>
        </div>
      </>
    );
  }

  // ── No.18 성분 중복 주의 ────────────────────────────────────
  if (screen === 'duplicate') {
    return (
      <>
        <BackHeader
          title="성분 중복 주의"
          subtitle="등록한 약물과 성분이 겹쳐요"
          onBackClick={() => setScreen('confirm')}
        />
        <div className="warning-hero">
          <Icon name="alert" size={30} />
          <strong>성분 중복 주의</strong>
          <p>중복되는 성분을 확인해 주세요.</p>
        </div>

        <h2 className="section-count">성분이 겹치는 약물</h2>
        <div className="duplicate-list">
          {pendingDuplicates.map((group) => (
            <article key={group.ingredient} className="duplicate-card">
              <div className="duplicate-top">
                <span className="med-icon"><Icon name="pill" size={18} /></span>
                <div>
                  <strong>{group.ingredient}</strong>
                  <small>중복 성분</small>
                </div>
              </div>
              <p>{group.meds.join(' · ')}</p>
            </article>
          ))}
        </div>

        <div className="ingredient-note">
          <span>중복 성분</span>
          <strong>{pendingDuplicates.map((group) => group.ingredient).join(', ')}</strong>
        </div>

        <div className="bottom-cta">
          <button type="button" className="btn btn-primary" onClick={commitSelected} disabled={isSaving}>
            {isSaving ? '등록 중...' : '확인하고 약물 관리로 돌아가기'}
          </button>
        </div>
      </>
    );
  }

  // ── No.15 약물 검색 ─────────────────────────────────────────
  if (screen === 'search') {
    return (
      <>
        <BackHeader
          title="약물 검색"
          subtitle="약물 이름의 일부를 입력해 검색할 수 있어요"
          onBackClick={() => {
            setScreen('manage');
            setQuery('');
            setSelected([]);
          }}
        />

        <div className="input-wrap med-search">
          <input
            className="input has-icon-left"
            placeholder="검색어 예시) 다이"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoFocus
          />
          <span className="input-icon-left"><Icon name="search" size={18} /></span>
          {query && (
            <button type="button" className="input-icon-btn" aria-label="검색어 지우기" onClick={() => setQuery('')}>
              <Icon name="close" size={17} />
            </button>
          )}
        </div>

        {isSearching && (
          <div className="search-loading" role="status">
            <span className="spinner spinner--lg" />
            <p>약물을 검색하고 있어요</p>
          </div>
        )}

        {!isSearching && query.trim() && (
          <p className="search-result-count">
            ‘{query.trim()}’이 포함된 약물 {results.length}개
          </p>
        )}

        {!isSearching && (
          <div className="result-list">
            {results.map((med) => {
              const isSelected = selected.includes(med.name);
              return (
                <article
                  key={med.id}
                  className={`result-row result-row--search ${isSelected ? 'selected' : ''}`}
                >
                  <button type="button" className="result-main" onClick={() => {
                    setDetailMed(med);
                    setScreen('detail');
                  }}>
                    <strong>{med.name}</strong>
                    <small>{med.ingredients.join(', ')}</small>
                    <em><Icon name="alert" size={12} /> 주의사항 내용 ({med.caution})</em>
                  </button>
                  <button
                    type="button"
                    className={`result-select ${isSelected ? 'is-on' : ''}`}
                    onClick={() => toggleSelected(med.name)}
                  >
                    {isSelected ? '✓ 선택됨' : '+ 선택'}
                  </button>
                </article>
              );
            })}
          </div>
        )}

        {!isSearching && !query.trim() && (
          <div className="empty-state">
            <span className="empty-icon"><Icon name="search" size={24} /></span>
            <strong>약물 이름을 검색해 보세요</strong>
            <p>‘다이’처럼 이름의 일부만 입력해도<br />관련 약물을 찾을 수 있어요.</p>
          </div>
        )}

        {!isSearching && query.trim() && results.length === 0 && (
          <div className="empty-state">
            <strong>검색 결과가 없어요</strong>
            <p>약물 이름의 일부를 다시 입력해 주세요.</p>
          </div>
        )}

        <div className="bottom-cta">
          <button
            type="button"
            className="btn btn-primary"
            disabled={selected.length === 0}
            onClick={() => setScreen('confirm')}
          >
            선택한 약물 등록 {selected.length ? `(${selected.length})` : ''}
          </button>
        </div>
      </>
    );
  }

  // ── No.14 복용 약물 관리 ────────────────────────────────────
  return (
    <>
      <header className="page-head page-head--back">
        <button type="button" className="back-btn" onClick={onBack} aria-label="뒤로">
          <Icon name="chevron-left" size={22} />
        </button>
        <div>
          <h1>복용 약물 관리</h1>
          <p>등록한 약물을 확인하고 관리하세요</p>
        </div>
      </header>

      {duplicateGroups.length > 0 && (
        <div className="warning-box">
          <div className="warning-title">
            <Icon name="alert" size={18} />
            <strong>성분 중복 주의</strong>
          </div>
          <p>중복되는 성분을 확인해 주세요.</p>
          <ul className="duplicate-chips">
            {duplicateGroups.map((group) => (
              <li key={group.ingredient}>
                <strong>{group.ingredient}</strong>
                <span>{group.meds.join(' · ')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <h2 className="section-count">등록한 약물 <strong>{medications.length}개</strong></h2>

      <div className="med-list">
        {medications.map((item) => {
          const name = toMedName(item);
          const med = findMedication(name);
          return (
            <article key={name} className="med-card">
              <div>
                <strong>{name}</strong>
                <small>{med?.category ?? '직접 입력한 약물'}</small>
                {med && (
                  <em className="med-caution">
                    <Icon name="alert" size={12} /> 주의사항 내용 ({med.caution})
                  </em>
                )}
              </div>
              <button type="button" className="danger-link" onClick={() => removeMedication(name)}>
                삭제
              </button>
            </article>
          );
        })}
      </div>

      {medications.length === 0 && (
        <div className="empty-state compact">
          <span className="empty-icon"><Icon name="pill" size={24} /></span>
          <strong>등록된 약물이 없어요</strong>
          <p>복용 중인 약물이 있다면 검색해 등록해 주세요.</p>
        </div>
      )}

      <button
        type="button"
        className="btn btn-ghost med-add-allergy"
        onClick={() => {
          setSelected([]);
          setQuery('');
          setScreen('search');
        }}
      >
        <Icon name="plus" size={17} /> 약물 추가하기
      </button>

      {notice && <p className="form-message">{notice}</p>}

      <div className="bottom-cta">
        <button
          type="button"
          className="btn btn-primary"
          disabled={isSaving}
          onClick={async () => {
            const saved = await saveMedications(medications, '복용 약물 정보를 저장했어요');
            if (saved) setNotice('저장되었어요.');
          }}
        >
          {isSaving ? '저장 중...' : '저장하기'}
        </button>
      </div>
    </>
  );
}
