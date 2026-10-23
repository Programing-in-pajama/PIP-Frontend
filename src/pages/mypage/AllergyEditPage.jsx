import React, { useState } from 'react';
import { PageHeader } from './common';
import { ALLERGEN_GROUPS, ALLERGEN_LIST, ALLERGEN_COUNT } from '../../data/allergens';

// no.14 알레르기 수정 (Figma 210-270 있어요 / 204-727 없어요)
// draft = { hasAllergy: boolean, items: string[] } — 저장하기 전까지 임시로 고르는 값
// onChange 는 setState 처럼 (현재값 => 새값) 함수를 받아요
function AllergyEditPage({ draft, onChange, onBack, onCustom, onSave, isLoading }) {
  const [notice, setNotice] = useState('');
  const customItems = draft.items.filter((name) => !ALLERGEN_LIST.includes(name));

  const toggle = (name) => {
    setNotice('');
    // 항상 최신 값 기준으로 계산 (빠르게 여러 개 눌러도 선택이 사라지지 않게)
    onChange((current) => ({
      ...current,
      items: current.items.includes(name) ? current.items.filter((item) => item !== name) : [...current.items, name],
    }));
  };

  const handleSave = () => {
    if (draft.hasAllergy && draft.items.length === 0) {
      return setNotice('알레르기를 하나 이상 선택하거나 "없어요"를 눌러 주세요.');
    }
    onSave(draft.hasAllergy ? draft.items : []);
  };

  const options = [
    { value: true, label: '있어요' },
    { value: false, label: '없어요' },
  ];

  return (
    <div className="mp-page mp-form">
      <PageHeader
        title="알레르기 수정"
        subtitle={draft.hasAllergy ? '식품 알레르기를 선택하고 저장하세요' : '알레르기 여부를 알려주세요'}
        onBack={onBack}
      />

      <h2 className="mp-section-title mp-section-first">알레르기가 있나요?</h2>
      <div className="mp-toggle-row">
        {options.map((option) => {
          const selected = draft.hasAllergy === option.value;
          return (
            <button
              key={option.label}
              type="button"
              className={`mp-toggle ${selected ? 'selected' : ''}`}
              aria-pressed={selected}
              onClick={() => { setNotice(''); onChange((current) => ({ ...current, hasAllergy: option.value })); }}
            >
              <span>{option.label}</span>
              <span className="mp-mark" aria-hidden="true">{selected ? '✓' : '+'}</span>
            </button>
          );
        })}
      </div>

      {draft.hasAllergy ? (
        <>
          <h2 className="mp-section-title">식품 알레르기 {ALLERGEN_COUNT}종</h2>
          <p className="mp-subtitle mp-subtitle-tight">해당하는 항목을 모두 선택해 주세요.</p>

          {ALLERGEN_GROUPS.map((group) => (
            <section key={group.id} className="mp-chip-group">
              <h3>{group.name} · {group.items.length}종</h3>
              <div className="mp-chip-grid">
                {group.items.map((item) => (
                  <ChipButton key={item.name} label={item.name} sub={item.sub} selected={draft.items.includes(item.name)} onClick={() => toggle(item.name)} />
                ))}
              </div>
            </section>
          ))}

          {customItems.length > 0 && (
            <section className="mp-chip-group">
              <h3>직접 입력 · {customItems.length}종</h3>
              <div className="mp-chip-grid">
                {customItems.map((name) => (
                  <ChipButton key={name} label={name} selected onClick={() => toggle(name)} />
                ))}
              </div>
            </section>
          )}

          <button type="button" className="mp-outline-button mp-wide" onClick={onCustom}>+ 목록에 없는 항목 직접 입력</button>
          <p className="mp-selected-summary">
            선택한 항목 {draft.items.length}개{draft.items.length > 0 ? ` · ${draft.items.join(', ')}` : ''}
          </p>
        </>
      ) : (
        <section className="mp-green-box">
          <strong>등록할 알레르기가 없어요</strong>
          <span>「없어요」로 저장할 수 있어요.<br />정보가 바뀌면 마이페이지에서 수정해 주세요.</span>
        </section>
      )}

      {notice && <p className="mp-notice" role="status">{notice}</p>}
      <div className="mp-bottom-actions">
        <button type="button" className="mp-primary-button" disabled={isLoading} onClick={handleSave}>
          {isLoading ? '저장 중...' : draft.hasAllergy ? '선택한 알레르기 저장하기' : '저장'}
        </button>
      </div>
    </div>
  );
}

function ChipButton({ label, sub, selected, onClick }) {
  return (
    <button type="button" className={`mp-chip ${selected ? 'selected' : ''}`} aria-pressed={selected} onClick={onClick}>
      <span className="mp-chip-text">
        <span>{label}</span>
        {sub && <small>{sub}</small>}
      </span>
      <span className="mp-mark" aria-hidden="true">{selected ? '✓' : '+'}</span>
    </button>
  );
}

export default AllergyEditPage;
