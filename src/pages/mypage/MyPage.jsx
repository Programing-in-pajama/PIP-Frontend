import React from 'react';

// No.10 마이페이지 (Figma: 로그인 162-571 / 비로그인 242-488)
// 변수: userName, email, profileImage, isLoggedIn, myMenuItems, medications
function MyPage({ profile, isLoggedIn, onNavigate, onLogout, onLogin }) {
  if (!isLoggedIn) {
    return (
      <div className="mp-page">
        <h1 className="mp-title mp-title-main">마이페이지</h1>
        {/* Figma: "이 안내를 누르면 로그인 화면으로 이동합니다" → 카드 전체를 누르면 로그인 화면으로 */}
        <button type="button" className="mp-profile-card mp-plain-button" onClick={onLogin}>
          <span className="mp-avatar" aria-hidden="true" />
          <span className="mp-profile-text">
            <strong>로그인이 필요합니다</strong>
            <span>이 안내를 누르면 로그인 화면으로 이동합니다.</span>
          </span>
        </button>
      </div>
    );
  }

  const { userName, email, profileImage, medications = [] } = profile;

  const myMenuItems = [
    { id: 'profileEdit', title: '회원정보 수정', description: '이름 · 생년월일' },
    { id: 'healthManage', title: '건강정보 관리', description: '알레르기 · 기저질환' },
    { id: 'medicationManage', title: '복용 약물 관리', description: `등록 약물 ${medications.length}개` },
  ];

  return (
    <div className="mp-page">
      <h1 className="mp-title mp-title-main">마이페이지</h1>

      <section className="mp-profile-card">
        {profileImage
          ? <img className="mp-avatar" src={profileImage} alt="" />
          : <div className="mp-avatar" aria-hidden="true">{userName?.[0] ?? '?'}</div>}
        <div className="mp-profile-text">
          <strong>{userName}</strong>
          <span>{email}</span>
        </div>
        <button type="button" className="mp-pill-button" onClick={onLogout}>로그아웃</button>
      </section>

      <h2 className="mp-section-title">내 정보</h2>
      <ul className="mp-menu">
        {myMenuItems.map((item) => (
          <li key={item.id}>
            <button type="button" className="mp-menu-item" onClick={() => onNavigate(item.id)}>
              <span>
                <strong>{item.title}</strong>
                <small>{item.description}</small>
              </span>
              <span className="mp-chevron" aria-hidden="true">›</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default MyPage;
