import React from 'react';
import Icon from './Icons';
import './BottomNav.css';

const TABS = [
  { key: 'pins', label: '핀', icon: 'pin' },
  { key: 'main', label: '홈', icon: 'home' },
  { key: 'mypage', label: '마이페이지', icon: 'user' },
];

function BottomNav({ activeTab, onChange }) {
  return (
    <nav className="bottom-nav" aria-label="하단 메뉴">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={`bottom-nav-item ${activeTab === tab.key ? 'active' : ''}`}
          aria-label={tab.label}
          aria-current={activeTab === tab.key ? 'page' : undefined}
          onClick={() => onChange(tab.key)}
        >
          <Icon name={tab.icon} size={23} />
        </button>
      ))}
    </nav>
  );
}

export default BottomNav;
