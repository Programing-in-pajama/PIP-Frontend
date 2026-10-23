import React from 'react';

// 마이페이지 화면들이 같이 쓰는 조각들

// 제목 줄: "‹ 제목" + 설명 (Figma 시안의 뒤로 가기 포함 헤더)
export function PageHeader({ title, subtitle, onBack }) {
  return (
    <header className="mp-header">
      <div className="mp-header-row">
        {onBack && (
          <button type="button" className="mp-back" aria-label="뒤로 가기" onClick={onBack}>‹</button>
        )}
        <h1 className="mp-title mp-title-left">{title}</h1>
      </div>
      {subtitle && <p className="mp-subtitle">{subtitle}</p>}
    </header>
  );
}

// 삭제 확인 팝업 (No.16 알레르기 삭제 · No.19 약물 삭제)
export function ConfirmModal({ title, itemName, description, confirmLabel = '삭제', onCancel, onConfirm }) {
  return (
    <div className="mp-modal-backdrop" role="presentation" onClick={onCancel}>
      <section className="mp-modal" role="alertdialog" aria-modal="true" aria-labelledby="mp-modal-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="mp-modal-title">{title}</h2>
        {itemName && <strong className="mp-modal-item">{itemName}</strong>}
        {description && <p>{description}</p>}
        <div className="mp-modal-actions">
          <button type="button" className="mp-outline-button" onClick={onCancel}>취소</button>
          <button type="button" className="mp-primary-button" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </section>
    </div>
  );
}

// 성분 중복 주의 카드 (No.14 복용 약물 관리 · No.18 성분 중복 주의)
export function DuplicateWarningCard({ children }) {
  return (
    <section className="mp-warning-card" role="alert">
      <strong><WarningIcon /> 성분 중복 주의</strong>
      <span>중복되는 성분을 확인해 주세요.</span>
      {children}
    </section>
  );
}

export function WarningIcon() {
  return (
    <svg className="mp-warning-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 2 21h20L12 3Z" />
      <path d="M12 10v5M12 18v.01" />
    </svg>
  );
}

// 회원정보 수정 입력칸 오른쪽 연필 아이콘 (Figma N0.11)
export function PencilIcon() {
  return (
    <svg className="mp-input-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 20l1.2-4.6L15.8 4.8a1.8 1.8 0 0 1 2.6 0l.8.8a1.8 1.8 0 0 1 0 2.6L8.6 18.8 4 20Z" />
      <path d="M14.5 6.1l3.4 3.4" />
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg className="mp-search-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

export function PillIcon({ large = false }) {
  return (
    <span className={`mp-pill-icon ${large ? 'large' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <rect x="3" y="8" width="18" height="8" rx="4" />
        <path d="M12 8v8" />
      </svg>
    </span>
  );
}

// 약물 카드 안의 주의사항 한 줄 (주황 글씨)
export function CautionLine({ text }) {
  if (!text) return null;
  return <small className="mp-caution"><WarningIcon /> {text}</small>;
}
