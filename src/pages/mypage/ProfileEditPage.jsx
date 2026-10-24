import React, { useState } from 'react';
import BirthDateInput from '../../components/BirthDateInput';
import Icon from '../../components/Icons';
import { isValidBirthDate } from '../../utils/format';

export default function ProfileEditPage({ profile = {}, isLoading, onSave, onBack }) {
  const [name, setName] = useState(profile?.userName ?? '');
  const [birthDate, setBirthDate] = useState(profile?.birthDate ?? '');
  const [notice, setNotice] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!name.trim()) return setNotice('이름을 입력해 주세요.');
    if (!isValidBirthDate(birthDate)) {
      return setNotice('생년월일 8자리를 정확히 입력해 주세요. (예: 20070305)');
    }
    onSave({ userName: name.trim(), birthDate });
  };

  return (
    <>
      <header className="page-head page-head--back">
        <button type="button" className="back-btn" onClick={onBack} aria-label="뒤로">
          <Icon name="chevron-left" size={22} />
        </button>
        <div>
          <h1>회원정보 수정</h1>
          <p>저장된 회원정보를 수정할 수 있어요</p>
        </div>
      </header>

      <form className="mp-form" onSubmit={handleSubmit}>
        <label className="input-wrap">
          <span className="visually-hidden">이름</span>
          <input
            className="input has-icon"
            placeholder="이름"
            autoComplete="name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setNotice('');
            }}
          />
          <span className="input-icon-static"><Icon name="edit" size={17} /></span>
        </label>

        <label className="input-wrap">
          <span className="visually-hidden">생년월일</span>
          <BirthDateInput
            className="input has-icon"
            value={birthDate}
            onChange={(value) => {
              setBirthDate(value);
              setNotice('');
            }}
          />
          <span className="input-icon-static"><Icon name="edit" size={17} /></span>
        </label>
        <p className="input-hint">숫자 8자리로 입력하면 2007-03-05 형식으로 바뀌어요.</p>

        {notice && <p className="form-message" role="status">{notice}</p>}

        <div className="mp-form-spacer" />
        <button type="submit" className="btn btn-primary" disabled={isLoading}>
          {isLoading ? '저장 중...' : '저장'}
        </button>
      </form>
    </>
  );
}
