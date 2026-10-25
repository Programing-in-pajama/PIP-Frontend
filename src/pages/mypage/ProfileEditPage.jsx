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
      return setNotice('생년월일을 달력에서 다시 선택해 주세요.');
    }
    onSave({ userName: name.trim(), birthDate });
  };

  return (
    <>
      <header className="page-head page-head--back" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button type="button" className="back-btn" onClick={onBack} aria-label="뒤로">
            <Icon name="chevron-left" size={22} />
          </button>
          <div>
            <h1>회원정보 수정</h1>
            <p>저장된 회원정보를 수정할 수 있어요</p>
          </div>
        </div>
        <button
          type="button"
          className="pill-btn pill-btn--dark"
          onClick={handleSubmit}
          disabled={isLoading}
          style={{ minWidth: '60px', height: '36px', fontSize: '13px', fontWeight: 700 }}
        >
          {isLoading ? '저장 중' : '저장'}
        </button>
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
        <p className="input-hint">칸을 누르면 달력이 열려요.</p>

        {notice && <p className="form-message" role="status">{notice}</p>}

        <div style={{ marginTop: '28px', marginBottom: '40px' }}>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={isLoading}>
            {isLoading ? '저장 중...' : '회원정보 저장하기'}
          </button>
        </div>
      </form>
    </>
  );
}
