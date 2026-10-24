import React, { useEffect, useMemo, useState } from 'react';
import Icon from '../components/Icons';
import SoyoMap from '../components/SoyoMap';
import { REGIONS } from '../data/routes';
import { formatDistance } from '../utils/format';
import {
  createPinFolder,
  deletePinFolder,
  DEFAULT_FOLDER_ID,
  getPinFolders,
  removeRoutePin,
  reorderPins,
} from '../api/pins';

const SORT_OPTIONS = [
  { value: 'latest', label: '최신순' },
  { value: 'distance', label: '거리순' },
  { value: 'duration', label: '소요시간순' },
  { value: 'custom', label: '커스텀' },
];

const FILTER_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'with', label: '식당 포함' },
  { value: 'without', label: '식당 미포함' },
];

export default function PinsPage({ isLoggedIn, userId, onRequireLogin, onStartRoute }) {
  const [folders, setFolders] = useState(() => (isLoggedIn ? getPinFolders(userId) : []));
  const [view, setView] = useState('list'); // list | folder | create | confirm
  const [folderId, setFolderId] = useState(null);
  const [sort, setSort] = useState('latest');
  const [filter, setFilter] = useState('all');
  const [selectedPinId, setSelectedPinId] = useState(null);
  const [confirmPin, setConfirmPin] = useState(null);
  const [confirmDeleteFolder, setConfirmDeleteFolder] = useState(false);
  const [dragId, setDragId] = useState(null);
  const [toast, setToast] = useState('');
  const [folderName, setFolderName] = useState('');
  const [folderError, setFolderError] = useState('');

  useEffect(() => {
    setFolders(isLoggedIn ? getPinFolders(userId) : []);
    setView('list');
    setFolderId(null);
  }, [isLoggedIn, userId]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  const activeFolder = folders.find((folder) => folder.id === folderId) ?? null;

  const visiblePins = useMemo(() => {
    if (!activeFolder) return [];
    let pins = [...activeFolder.pins];
    if (filter === 'with') pins = pins.filter((pin) => pin.hasRestaurant);
    if (filter === 'without') pins = pins.filter((pin) => !pin.hasRestaurant);

    if (sort === 'latest') {
      pins.sort((a, b) => new Date(b.savedAt ?? 0) - new Date(a.savedAt ?? 0));
    } else if (sort === 'duration') {
      pins.sort((a, b) => a.durationMin - b.durationMin);
    } else if (sort === 'distance') {
      const distanceOf = (pin) =>
        REGIONS.find((region) => region.id === pin.regionId)?.distanceKm ?? 9;
      pins.sort((a, b) => distanceOf(a) - distanceOf(b));
    }
    return pins;
  }, [activeFolder, filter, sort]);

  const openFolder = (folder) => {
    setFolderId(folder.id);
    setSort('latest');
    setFilter('all');
    setSelectedPinId(null);
    setConfirmDeleteFolder(false);
    setView('folder');
  };

  const deletePin = (pin) => {
    if (!activeFolder) return;
    setFolders(removeRoutePin(userId, activeFolder.id, pin.id));
    setSelectedPinId(null);
    setToast('핀을 삭제했어요');
  };

  const deleteFolder = () => {
    if (!activeFolder) return;
    const name = activeFolder.name;
    setFolders(deletePinFolder(userId, activeFolder.id));
    setConfirmDeleteFolder(false);
    setFolderId(null);
    setView('list');
    setToast(`‘${name}’ 폴더를 삭제했어요`);
  };

  const handleDrop = (targetPin) => {
    if (sort !== 'custom' || !dragId || !activeFolder || dragId === targetPin.id) return;
    const fromIndex = activeFolder.pins.findIndex((pin) => pin.id === dragId);
    const toIndex = activeFolder.pins.findIndex((pin) => pin.id === targetPin.id);
    const next = reorderPins(userId, activeFolder.id, fromIndex, toIndex);
    setFolders(next);
    setDragId(null);
    setToast('순서를 변경했어요');
  };

  const createFolder = (event) => {
    event.preventDefault();
    const trimmed = folderName.trim();
    if (!trimmed) return setFolderError('폴더 이름을 입력해 주세요.');
    if (folders.some((folder) => folder.name === trimmed)) {
      return setFolderError('같은 이름의 폴더가 이미 있어요.');
    }
    const folder = createPinFolder(userId, trimmed);
    if (!folder) return setFolderError('폴더를 만들지 못했어요.');
    setFolders(getPinFolders(userId));
    setFolderName('');
    setFolderError('');
    setView('list');
    setToast(`‘${folder.name}’ 폴더를 만들었어요`);
  };

  // ── No.15 비회원 핀 화면 ────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <div className="screen screen--map">
        <SoyoMap className="map-fill map-fill--faded" />
        <section className="map-sheet pin-sheet pin-sheet--locked">
          <div className="sheet-grip" />
          <h1 className="pin-title">내 핀</h1>
          <div className="pin-locked-area">
            <button type="button" className="login-required-box" onClick={onRequireLogin}>
              <strong>로그인이 필요합니다</strong>
              <span>이 안내를 누르면 로그인 화면으로 이동합니다.</span>
            </button>
          </div>
        </section>
      </div>
    );
  }

  // ── No.22 새 폴더 만들기 ────────────────────────────────────
  if (view === 'create') {
    return (
      <div className="screen page">
        <header className="page-head page-head--back">
          <button type="button" className="back-btn" onClick={() => setView('list')} aria-label="뒤로">
            <Icon name="chevron-left" size={22} />
          </button>
          <div>
            <h1>새 폴더 만들기</h1>
            <p>산책 코스를 모을 폴더 이름을 입력하세요</p>
          </div>
        </header>

        <form className="folder-form" onSubmit={createFolder}>
          <label className="field-label" htmlFor="folder-name">폴더 이름</label>
          <div className="input-wrap">
            <input
              id="folder-name"
              className="input has-icon"
              placeholder="예: 주말 산책"
              value={folderName}
              onChange={(event) => {
                setFolderName(event.target.value);
                setFolderError('');
              }}
              autoFocus
            />
            <span className="input-icon-static"><Icon name="search" size={18} /></span>
          </div>
          {folderError && <p className="form-message">{folderError}</p>}
          <p className="helper">언제든 폴더에 마음에 드는 코스를 저장할 수 있어요.</p>
        </form>

        <div className="bottom-cta">
          <button type="button" className="btn btn-primary" onClick={createFolder}>
            저장
          </button>
        </div>
      </div>
    );
  }

  // ── No.21 저장 경로 시작 확인 ───────────────────────────────
  if (view === 'confirm' && confirmPin) {
    return (
      <div className="screen screen--map">
        <SoyoMap route={confirmPin} className="map-fill" />
        <div className="map-top map-top--compact">
          <button type="button" className="map-round" onClick={() => setView('folder')} aria-label="뒤로">
            <Icon name="chevron-left" size={21} />
          </button>
        </div>
        <section className="map-sheet start-sheet">
          <h2>해당 경로를 시작하시겠습니까?</h2>
          <div className="start-summary">
            <strong>{confirmPin.title}</strong>
            <span>
              약 {confirmPin.durationMin}분 · {confirmPin.hasRestaurant ? '식당 포함' : '산책만'}
            </span>
            <span>
              내 위치에서 {formatDistance(
                REGIONS.find((region) => region.id === confirmPin.regionId)?.distanceKm ?? 0.8,
              )} 떨어져 있어요
            </span>
          </div>
          <div className="stack-8">
            <button type="button" className="btn btn-primary" onClick={() => onStartRoute(confirmPin)}>
              경로 시작
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setView('folder')}>
              취소
            </button>
          </div>
        </section>
      </div>
    );
  }

  // ── No.20 폴더 상세 ─────────────────────────────────────────
  if (view === 'folder' && activeFolder) {
    return (
      <div className="screen page">
        <header className="page-head page-head--back">
          <button type="button" className="back-btn" onClick={() => setView('list')} aria-label="뒤로">
            <Icon name="chevron-left" size={22} />
          </button>
          <div className="page-head-text">
            <h1>{activeFolder.name}</h1>
            <p>저장한 코스 {activeFolder.pins.length}개</p>
          </div>
          {/* 기본 '내 핀' 폴더는 핀 저장 기본 위치라 삭제 버튼을 숨김 */}
          {activeFolder.id !== DEFAULT_FOLDER_ID && (
            <button type="button" className="danger-link folder-delete" onClick={() => setConfirmDeleteFolder(true)}>
              폴더 삭제
            </button>
          )}
        </header>

        <div className="control-row">
          <label className="select-pill">
            <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="정렬 기준">
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <Icon name="chevron-down" size={15} />
          </label>

          <label className={`select-pill ${filter !== 'all' ? 'is-active' : ''}`}>
            <select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="필터 기준">
              {FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <Icon name="chevron-down" size={15} />
          </label>
        </div>

        {sort === 'custom' && (
          <p className="helper custom-hint">커스텀 정렬에서는 카드를 끌어 순서를 바꿀 수 있어요.</p>
        )}

        <div className="pin-list">
          {visiblePins.map((pin) => {
            const distance = REGIONS.find((region) => region.id === pin.regionId)?.distanceKm ?? 0.8;
            const selected = selectedPinId === pin.id;
            return (
              <article
                key={pin.id}
                className={`pin-card ${selected ? 'is-selected' : ''}`}
                draggable={sort === 'custom'}
                onDragStart={() => setDragId(pin.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => handleDrop(pin)}
              >
                <button
                  type="button"
                  className="pin-card-main"
                  onClick={() => setSelectedPinId(pin.id)}
                >
                  <strong>{pin.title}</strong>
                  <span className="pin-meta">
                    내 위치에서 {formatDistance(distance)} · 약 {pin.durationMin}분
                  </span>
                  <span className="pin-sub">
                    {pin.hasRestaurant ? '식당 포함' : '산책만'} · {pin.roadType?.split(' · ')[0]}
                  </span>
                </button>

                {sort === 'custom' && <span className="drag-handle" aria-hidden="true"><Icon name="grip" size={18} /></span>}
                <button
                  type="button"
                  className="danger-link"
                  onClick={(event) => {
                    event.stopPropagation();
                    deletePin(pin);
                  }}
                >
                  삭제
                </button>
              </article>
            );
          })}

          {visiblePins.length === 0 && (
            <div className="empty-state">
              <span className="empty-icon"><Icon name="pin" size={24} /></span>
              <strong>저장된 코스가 없어요</strong>
              <p>마음에 드는 경로의 북마크 아이콘을 눌러<br />이 폴더에 저장해 보세요.</p>
            </div>
          )}
        </div>

        <p className="list-hint">저장 코스를 선택하면 산책을 시작할 수 있어요</p>

        <div className="bottom-cta">
          <button
            type="button"
            className="btn btn-primary"
            disabled={!selectedPinId}
            onClick={() => {
              const pin = visiblePins.find((item) => item.id === selectedPinId);
              if (!pin) return;
              setConfirmPin(pin);
              setView('confirm');
            }}
          >
            저장 코스 선택
          </button>
        </div>

        {confirmDeleteFolder && (
          <div className="pin-dialog-backdrop" role="presentation" onClick={() => setConfirmDeleteFolder(false)}>
            <section
              className="pin-dialog"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="folder-delete-title"
              onClick={(event) => event.stopPropagation()}
            >
              <h2 id="folder-delete-title">폴더를 삭제할까요?</h2>
              <strong>{activeFolder.name}</strong>
              <p>
                {activeFolder.pins.length > 0
                  ? `폴더 안의 저장 코스 ${activeFolder.pins.length}개도 함께 삭제돼요.`
                  : '삭제한 폴더는 되돌릴 수 없어요.'}
              </p>
              <div className="pin-dialog-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setConfirmDeleteFolder(false)}>취소</button>
                <button type="button" className="btn btn-primary" onClick={deleteFolder}>삭제</button>
              </div>
            </section>
          </div>
        )}

        {toast && <div className="toast">{toast}</div>}
      </div>
    );
  }

  // ── No.19 핀 폴더 목록 ──────────────────────────────────────
  return (
    <div className="screen screen--map">
      <SoyoMap className="map-fill map-fill--faded" />
      <section className="map-sheet pin-sheet">
        <div className="sheet-grip" />
        <h1 className="pin-title">내 핀</h1>

        <div className="folder-list">
          {folders.map((folder) => (
            <button key={folder.id} type="button" className="folder-row" onClick={() => openFolder(folder)}>
              <span className="folder-icon"><Icon name="bookmark" size={18} /></span>
              <span className="folder-text">
                <strong>{folder.name}</strong>
                <small>저장 코스 {folder.pins.length}개</small>
              </span>
              <Icon name="chevron-right" size={18} />
            </button>
          ))}
        </div>

        <button
          type="button"
          className="btn btn-ghost folder-add"
          onClick={() => {
            setFolderName('');
            setFolderError('');
            setView('create');
          }}
        >
          <Icon name="plus" size={17} /> 새 폴더 만들기
        </button>
      </section>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
