import React, { useState } from 'react';
import { PencilIcon } from './common';
import { formatBirthDateInput, isValidBirthDate } from '../../utils/date';

// N0.11 회원정보 수정 (Figma 166-680)
// 변수: name(이름 입력값), birthDate(생년월일 — DB birth_date), isLoading
function ProfileEditPage({ profile, isLoading, onSave }) {
  const [name, setName] = useState(profile.userName ?? '');
  const [birthDate, setBirthDate] = useState(profile.birthDate ?? '');
  const [notice, setNotice] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!name.trim()) return setNotice('이름을 입력해 주세요.');
    if (birthDate && !isValidBirthDate(birthDate)) return setNotice('생년월일을 8자리 숫자로 정확히 입력해 주세요. (예: 20070305)');
    onSave({ userName: name.trim(), birthDate });
  };

  return (
    <form className="mp-page mp-form" onSubmit={handleSubmit}>
      <h1 className="mp-title mp-title-left">회원정보 수정</h1>
      <p className="mp-subtitle">저장한 회원정보를 수정할 수 있어요</p>

      <label className="mp-input-wrap">
        <span className="visually-hidden">이름</span>
        <input
          className="mp-input"
          placeholder="이름"
          autoComplete="name"
          value={name}
          onChange={(e) => { setName(e.target.value); setNotice(''); }}
        />
        <PencilIcon />
      </label>

      <label className="mp-input-wrap">
        <span className="visually-hidden">생년월일</span>
        <input
          className="mp-input"
          placeholder="생년월일"
          type="text"
          inputMode="numeric"
          maxLength={10}
          value={birthDate}
          onChange={(e) => { setBirthDate(formatBirthDateInput(e.target.value)); setNotice(''); }}
        />
        <PencilIcon />
      </label>

      {notice && <p className="mp-notice" role="status">{notice}</p>}

      <div className="mp-bottom-actions">
        <button type="submit" className="mp-primary-button" disabled={isLoading}>
          {isLoading ? '저장 중...' : '저장'}
        </button>
      </div>
    </form>
  );
}

export default ProfileEditPage;
