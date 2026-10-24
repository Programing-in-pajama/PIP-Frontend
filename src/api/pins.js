// 📌 핀(저장 경로) 하이브리드 저장소 (AWS RDS PostgreSQL 백엔드 실시간 동기화 + localStorage 로컬 캐시/오프라인 지원)
import { apiFetch } from './client';

const STORAGE_KEY = 'soyo-pin-folders-v1';

function getCurrentUserId() {
  return localStorage.getItem('soyo-current-user-id') || 'guest';
}

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // 저장 공간을 사용할 수 없어도 화면은 계속 동작합니다.
  }
}

const createId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/** 서버에서 최신 폴더 및 핀 목록을 가져와 로컬 캐시를 갱신합니다. */
export async function syncPinFoldersFromServer(userId = getCurrentUserId()) {
  if (!userId || userId === 'guest') return getPinFolders(userId);
  try {
    const res = await apiFetch(`/api/pins/folders?userId=${encodeURIComponent(userId)}`, {
      method: 'GET'
    });
    if (res?.success && Array.isArray(res.folders)) {
      const all = readAll();
      all[userId] = { folders: res.folders };
      writeAll(all);
      return res.folders;
    }
  } catch (err) {
    console.warn('⚠️ [Pins] 서버 핀 동기화 대기 (로컬 캐시 사용):', err.message);
  }
  return getPinFolders(userId);
}

/** 사용자의 폴더 목록을 돌려주고, 없으면 기본 '내 핀' 폴더를 만듭니다. (동기 즉각 반환) */
export function getPinFolders(userId = getCurrentUserId()) {
  const all = readAll();
  if (!all[userId] || !Array.isArray(all[userId].folders) || all[userId].folders.length === 0) {
    all[userId] = {
      folders: [
        {
          id: 'default',
          name: '내 핀',
          createdAt: new Date().toISOString(),
          pins: [],
          courses: []
        },
      ],
    };
    writeAll(all);
  }

  // PinFlow 등에서 folder.courses 를 참조할 수 있으므로 courses 도 항상 동기화
  const folders = all[userId].folders.map((f) => ({
    ...f,
    courses: f.courses || f.pins || []
  }));

  // 로그인 상태인 경우 백그라운드에서 서버 동기화 시도
  if (userId && userId !== 'guest' && !all[userId]._syncScheduled) {
    all[userId]._syncScheduled = true;
    syncPinFoldersFromServer(userId).catch(() => {});
  }

  return folders;
}

/** 비동기 최신 폴더 목록 반환 (서버 우선) */
export async function fetchPinFolders(userId = getCurrentUserId()) {
  if (userId && userId !== 'guest') {
    return await syncPinFoldersFromServer(userId);
  }
  return getPinFolders(userId);
}

/** 새 폴더 생성: createPinFolder(name) 또는 createPinFolder(userId, name) 지원 */
export function createPinFolder(arg1, arg2) {
  let userId = getCurrentUserId();
  let folderName = '';

  if (typeof arg2 === 'string') {
    userId = arg1 || getCurrentUserId();
    folderName = arg2;
  } else if (typeof arg1 === 'string') {
    folderName = arg1;
  }

  const trimmed = String(folderName ?? '').trim();
  if (!trimmed) return null;

  const folders = getPinFolders(userId);
  if (folders.some((folder) => folder.name === trimmed)) return null;

  const folder = {
    id: createId('folder'),
    name: trimmed,
    createdAt: new Date().toISOString(),
    pins: [],
    courses: []
  };

  const all = readAll();
  all[userId] = { folders: [...folders, folder] };
  writeAll(all);

  // 백엔드 서버 동기화 (비동기)
  if (userId && userId !== 'guest') {
    apiFetch('/api/pins/folders', {
      method: 'POST',
      body: JSON.stringify({ userId, name: trimmed })
    }).then((res) => {
      if (res?.success && res.folder) {
        // 서버 발급 UUID 가 있으면 로컬 폴더 ID 동기화
        const latest = readAll();
        if (latest[userId]?.folders) {
          latest[userId].folders = latest[userId].folders.map((f) =>
            f.id === folder.id ? { ...f, id: res.folder.id } : f
          );
          writeAll(latest);
        }
      }
    }).catch((err) => {
      console.warn('⚠️ [Pins] 서버 새 폴더 생성 저장 대기:', err.message);
    });
  }

  return folder;
}

/** 폴더 삭제 (안에 있던 핀도 같이 삭제). 기본 '내 핀' 폴더는 삭제 불가 */
export const DEFAULT_FOLDER_ID = 'default';

export function deletePinFolder(userId = getCurrentUserId(), folderId) {
  if (!folderId && typeof userId === 'string') {
    folderId = userId;
    userId = getCurrentUserId();
  }

  if (folderId === DEFAULT_FOLDER_ID) return getPinFolders(userId);

  const folders = getPinFolders(userId).filter((folder) => folder.id !== folderId);
  const all = readAll();
  all[userId] = { folders };
  writeAll(all);

  // 백엔드 서버 동기화
  if (userId && userId !== 'guest') {
    apiFetch(`/api/pins/folders/${encodeURIComponent(folderId)}?userId=${encodeURIComponent(userId)}`, {
      method: 'DELETE'
    }).catch((err) => {
      console.warn('⚠️ [Pins] 서버 폴더 삭제 대기:', err.message);
    });
  }

  return folders;
}

