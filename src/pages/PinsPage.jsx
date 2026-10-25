import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../components/Icons';
import SoyoMap from '../components/SoyoMap';
import { REGIONS } from '../data/routes';
import { formatDistance } from '../utils/format';
import {
  createPinFolder,
  deletePinFolder,
  DEFAULT_FOLDER_ID,
  fetchPinFolders,
  getPinFolders,
  removeRoutePin,
  reorderPins,
  PIN_UPDATE_EVENT,
} from '../api/pins';

const SORT_OPTIONS = [
  { value: 'latest', label: '최신순' },
  { value: 'distance', label: '거리순' },
  { value: 'duration', label: '소요시간순' },
  { value: 'custom', label: '직접 정렬' },
];

const FILTER_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'with', label: '식당 포함' },
  { value: 'without', label: '식당 미포함' },
];

const formatPinTitle = (title, durationMin) => {
  if (!title) return '';
  const clean = String(title).replace(/\s*\(\d+분\)/g, '').trim();
  return durationMin ? `${clean} (${durationMin}분)` : clean;
};

export default function PinsPage({ isLoggedIn, userId, onRequireLogin, onStartRoute }) {
  const [folders, setFolders] = useState(() => (isLoggedIn ? getPinFolders(userId) : []));
  const [view, setView] = useState('list'); // list | folder | create | confirm
  const [folderId, setFolderId] = useState(null);
  const [sort, setSort] = useState('latest');
  const [filter, setFilter] = useState('all');
  const [selectedPinId, setSelectedPinId] = useState(null);
  const [confirmPin, setConfirmPin] = useState(null);
  const [confirmDeleteFolder, setConfirmDeleteFolder] = useState(false);
  const [confirmDeletePin, setConfirmDeletePin] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [toast, setToast] = useState('');
  const [folderName, setFolderName] = useState('');
  const [folderError, setFolderError] = useState('');
  const cardRefs = useRef(new Map());

  const reloadFolders = useCallback(() => {
    if (!isLoggedIn) {
      setFolders([]);
      return;
    }
    const local = getPinFolders(userId);
    setFolders(local);
    fetchPinFolders(userId)
      .then((res) => {
        if (Array.isArray(res) && res.length > 0) {
          setFolders(res);
        }
      })
      .catch(() => {});
  }, [isLoggedIn, userId]);

  useEffect(() => {
    reloadFolders();
    const handleUpdate = () => {
      if (isLoggedIn) {
        setFolders(getPinFolders(userId));
      }
    };
    window.addEventListener(PIN_UPDATE_EVENT, handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener(PIN_UPDATE_EVENT, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [reloadFolders, isLoggedIn, userId]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  const isPoppingHistoryRef = useRef(false);

  // 브라우저 뒤로가기 시 로그인 화면으로 튕기지 않고 이전 핀 뷰(목록)로 자연스럽게 이동
  useEffect(() => {
    if (view !== 'list') {
      window.history.pushState({ pinView: view }, '');
      const handlePop = () => {
        isPoppingHistoryRef.current = true;
        setView('list');
      };
      window.addEventListener('popstate', handlePop, { once: true });
      return () => {
        window.removeEventListener('popstate', handlePop);
        if (!isPoppingHistoryRef.current && window.history.state?.pinView) {
          window.history.back();
        }
        isPoppingHistoryRef.current = false;
      };
    }
  }, [view]);

  const activeFolder = useMemo(() => {
    if (!folderId || !Array.isArray(folders) || folders.length === 0) return null;
    return (
      folders.find((folder) => folder.id === folderId) ||
      folders.find((folder) => (folderId === 'default' || folderId === DEFAULT_FOLDER_ID) && (folder.id === 'default' || folder.sortOrder === 0 || folder.name === '내 핀')) ||
      folders.find((folder) => folder.name === folderId) ||
      null
    );
  }, [folders, folderId]);

  const folderPins = useMemo(() => {
    if (!activeFolder) return [];
    const raw = activeFolder.pins || activeFolder.courses || [];
    return Array.isArray(raw) ? raw : [];
  }, [activeFolder]);

  const visiblePins = useMemo(() => {
    if (!activeFolder) return [];
    let pins = [...folderPins];
    if (filter === 'with') pins = pins.filter((pin) => pin.hasRestaurant);
    if (filter === 'without') pins = pins.filter((pin) => !pin.hasRestaurant);

    if (sort === 'latest') {
      pins.sort((a, b) => new Date(b.savedAt ?? 0) - new Date(a.savedAt ?? 0));
    } else if (sort === 'duration') {
      pins.sort((a, b) => (Number(a.durationMin) || 0) - (Number(b.durationMin) || 0));
    } else if (sort === 'distance') {
      pins.sort((a, b) => {
        const distA = Number(a.distanceKm ?? a.distanceToStartKm ?? 0);
        const distB = Number(b.distanceKm ?? b.distanceToStartKm ?? 0);
        return distA - distB;
      });
    }
    return pins;
  }, [activeFolder, folderPins, filter, sort]);

  const openFolder = (folder) => {
    setFolderId(folder.id);
    setSort('latest');
    setFilter('all');
    setSelectedPinId(null);
    setConfirmDeleteFolder(false);
    setConfirmDeletePin(null);
    setView('folder');
  };

  const deletePin = (pin) => {
    if (!activeFolder) return;
    const next = removeRoutePin(userId, activeFolder.id, pin.id, pin.title);
    setFolders(next);
    setSelectedPinId(null);
    setToast('핀을 삭제했어요');
  };

  const deleteFolder = async () => {
    if (!activeFolder) return;
    const targetId = activeFolder.id;
    const targetName = activeFolder.name;

    // 1. React 상태 즉시 제거 (새로고침 없이 즉각 사라짐 보장)
    setFolders((prev) => prev.filter((f) => f.id !== targetId && f.name !== targetName));
    setConfirmDeleteFolder(false);
    setFolderId(null);
    isPoppingHistoryRef.current = true;
    if (window.history.state?.pinView) {
      window.history.replaceState({ pinView: null }, '');
    }
    setView('list');
    setToast(`‘${targetName}’ 폴더를 삭제했어요`);

    // 2. 로컬 스토리지 및 서버 동기화 완료
    try {
      await deletePinFolder(userId, targetId);
    } catch (err) {
      console.warn('⚠️ [Pins] 폴더 삭제 오류:', err.message);
    }
  };

  // 마우스 드래그 앤 드롭
  const handleDrop = (targetPin) => {
    if (sort !== 'custom' || !dragId || !activeFolder || dragId === targetPin.id) return;
    const fromIndex = folderPins.findIndex((pin) => pin.id === dragId);
    const toIndex = folderPins.findIndex((pin) => pin.id === targetPin.id);
    if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
      const next = reorderPins(userId, activeFolder.id, fromIndex, toIndex);
      setFolders(next);
      setToast('순서를 변경했어요');
    }
    setDragId(null);
  };

  // 모바일/터치 포인터 드래그 지원
  const handlePointerDown = (event, id) => {
    if (sort !== 'custom') return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragId(id);
  };

  const handlePointerMove = (event) => {
    if (!dragId || !activeFolder || sort !== 'custom') return;
    const y = event.clientY;
    const pins = folderPins;
    const targetPin = pins.find((p) => {
      if (p.id === dragId) return false;
      const rect = cardRefs.current.get(p.id)?.getBoundingClientRect();
      return rect && y > rect.top && y < rect.bottom;
    });
    if (!targetPin) return;
    const fromIndex = pins.findIndex((p) => p.id === dragId);
    const toIndex = pins.findIndex((p) => p.id === targetPin.id);
    if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
      const next = reorderPins(userId, activeFolder.id, fromIndex, toIndex);
      setFolders(next);
    }
  };

  const handlePointerUp = () => {
    if (dragId) {
      setDragId(null);
      setToast('순서를 변경했어요');
    }
  };

  const createFolder = (event) => {
    if (event && event.preventDefault) event.preventDefault();
    const trimmed = folderName.trim();
    if (!trimmed) return setFolderError('폴더 이름을 입력해 주세요.');
    if (folders.some((folder) => folder.name === trimmed)) {
      return setFolderError('같은 이름의 폴더가 이미 있어요.');
    }
    const folder = createPinFolder(userId, trimmed);
    if (!folder) return setFolderError('폴더를 만들지 못했어요.');
    const updated = getPinFolders(userId);
    setFolders(updated);
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
          <p style={{ margin: '-10px 0 16px', fontSize: '13px', color: 'var(--muted)' }}>
            마음에 드는 산책 코스를 저장해 보세요
          </p>
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
      <div className="screen screen--map">
        <SoyoMap className="map-fill map-fill--faded" />
        <section className="map-sheet pin-sheet">
          <div className="sheet-grip" />
          <header className="page-head page-head--back" style={{ marginBottom: '16px' }}>
            <button type="button" className="back-btn" onClick={() => setView('list')} aria-label="뒤로">
              <Icon name="chevron-left" size={22} />
            </button>
            <div>
              <h1 style={{ fontSize: '18px', fontWeight: 800 }}>새 폴더 만들기</h1>
              <p style={{ fontSize: '12px', color: 'var(--muted)' }}>산책 코스를 모을 폴더 이름을 입력하세요</p>
            </div>
          </header>

          <form className="folder-form" onSubmit={createFolder} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <label className="field-label" htmlFor="folder-name" style={{ fontSize: '13px', fontWeight: 600 }}>
              폴더 이름
            </label>
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
            {folderError && <p className="form-message" style={{ color: '#e53e3e', fontSize: '12px' }}>{folderError}</p>}
            <p className="helper" style={{ fontSize: '12px', color: 'var(--muted)' }}>
              언제든 폴더에 마음에 드는 코스를 저장할 수 있어요.
            </p>

            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setView('list')} style={{ flex: 1 }}>
                취소
              </button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                저장
              </button>
            </div>
          </form>
        </section>
        {toast && <div className="toast">{toast}</div>}
      </div>
    );
  }

  // ── No.21 저장 경로 시작 확인 ───────────────────────────────
  if (view === 'confirm' && confirmPin) {
    const dist = confirmPin.distanceKm ?? confirmPin.distanceToStartKm ?? 0.8;
    return (
      <div className="screen screen--map">
        <SoyoMap route={confirmPin} className="map-fill" />
        <div className="map-top map-top--compact">
          <button type="button" className="map-round" onClick={() => setView('folder')} aria-label="뒤로">
            <Icon name="chevron-left" size={21} />
          </button>
        </div>
        <section className="map-sheet start-sheet">
          <div className="sheet-grip" />
          <h2>해당 경로를 시작하시겠습니까?</h2>
          <div className="start-summary">
            <strong>{formatPinTitle(confirmPin.title, confirmPin.durationMin)}</strong>
            <span>
              약 {confirmPin.durationMin}분 · 거리 {formatDistance(dist)} · {confirmPin.hasRestaurant ? '식당 포함' : '산책만'}
            </span>
            {confirmPin.restaurant && (
              <span style={{ color: 'var(--emerald-dark)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>🍴</span>
                <span>{confirmPin.restaurant.name}</span>
                <span style={{ fontSize: '10.5px', background: 'var(--emerald-soft)', padding: '1px 6px', borderRadius: '4px' }}>
                  {confirmPin.restaurant.dot || '🟢'} {confirmPin.restaurant.badgeLabel || '안심식당'}
                </span>
              </span>
            )}
            {confirmPin.roadType && <span>{confirmPin.roadType}</span>}
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
  if (view === 'folder') {
    if (!activeFolder) {
      return (
        <div className="screen page">
          <header className="page-head page-head--back">
            <button type="button" className="back-btn" onClick={() => setView('list')} aria-label="뒤로">
              <Icon name="chevron-left" size={22} />
            </button>
            <div className="page-head-text">
              <h1>저장 코스</h1>
              <p>코스를 불러오는 중...</p>
            </div>
          </header>
          <div className="pin-list" style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)' }}>
            잠시만 기다려 주세요...
          </div>
        </div>
      );
    }

    return (
      <div className="screen page">
        <header className="page-head page-head--back">
          <button type="button" className="back-btn" onClick={() => setView('list')} aria-label="뒤로">
            <Icon name="chevron-left" size={22} />
          </button>
          <div className="page-head-text">
            <h1>{activeFolder.name}</h1>
            <p>저장한 코스 {folderPins.length}개</p>
          </div>
          {/* 기본 '내 핀' 폴더는 핀 저장 기본 위치라 삭제 버튼을 숨김 */}
          {activeFolder.id !== DEFAULT_FOLDER_ID && activeFolder.name !== '내 핀' && activeFolder.sortOrder !== 0 && (
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
          <p className="helper custom-hint">직접 정렬에서는 카드를 위아래로 끌어 순서를 바꿀 수 있어요.</p>
        )}

        <div
          className="pin-list"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {visiblePins.map((pin) => {
            const distance = pin.distanceKm ?? pin.distanceToStartKm ?? 0.8;
            const selected = selectedPinId === pin.id;
            const isDragging = dragId === pin.id;
            return (
              <article
                key={pin.id}
                ref={(node) => {
                  if (node) cardRefs.current.set(pin.id, node);
                  else cardRefs.current.delete(pin.id);
                }}
                className={`pin-card ${selected ? 'is-selected' : ''} ${isDragging ? 'is-dragging' : ''}`}
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
                  <strong>{formatPinTitle(pin.title, pin.durationMin)}</strong>
                  <span className="pin-meta">
                    거리 {formatDistance(distance)} · 약 {pin.durationMin}분
                  </span>
                  <span className="pin-sub">
                    {pin.hasRestaurant ? '식당 포함' : '산책만'} · {pin.roadType?.split(' · ')[0] || '안심 산책길'}
                  </span>
                  {pin.hasRestaurant && pin.restaurant && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#16a34a', fontWeight: 600, marginTop: '2px' }}>
                      <span>🍴</span>
                      <span>{pin.restaurant.name}</span>
                      <span style={{ fontSize: '10px', background: 'rgba(22,163,74,0.1)', padding: '1px 5px', borderRadius: '4px' }}>
                        {pin.restaurant.dot || '🟢'} {pin.restaurant.badgeLabel || '안심식당'}
                      </span>
                    </div>
                  )}
                </button>

                {sort === 'custom' && (
                  <button
                    type="button"
                    className="drag-handle"
                    aria-label={`${pin.title} 순서 변경`}
                    style={{ background: 'none', border: 0, padding: 0 }}
                    onPointerDown={(event) => handlePointerDown(event, pin.id)}
                  >
                    <Icon name="grip" size={18} />
                  </button>
                )}
                <button
                  type="button"
                  className="danger-link"
                  onClick={(event) => {
                    event.stopPropagation();
                    setConfirmDeletePin(pin);
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

        {confirmDeletePin && (
          <div className="pin-dialog-backdrop" role="presentation" onClick={() => setConfirmDeletePin(null)}>
            <section
              className="pin-dialog"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="pin-delete-title"
              onClick={(event) => event.stopPropagation()}
            >
              <h2 id="pin-delete-title">저장한 코스를 삭제할까요?</h2>
              <strong>{formatPinTitle(confirmDeletePin.title, confirmDeletePin.durationMin)}</strong>
              <p>삭제한 코스는 폴더에서 사라져요.</p>
              <div className="pin-dialog-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setConfirmDeletePin(null)}>취소</button>
                <button type="button" className="btn btn-primary" onClick={() => {
                  deletePin(confirmDeletePin);
                  setConfirmDeletePin(null);
                }}>삭제</button>
              </div>
            </section>
          </div>
        )}

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
                {folderPins.length > 0
                  ? `폴더 안의 저장 코스 ${folderPins.length}개도 함께 삭제돼요.`
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
                <small>저장 코스 {(folder.pins || folder.courses || []).length}개</small>
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
