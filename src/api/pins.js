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

function generateUuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const createId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const PIN_UPDATE_EVENT = 'soyo-pins-updated';

function notifyPinsUpdated(detail = {}) {
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent(PIN_UPDATE_EVENT, { detail }));
    } catch {
      // ignore
    }
  }
}

/** 서버에서 최신 폴더 및 핀 목록을 가져와 로컬 캐시를 갱신합니다. */
export async function syncPinFoldersFromServer(userId = getCurrentUserId()) {
  if (!userId || userId === 'guest') return getPinFolders(userId);
  try {
    const res = await apiFetch(`/api/pins/folders?userId=${encodeURIComponent(userId)}`, {
      method: 'GET'
    });
    if (res?.success && Array.isArray(res.folders)) {
      const normalized = res.folders.map((f) => {
        const list = Array.isArray(f.pins) ? f.pins : (Array.isArray(f.courses) ? f.courses : []);
        return {
          ...f,
          pins: list,
          courses: list,
        };
      });
      const all = readAll();
      all[userId] = { folders: normalized };
      writeAll(all);
      notifyPinsUpdated({ userId, folders: normalized });
      return normalized;
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

  // pins 와 courses 배열이 항상 유효하도록 정규화
  const folders = all[userId].folders.map((f) => {
    const list = Array.isArray(f.pins) ? f.pins : (Array.isArray(f.courses) ? f.courses : []);
    return {
      ...f,
      pins: list,
      courses: list,
    };
  });

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

  const newFolderUuid = generateUuid();
  const folder = {
    id: newFolderUuid,
    name: trimmed,
    createdAt: new Date().toISOString(),
    pins: [],
    courses: []
  };

  const all = readAll();
  all[userId] = { folders: [...folders, folder] };
  writeAll(all);
  notifyPinsUpdated({ userId, action: 'createFolder', folder });

  // 백엔드 서버 동기화 (클라이언트 UUID 전송하여 ID 불일치 방지)
  if (userId && userId !== 'guest') {
    apiFetch('/api/pins/folders', {
      method: 'POST',
      body: JSON.stringify({ userId, id: newFolderUuid, name: trimmed })
    }).then((res) => {
      if (res?.success && res.folder) {
        const latest = readAll();
        if (latest[userId]?.folders) {
          latest[userId].folders = latest[userId].folders.map((f) =>
            f.id === folder.id ? { ...f, id: res.folder.id } : f
          );
          writeAll(latest);
          notifyPinsUpdated({ userId, action: 'folderIdSynced' });
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

export async function deletePinFolder(userId = getCurrentUserId(), folderId) {
  if (!folderId && typeof userId === 'string') {
    folderId = userId;
    userId = getCurrentUserId();
  }

  if (folderId === DEFAULT_FOLDER_ID) return getPinFolders(userId);

  const all = readAll();
  const currentFolders = Array.isArray(all[userId]?.folders) ? all[userId].folders : getPinFolders(userId);
  const folders = currentFolders.filter((folder) => folder.id !== folderId && folder.name !== folderId);
  all[userId] = {
    ...all[userId],
    folders
  };
  writeAll(all);
  notifyPinsUpdated({ userId, action: 'deleteFolder', folderId });

  // 백엔드 서버 동기화 (삭제 완료 보장)
  if (userId && userId !== 'guest') {
    try {
      await apiFetch(`/api/pins/folders/${encodeURIComponent(folderId)}?userId=${encodeURIComponent(userId)}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.warn('⚠️ [Pins] 서버 폴더 삭제 대기:', err.message);
    }
  }

  return folders;
}

/** 핀(산책 코스) 저장 */
export function saveRoutePin(userId = getCurrentUserId(), route, folderId = 'default') {
  if (!route) return { saved: false, folders: getPinFolders(userId) };

  const folders = getPinFolders(userId);
  if (!folders || folders.length === 0) return { saved: false, folders: [] };

  const target = folders.find((folder) => folder.id === folderId) || folders[0];
  if (!target) return { saved: false, folders };

  const targetPins = Array.isArray(target.pins) ? target.pins : [];
  const alreadyInTarget = targetPins.some((pin) => pin?.id === route.id || pin?.title === route.title);
  if (alreadyInTarget) return { saved: false, folders };

  const newPin = {
    ...route,
    savedAt: new Date().toISOString()
  };

  const nextFolders = folders.map((folder) =>
    folder.id === target.id
      ? {
          ...folder,
          pins: [newPin, ...targetPins],
          courses: [newPin, ...(Array.isArray(folder.courses) ? folder.courses : targetPins)]
        }
      : folder
  );

  const all = readAll();
  all[userId] = { folders: nextFolders };
  writeAll(all);
  notifyPinsUpdated({ userId, action: 'savePin', route });

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
export function removeRoutePin(userId = getCurrentUserId(), folderId, routeId, title) {
  const folders = getPinFolders(userId).map((folder) => {
    if (folder.id !== folderId) return folder;
    const filteredPins = (folder.pins || folder.courses || []).filter((pin) => {
      if (routeId && pin.id === routeId) return false;
      if (title && pin.title === title) return false;
      return true;
    });
    return {
      ...folder,
      pins: filteredPins,
      courses: filteredPins
    };
  });

  const all = readAll();
  all[userId] = { folders };
  writeAll(all);
  notifyPinsUpdated({ userId, action: 'removePin', routeId, title });

  // 백엔드 서버 동기화
  if (userId && userId !== 'guest') {
    const query = title ? `?userId=${encodeURIComponent(userId)}&title=${encodeURIComponent(title)}` : `?userId=${encodeURIComponent(userId)}`;
    apiFetch(`/api/pins/folders/${encodeURIComponent(folderId)}/routes/${encodeURIComponent(routeId || 'by-title')}${query}`, {
      method: 'DELETE'
    }).catch((err) => {
      console.warn('⚠️ [Pins] 서버 핀 삭제 대기:', err.message);
    });
  }

  return folders;
}

/** 모든 폴더에서 해당 핀 제거 (북마크 토글 해제 시 사용) */
export function removeRoutePinEverywhere(userId = getCurrentUserId(), routeId, title) {
  const folders = getPinFolders(userId).map((folder) => {
    const filteredPins = (folder.pins || folder.courses || []).filter((pin) => {
      if (routeId && pin.id === routeId) return false;
      if (title && pin.title === title) return false;
      return true;
    });
    return {
      ...folder,
      pins: filteredPins,
      courses: filteredPins
    };
  });

  const all = readAll();
  all[userId] = { folders };
  writeAll(all);
  notifyPinsUpdated({ userId, action: 'removePinEverywhere', routeId, title });

  // 백엔드 서버 동기화
  if (userId && userId !== 'guest') {
    const query = title ? `?userId=${encodeURIComponent(userId)}&title=${encodeURIComponent(title)}` : `?userId=${encodeURIComponent(userId)}`;
    apiFetch(`/api/pins/folders/default/routes/${encodeURIComponent(routeId || 'by-title')}${query}`, {
      method: 'DELETE'
    }).catch(() => {});
  }

  return folders;
}

/** 핀 순서 변경 (커스텀 정렬 드래그앤드롭) */
export function reorderPins(userId = getCurrentUserId(), folderId, fromIndex, toIndex) {
  const folders = getPinFolders(userId).map((folder) => {
    if (folder.id !== folderId) return folder;
    const pins = [...(folder.pins || folder.courses || [])];
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
  notifyPinsUpdated({ userId, action: 'reorderPins' });

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

export function isRoutePinned(userId = getCurrentUserId(), routeId, title) {
  return getPinFolders(userId).some((folder) =>
    folder.pins.some((pin) => pin.id === routeId || (title && pin.title === title))
  );
}

export function countPins(folders = []) {
  return folders.reduce((total, folder) => total + (folder.pins?.length || 0), 0);
}
