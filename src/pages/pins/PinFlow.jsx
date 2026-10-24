import { useEffect, useRef, useState } from 'react';
import { getPinFolders, createPinFolder, removePinCourse, reorderPinCourses } from '../../api/pins';
import { PageHeader, ConfirmModal, SearchIcon } from '../mypage/common';
import '../mypage/mypage.css';
import './pins.css';

// 내 핀 탭 (하단 메뉴 첫 번째 📍)
//   비로그인        → no.15 비회원버전 (제목 + 안내 문구만)
//   폴더 목록       → N0.19 핀 (지도 위 시트: 폴더A·B·C + 새 폴더 만들기)
//   폴더 상세       → No.20 (정렬 · 식당 필터 · 코스 카드 · 저장 코스 선택)
//   새 폴더 만들기  → no.22
// 지도 부분은 지도 담당 친구가 KakaoMap 으로 바꿀 수 있게 PinMapBackdrop 하나로 분리해 뒀어요.
export default function PinFlow({ isLoggedIn, resetKey, onStartCourse }) {
  const [screen, setScreen] = useState('folders'); // 'folders' | 'folderDetail' | 'newFolder'
  const [folders, setFolders] = useState([]);
  const [folderId, setFolderId] = useState(null);
  const [toast, setToast] = useState('');

  useEffect(() => setScreen('folders'), [resetKey]);

  useEffect(() => {
    if (isLoggedIn) getPinFolders().then(setFolders);
  }, [isLoggedIn, resetKey]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 2000);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!isLoggedIn) return <GuestPins />;

  const folder = folders.find((item) => item.id === folderId);

  return (
    <>
      {screen === 'folders' && (
        <FolderListPage
          folders={folders}
          onOpen={(id) => { setFolderId(id); setScreen('folderDetail'); }}
          onNewFolder={() => setScreen('newFolder')}
        />
      )}
      {screen === 'folderDetail' && folder && (
        <FolderDetailPage
          folder={folder}
          onBack={() => setScreen('folders')}
          onRemove={async (courseId) => { setFolders(await removePinCourse(folder.id, courseId)); setToast('삭제했어요'); }}
          onReorder={async (ids) => setFolders(await reorderPinCourses(folder.id, ids))}
          onStart={(course) => onStartCourse?.(course)}
        />
      )}
      {screen === 'newFolder' && (
        <NewFolderPage
          onBack={() => setScreen('folders')}
          onSave={async (name) => {
            const updated = await createPinFolder(name);
            setFolders(updated);
            setScreen('folders');
            setToast('새 폴더를 만들었어요');
          }}
        />
      )}
      {toast && <div className="mp-toast" role="status">{toast}</div>}
    </>
  );
}

// ─── no.15 비회원버전: 제목과 안내 문구만 ───
function GuestPins() {
  return (
    <section className="mp-screen mp-page pin-screen">
      <h1 className="mp-title">내 핀</h1>
      <p className="mp-subtitle">마음에 드는 산책 코스를 저장해 보세요</p>
    </section>
  );
}

// ─── N0.19 핀: 지도 + 아래 시트(폴더 목록) ───
function FolderListPage({ folders, onOpen, onNewFolder }) {
  return (
    <section className="mp-screen pin-screen pin-map-screen">
      <PinMapBackdrop />
      <div className="pin-sheet">
        <span className="pin-sheet-handle" aria-hidden="true" />
        <h1 className="pin-sheet-title">내 핀</h1>
        <ul className="pin-folder-list">
          {folders.map((folder) => (
            <li key={folder.id}>
              <button type="button" className="pin-folder-row" onClick={() => onOpen(folder.id)}>
                <span className="pin-folder-thumb" aria-hidden="true" />
                <span className="pin-folder-text">
                  <strong>{folder.name}</strong>
                  <small>저장 코스 {folder.courses.length}개</small>
                </span>
                <span className="mp-chevron" aria-hidden="true">›</span>
              </button>
            </li>
          ))}
        </ul>
        <button type="button" className="mp-outline-button mp-wide pin-new-folder" onClick={onNewFolder}>+ 새 폴더 만들기</button>
      </div>
    </section>
  );
}