/** 핀(산책 코스) 저장 */
export function saveRoutePin(userId = getCurrentUserId(), route, folderId = 'default') {
  if (!route) return { saved: false, folders: getPinFolders(userId) };

  const folders = getPinFolders(userId);
  const already = folders.some((folder) => folder.pins.some((pin) => pin.id === route.id || pin.title === route.title));
  if (already) return { saved: false, folders };

  const target = folders.find((folder) => folder.id === folderId) ?? folders[0];
  const newPin = {
    ...route,
    savedAt: new Date().toISOString()
  };

  const nextFolders = folders.map((folder) =>
    folder.id === target.id
      ? {
          ...folder,
          pins: [newPin, ...folder.pins],
          courses: [newPin, ...(folder.courses || folder.pins)]
        }
      : folder
  );

  const all = readAll();
  all[userId] = { folders: nextFolders };
  writeAll(all);

  // 백엔드 서버 동기화
  if (userId && userId !== 'guest') {
    apiFetch('/api/pins/routes', {
      method: 'POST',
      body: JSON.stringify({ userId, folderId: target.id, route })
    }).catch((err) => {
      console.warn('⚠️ [Pins] 서버 핀 저장 대기:', err.message);
    });
  }

  return { saved: true, folders: nextFolders };
}

/** 특정 폴더에서 핀 삭제 */
export function removeRoutePin(userId = getCurrentUserId(), folderId, routeId) {
  const folders = getPinFolders(userId).map((folder) => {
    if (folder.id !== folderId) return folder;
    const filteredPins = folder.pins.filter((pin) => pin.id !== routeId);
    return {
      ...folder,
      pins: filteredPins,
      courses: filteredPins
    };
  });

  const all = readAll();
  all[userId] = { folders };
  writeAll(all);

  // 백엔드 서버 동기화
  if (userId && userId !== 'guest') {
    apiFetch(`/api/pins/folders/${encodeURIComponent(folderId)}/routes/${encodeURIComponent(routeId)}?userId=${encodeURIComponent(userId)}`, {
      method: 'DELETE'
    }).catch((err) => {
      console.warn('⚠️ [Pins] 서버 핀 삭제 대기:', err.message);
    });
  }

  return folders;
}

/** 모든 폴더에서 해당 핀 제거 (북마크 토글 해제 시 사용) */
export function removeRoutePinEverywhere(userId = getCurrentUserId(), routeId) {
  const folders = getPinFolders(userId).map((folder) => {
    const filteredPins = folder.pins.filter((pin) => pin.id !== routeId);
    return {
      ...folder,
      pins: filteredPins,
      courses: filteredPins
    };
  });

  const all = readAll();
  all[userId] = { folders };
  writeAll(all);

  // 백엔드 서버 동기화
  if (userId && userId !== 'guest') {
    apiFetch(`/api/pins/folders/default/routes/${encodeURIComponent(routeId)}?userId=${encodeURIComponent(userId)}`, {
      method: 'DELETE'
    }).catch(() => {});
  }

  return folders;
}

/** 핀 순서 변경 (커스텀 정렬 드래그앤드롭) */
export function reorderPins(userId = getCurrentUserId(), folderId, fromIndex, toIndex) {
  const folders = getPinFolders(userId).map((folder) => {
    if (folder.id !== folderId) return folder;
    const pins = [...folder.pins];
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= pins.length || toIndex >= pins.length) {
      return folder;
    }
    const [moved] = pins.splice(fromIndex, 1);
    pins.splice(toIndex, 0, moved);
    return { ...folder, pins, courses: pins };
  });

  const all = readAll();
  all[userId] = { folders };
  writeAll(all);

  // 백엔드 서버 동기화
  const activeFolder = folders.find((f) => f.id === folderId);
  if (userId && userId !== 'guest' && activeFolder) {
    const routeIds = activeFolder.pins.map((p) => p.id);
    apiFetch(`/api/pins/folders/${encodeURIComponent(folderId)}/routes/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ userId, routeIds })
    }).catch((err) => {
      console.warn('⚠️ [Pins] 서버 핀 순서 변경 대기:', err.message);
    });
  }

  return folders;
}

/** PinFlow 호환 별칭 함수들 */
export async function removePinCourse(folderId, courseId) {
  const userId = getCurrentUserId();
  return removeRoutePin(userId, folderId, courseId);
}

export async function reorderPinCourses(folderId, ids) {
  const userId = getCurrentUserId();
  const folders = getPinFolders(userId).map((folder) => {
    if (folder.id !== folderId) return folder;
    const pinMap = new Map(folder.pins.map((p) => [p.id, p]));
    const sortedPins = ids.map((id) => pinMap.get(id)).filter(Boolean);
    return { ...folder, pins: sortedPins, courses: sortedPins };
  });
  const all = readAll();
  all[userId] = { folders };
  writeAll(all);

  if (userId && userId !== 'guest') {
    apiFetch(`/api/pins/folders/${encodeURIComponent(folderId)}/routes/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ userId, routeIds: ids })
    }).catch(() => {});
  }

  return folders;
}

export function isRoutePinned(userId = getCurrentUserId(), routeId) {
  return getPinFolders(userId).some((folder) => folder.pins.some((pin) => pin.id === routeId));
}

export function countPins(folders = []) {
  return folders.reduce((total, folder) => total + (folder.pins?.length || 0), 0);
}
