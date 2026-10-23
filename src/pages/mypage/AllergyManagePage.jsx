import React, { useState } from 'react';
import { PageHeader, ConfirmModal } from './common';
import { getAllergenCategory } from '../../data/allergens';

// no.13 알레르기 관리 (Figma 204-625) + no.16 알레르기 삭제 확인 (Figma 204-751)
// 변수: allergies
function AllergyManagePage({ profile, onBack, onEdit, onDelete }) {
  const allergies = profile.allergies ?? [];
  const [pendingDelete, setPendingDelete] = useState(null);

  return (
    <div className="mp-page">
      <PageHeader title="알레르기 관리" subtitle="등록한 알레르기를 확인하고 관리하세요" onBack={onBack} />

      {allergies.length > 0 ? (
        <>
          <section className="mp-gray-box">
            <strong>알레르기가 있어요</strong>
            <span>해당되는 항목을 추가하거나 삭제할 수 있어요.</span>
          </section>

          <h2 className="mp-section-title">등록한 알레르기 {allergies.length}개</h2>
          <ul className="mp-card-list">
            {allergies.map((name) => (
              <li key={name} className="mp-item-card mp-allergy-card">
                <span className="mp-item-text">
                  <strong>{name}</strong>
                  <small>{getAllergenCategory(name)}</small>
                </span>
                <button type="button" className="mp-text-button" onClick={() => setPendingDelete(name)}>삭제</button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        // Figma 에 없는 상태 — "알레르기 수정"의 "없어요" 안내 문구를 그대로 사용
        <section className="mp-gray-box">
          <strong>등록할 알레르기가 없어요</strong>
          <span>정보가 바뀌면 아래 버튼으로 수정해 주세요.</span>
        </section>
      )}

      <button type="button" className="mp-outline-button mp-wide" onClick={onEdit}>+ 알레르기 수정</button>

      {pendingDelete && (
        <ConfirmModal
          title="알레르기 항목을 삭제할까요?"
          itemName={pendingDelete}
          description="등록한 알레르기 목록에서 삭제됩니다."
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => { onDelete(pendingDelete); setPendingDelete(null); }}
        />
      )}
    </div>
  );
}

export default AllergyManagePage;
