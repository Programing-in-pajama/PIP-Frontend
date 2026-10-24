import React from 'react';
import Icon from '../../components/Icons';
import { getDiseaseName } from '../../data/chronicDiseases';
import { formatBirthDateKo } from '../../utils/format';

function MyPage({ profile, isLoggedIn, onNavigate, onLogout, onLogin }) {
  const diseaseNames = (profile?.diseaseIds ?? []).map(getDiseaseName);
  const allergies = profile?.allergies ?? [];
  const medications = profile?.medications ?? [];

  if (!isLoggedIn) {
    return (
      <>
        <header className="mp-head">
          <h1>마이페이지</h1>
        </header>

        <section className="profile-card profile-card--locked" aria-label="내 정보">
          <div className="profile-locked-content" aria-hidden="true">
            <span className="avatar">소</span>
            <div className="profile-text">
              <strong>내 정보</strong>
              <span>soyo@example.com</span>
            </div>
            <span className="status-pill">회원</span>
          </div>
          <button type="button" className="login-required-overlay" onClick={onLogin}>
            <Icon name="lock" size={16} />
            <span>로그인이 필요합니다</span>
          </button>
        </section>

        <h2 className="mp-section-title">내 정보</h2>
        <ul className="menu-list">
          {[
            { id: 'profileEdit', title: '회원정보 수정', desc: '이름 · 생년월일' },
            { id: 'health', title: '건강정보 관리', desc: '알레르기 · 기저질환' },
            { id: 'medications', title: '복용 약물 관리', desc: '등록 약물 0개' },
          ].map((item) => (
            <li key={item.id}>
              <button type="button" className="menu-item menu-item--locked" onClick={onLogin}>
                <span className="menu-text">
                  <strong>{item.title}</strong>
                  <small>{item.desc}</small>
                </span>
                <Icon name="lock" size={16} />
              </button>
            </li>
          ))}
        </ul>
        <p className="mp-guest-note">로그인하면 저장한 핀과 건강정보를 한곳에서 관리할 수 있어요.</p>
      </>
    );
  }

  return (
    <>
      <header className="mp-head">
        <h1>마이페이지</h1>
      </header>

      <section className="profile-card">
        {profile.profileImage ? (
          <img className="avatar" src={profile.profileImage} alt="" />
        ) : (
          <span className="avatar" aria-hidden="true">{profile.userName?.[0] ?? '소'}</span>
        )}
        <div className="profile-text">
          <strong>{profile.userName}</strong>
          <span>{profile.email || '이메일 정보 없음'}</span>
          <small>{formatBirthDateKo(profile.birthDate)}</small>
        </div>
        <button type="button" className="status-pill status-pill--button" onClick={onLogout}>
          로그아웃
        </button>
      </section>

      <h2 className="mp-section-title">내 정보</h2>
      <ul className="menu-list">
        <li>
          <button type="button" className="menu-item" onClick={() => onNavigate('profileEdit')}>
            <span className="menu-text">
              <strong>회원정보 수정</strong>
              <small>이름 · 생년월일</small>
            </span>
            <Icon name="chevron-right" size={18} />
          </button>
        </li>
        <li>
          <button type="button" className="menu-item" onClick={() => onNavigate('health')}>
            <span className="menu-text">
              <strong>건강정보 관리</strong>
              <small>
                {allergies.length || diseaseNames.length
                  ? [
                      allergies.length ? `알레르기 ${allergies.length}개` : null,
                      diseaseNames.length ? `기저질환 ${diseaseNames.length}개` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')
                  : '아직 등록된 정보가 없어요'}
              </small>
            </span>
            <Icon name="chevron-right" size={18} />
          </button>
        </li>
        <li>
          <button type="button" className="menu-item" onClick={() => onNavigate('medications')}>
            <span className="menu-text">
              <strong>복용 약물 관리</strong>
              <small>{medications.length ? `등록 약물 ${medications.length}개` : '등록된 약물이 없어요'}</small>
            </span>
            <Icon name="chevron-right" size={18} />
          </button>
        </li>
      </ul>

      <div className="mp-health-summary">
        <Icon name="leaf" size={18} />
        <p>
          등록한 건강정보는 산책 코스와 식당 추천에 활용돼요.
          {diseaseNames.length > 0 && (
            <>
              <br />
              <span>{diseaseNames.slice(0, 3).join(' · ')}</span>
            </>
          )}
        </p>
      </div>
    </>
  );
}

export default MyPage;
