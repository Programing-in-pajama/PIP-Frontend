import React, { useEffect, useState } from 'react';
import Icon from '../../components/Icons';
import { ALLERGEN_CATEGORIES, getAllergen } from '../../data/allergens';

export default function AllergyFlow({ profile = {}, onSave, onBack }) {
  const [screen, setScreen] = useState('manage');
  const [allergies, setAllergies] = useState(profile?.allergies ?? []);

  useEffect(() => {
    setAllergies(profile?.allergies ?? []);
  }, [profile?.allergies]);

  const deleteAllergy = async (name) => {
    const next = allergies.filter((item) => item !== name);
    setAllergies(next);
    await onSave({ allergies: next });
  };

  if (screen === 'edit') {
    return (
      <AllergyEditor
        initial={allergies}
        onBack={() => setScreen('manage')}
        onSave={async (next) => {
          setAllergies(next);
          const saved = await onSave({ allergies: next });
          if (saved) setScreen('manage');
        }}
      />
    );
  }

  return (
    <>
      <header className="page-head page-head--back">
        <button type="button" className="back-btn" onClick={onBack} aria-label="뒤로">
          <Icon name="chevron-left" size={22} />
        </button>
        <div className="page-head-text">
          <h1>알레르기 관리</h1>
          <p>등록한 알레르기를 확인하고 관리하세요</p>
        </div>
        <img src="/pic/SOYO.png" alt="SOYO" className="head-logo" />
      </header>

      <div className={`allergy-summary ${allergies.length ? 'has-allergy' : ''}`}>
        <strong>{allergies.length ? '알레르기가 있어요' : '등록한 알레르기가 없어요'}</strong>
        <p>
          {allergies.length
            ? '해당하는 항목을 추가하거나 삭제할 수 있어요.'
            : '알레르기가 없다면 그대로 저장할 수 있어요.'}
        </p>
      </div>

      <h2 className="section-count">
        등록한 알레르기 <strong>{allergies.length}개</strong>
      </h2>

      <div className="allergy-list">
        {allergies.map((name) => {
          const allergen = getAllergen(name);
          return (
            <article key={name} className="allergy-card">
              <div>
                <strong>{name}</strong>
                <small>{allergen?.note ?? '직접 입력'}</small>
              </div>
              <button type="button" className="danger-link" onClick={() => deleteAllergy(name)}>
                삭제
              </button>
            </article>
          );
        })}
      </div>

      {allergies.length === 0 && (
        <div className="empty-state compact">
          <strong>등록된 알레르기가 없어요</strong>
          <p>알레르기가 있다면 아래에서 항목을 추가해 주세요.</p>
        </div>
      )}

      <button type="button" className="btn btn-ghost allergy-edit-btn" onClick={() => setScreen('edit')}>
        <Icon name="plus" size={17} /> 알레르기 수정
      </button>
    </>
  );
}

function AllergyEditor({ initial, onSave, onBack }) {
  const [hasAllergy, setHasAllergy] = useState(initial.length > 0);
  const [selected, setSelected] = useState(initial);
  const [customInput, setCustomInput] = useState('');
  const [notice, setNotice] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const toggle = (name) => {
    setHasAllergy(true);
    setNotice('');
    setSelected((current) =>
      current.includes(name) ? current.filter((item) => item !== name) : [...current, name],
    );
  };

  const addCustom = () => {
    const value = customInput.trim();
    if (!value) return;
    if (selected.includes(value)) {
      setNotice('이미 선택한 항목이에요.');
      return;
    }
    setHasAllergy(true);
    setSelected((current) => [...current, value]);
    setCustomInput('');
    setNotice('');
  };

  const submit = async () => {
    if (hasAllergy && selected.length === 0) {
      setNotice('알레르기 항목을 하나 이상 선택해 주세요.');
      return;
    }
    setIsSaving(true);
    await onSave(hasAllergy ? selected : []);
    setIsSaving(false);
  };

  return (
    <>
      <header className="page-head page-head--back">
        <button type="button" className="back-btn" onClick={onBack} aria-label="뒤로">
          <Icon name="chevron-left" size={22} />
        </button>
        <div className="page-head-text">
          <h1>알레르기 수정</h1>
          <p>알레르기 여부를 알려주세요</p>
        </div>
        <img src="/pic/SOYO.png" alt="SOYO" className="head-logo" />
      </header>

      <h2 className="edit-question">알레르기가 있나요?</h2>
      <div className="choice-row">
        <button
          type="button"
          className={`choice ${hasAllergy ? 'selected' : ''}`}
          onClick={() => setHasAllergy(true)}
        >
          있어요 {hasAllergy && <Icon name="check" size={16} />}
        </button>
        <button
          type="button"
          className={`choice ${!hasAllergy ? 'selected' : ''}`}
          onClick={() => setHasAllergy(false)}
        >
          없어요 {!hasAllergy && <Icon name="check" size={16} />}
        </button>
      </div>

      {!hasAllergy ? (
        <div className="allergy-none-box">
          <strong>등록할 알레르기가 없어요</strong>
          <p>‘없어요’로 저장할 수 있어요.<br />정보가 바뀌면 마이페이지에서 수정해 주세요.</p>
        </div>
      ) : (
        <>
          {ALLERGEN_CATEGORIES.map((category) => (
            <section key={category.id} className="allergen-section">
              <h3>{category.group === '식품' ? `식품 · ${category.name}` : category.name} <small>{category.items.length}종</small></h3>
              <div className="allergen-grid allergen-grid--form">
                {category.items.map((item) => {
                  const isSelected = selected.includes(item.name);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`allergen-chip ${isSelected ? 'selected' : ''}`}
                      onClick={() => toggle(item.name)}
                    >
                      <span>
                        {item.name}
                        <small>{item.note}</small>
                      </span>
                      <span className="allergen-mark">{isSelected ? '✓' : '+'}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}

          <section className="custom-allergen">
            <h3>목록에 없는 항목 직접 입력</h3>
            <div className="inline-fields">
              <input
                className="input"
                placeholder="예: 땅콩버터"
                value={customInput}
                onChange={(event) => setCustomInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addCustom();
                  }
                }}
              />
              <button type="button" className="pill-btn pill-btn--light" onClick={addCustom}>추가</button>
            </div>
          </section>

          <p className="selected-summary">
            {selected.length ? `선택한 항목 ${selected.length}개 · ${selected.join(', ')}` : '선택한 항목이 없어요'}
          </p>
        </>
      )}

      {notice && <p className="form-message" role="status">{notice}</p>}

      <div className="bottom-cta">
        <button type="button" className="btn btn-primary" onClick={submit} disabled={isSaving}>
          {isSaving ? '저장 중...' : '선택한 알레르기 저장하기'}
        </button>
      </div>
    </>
  );
}