// Figma 시안의 지도 그림 (회색 블록 + 연두 블록 + 초록 점)
// 실제 지도로 바꿀 때는 이 컴포넌트 안만 <KakaoMap ... /> 으로 교체하면 돼요.
function PinMapBackdrop() {
  const greenBlocks = new Set([0, 3, 6, 9]);
  return (
    <div className="pin-map" aria-hidden="true">
      {Array.from({ length: 12 }, (_, index) => (
        <span key={index} className={`pin-map-block ${greenBlocks.has(index) ? 'green' : ''}`} />
      ))}
      <span className="pin-map-dot" />
    </div>
  );
}

// ─── No.20 폴더 상세 ───
const SORT_OPTIONS = [
  { key: 'latest', label: '최신순' },
  { key: 'nearest', label: '가까운순' },
  { key: 'custom', label: '직접 정렬' },
];
const RESTAURANT_OPTIONS = [
  { key: 'all', label: '식당 전체' },
  { key: 'with', label: '식당 포함' },
  { key: 'without', label: '식당 미포함' },
];

function FolderDetailPage({ folder, onBack, onRemove, onReorder, onStart }) {
  const [sort, setSort] = useState('latest');
  const [restaurant, setRestaurant] = useState('all');
  const [openMenu, setOpenMenu] = useState(null); // 'sort' | 'restaurant' | null
  const [selectedId, setSelectedId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [message, setMessage] = useState('');
  const [order, setOrder] = useState(() => folder.courses.map((course) => course.id));
  const [draggingId, setDraggingId] = useState(null);
  const cardRefs = useRef(new Map());

  // 폴더 내용이 바뀌면(삭제 등) 직접 정렬 순서도 맞춰 줌
  useEffect(() => setOrder(folder.courses.map((course) => course.id)), [folder.courses]);

  const byId = new Map(folder.courses.map((course) => [course.id, course]));
  let courses = order.map((id) => byId.get(id)).filter(Boolean);
  if (sort === 'latest') courses = [...courses].sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));
  if (sort === 'nearest') courses = [...courses].sort((a, b) => a.distanceToStartKm - b.distanceToStartKm);
  if (restaurant === 'with') courses = courses.filter((course) => course.hasRestaurant);
  if (restaurant === 'without') courses = courses.filter((course) => !course.hasRestaurant);

  const sortLabel = SORT_OPTIONS.find((option) => option.key === sort).label;
  const restaurantLabel = RESTAURANT_OPTIONS.find((option) => option.key === restaurant).label;
  const canDrag = sort === 'custom';

  // 직접 정렬일 때만: 손잡이(≡)를 눌러 위아래로 끌면 순서가 바뀜 (마우스 · 터치 모두)
  function handlePointerDown(event, id) {
    if (!canDrag) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingId(id);
  }

  function handlePointerMove(event) {
    if (!draggingId) return;
    const y = event.clientY;
    const target = order.find((id) => {
      if (id === draggingId) return false;
      const rect = cardRefs.current.get(id)?.getBoundingClientRect();
      return rect && y > rect.top && y < rect.bottom;
    });
    if (!target) return;
    setOrder((current) => {
      const next = current.filter((id) => id !== draggingId);
      const targetIndex = current.indexOf(target);
      const fromIndex = current.indexOf(draggingId);
      next.splice(targetIndex, 0, draggingId);
      return fromIndex === targetIndex ? current : next;
    });
  }

  function handlePointerUp() {
    if (!draggingId) return;
    setDraggingId(null);
    onReorder(order);
  }

  function chooseCourse() {
    const course = courses.find((item) => item.id === selectedId);
    if (!course) return setMessage('시작할 코스를 먼저 눌러서 선택해 주세요.');
    setMessage('');
    onStart(course);
  }

  return (
    <section className="mp-screen mp-page pin-screen" onClick={() => setOpenMenu(null)}>
      <PageHeader title={folder.name} subtitle={`저장한 코스 ${folder.courses.length}개`} onBack={onBack} />

      <div className="pin-filters" onClick={(event) => event.stopPropagation()}>
        <Dropdown
          label={sortLabel}
          dark
          open={openMenu === 'sort'}
          onToggle={() => setOpenMenu(openMenu === 'sort' ? null : 'sort')}
          options={SORT_OPTIONS}
          value={sort}
          onSelect={(key) => { setSort(key); setOpenMenu(null); }}
        />
        <Dropdown
          label={restaurantLabel}
          open={openMenu === 'restaurant'}
          onToggle={() => setOpenMenu(openMenu === 'restaurant' ? null : 'restaurant')}
          options={RESTAURANT_OPTIONS}
          value={restaurant}
          onSelect={(key) => { setRestaurant(key); setOpenMenu(null); }}
        />
      </div>

      {courses.length === 0 ? (
        <p className="pin-empty">{folder.courses.length === 0 ? '아직 저장한 코스가 없어요.' : '조건에 맞는 코스가 없어요.'}</p>
      ) : (
        <ul className="pin-course-list" onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp}>
          {courses.map((course) => (
            <li
              key={course.id}
              ref={(node) => (node ? cardRefs.current.set(course.id, node) : cardRefs.current.delete(course.id))}
              className={`pin-course-card ${selectedId === course.id ? 'selected' : ''} ${draggingId === course.id ? 'dragging' : ''}`}
            >
              <button type="button" className="pin-course-main" aria-pressed={selectedId === course.id} onClick={() => setSelectedId(course.id)}>
                <strong>{course.title}</strong>
                <span className="pin-course-meta">시작점까지 {course.distanceToStartKm}km · 약 {course.durationMin}분</span>
                <span className="pin-course-tags">{course.hasRestaurant ? '식당 포함' : '식당 미포함'} · {course.roadType}</span>
              </button>
              <button type="button" className="pin-course-delete" onClick={() => setDeleteTarget(course)}>삭제</button>
              {canDrag && (
                <button
                  type="button"
                  className="pin-drag-handle"
                  aria-label={`${course.title} 순서 바꾸기`}
                  onPointerDown={(event) => handlePointerDown(event, course.id)}
                >
                  ≡
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mp-bottom-actions pin-bottom">
        <p className="pin-hint">직접 정렬을 선택하면 순서를 바꿀 수 있어요.</p>
        {message && <p className="mp-notice">{message}</p>}
        <button type="button" className="mp-primary-button" onClick={chooseCourse}>저장 코스 선택</button>
      </div>

      {deleteTarget && (
        <ConfirmModal
          title="저장한 코스를 삭제할까요?"
          itemName={deleteTarget.title}
          description="삭제한 코스는 폴더에서 사라져요."
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => {
            onRemove(deleteTarget.id);
            if (selectedId === deleteTarget.id) setSelectedId(null);
            setDeleteTarget(null);
          }}
        />
      )}
    </section>
  );
}

function Dropdown({ label, dark = false, open, onToggle, options, value, onSelect }) {
  return (
    <div className="pin-dropdown">
      <button type="button" className={`pin-chip ${dark ? 'dark' : ''}`} aria-expanded={open} onClick={onToggle}>
        {label} <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <ul className="pin-menu" role="listbox">
          {options.map((option) => (
            <li key={option.key}>
              <button type="button" role="option" aria-selected={value === option.key} className={value === option.key ? 'active' : ''} onClick={() => onSelect(option.key)}>
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── no.22 새 폴더 만들기 ───
function NewFolderPage({ onBack, onSave }) {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');

  async function submit(event) {
    event.preventDefault();
    if (!name.trim()) return setMessage('폴더 이름을 입력해 주세요.');
    try {
      await onSave(name);
    } catch (err) {
      setMessage(err.message || '폴더를 만들지 못했어요.');
    }
  }

  return (
    <form className="mp-screen mp-page mp-form pin-screen" onSubmit={submit}>
      <PageHeader title="새 폴더 만들기" subtitle="산책 코스를 모아둘 폴더 이름을 입력하세요" onBack={onBack} />
      <label className="mp-section-title mp-section-first" htmlFor="pin-folder-name">폴더 이름</label>
      <span className="mp-input-wrap">
        <input
          id="pin-folder-name"
          className="mp-input"
          placeholder="예: 주말 산책"
          maxLength={20}
          value={name}
          onChange={(event) => { setName(event.target.value); setMessage(''); }}
        />
        <span className="pin-input-icon"><SearchIcon /></span>
      </span>
      <p className="pin-help">만든 폴더에 마음에 드는 코스를 저장할 수 있어요.</p>
      {message && <p className="mp-notice">{message}</p>}
      <div className="mp-bottom-actions">
        <button type="submit" className="mp-primary-button">저장</button>
      </div>
    </form>
  );
}
