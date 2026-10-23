import React, { useState } from 'react';
import { PageHeader } from './common';

// no.15 알레르기 직접 입력 (Figma 204-706)
function AllergyCustomPage({ draftItems, onBack, onAdd }) {
  const [name, setName] = useState('');
  const [notice, setNotice] = useState('');

  const handleAdd = (event) => {
    event.preventDefault();
    const value = name.trim();
    if (!value) return setNotice('알레르기 이름을 입력해 주세요.');
    if (draftItems.includes(value)) return setNotice('이미 선택한 알레르기예요.');
    onAdd(value);
  };

  return (
    <form className="mp-page mp-form" onSubmit={handleAdd}>
      <PageHeader title="알레르기 직접 입력" subtitle="목록에 없는 항목을 직접 추가하세요" onBack={onBack} />

      <label className="mp-section-title mp-section-first" htmlFor="mp-custom-allergy">알레르기 이름</label>
      <input
        id="mp-custom-allergy"
        className="mp-input mp-input-large"
        placeholder="고양이 털"
        value={name}
        onChange={(e) => { setName(e.target.value); setNotice(''); }}
      />

      <section className="mp-gray-box mp-gap-top">
        <strong>현재 선택한 알레르기</strong>
        <span>{draftItems.length > 0 ? draftItems.join(' · ') : '아직 선택한 알레르기가 없어요'}</span>
      </section>
      <p className="mp-subtitle">추가한 항목도 언제든 수정하거나 삭제할 수 있어요.</p>

      {notice && <p className="mp-notice" role="status">{notice}</p>}
      <div className="mp-bottom-actions">
        <button type="submit" className="mp-primary-button">이 항목 추가하기</button>
      </div>
    </form>
  );
}

export default AllergyCustomPage;
