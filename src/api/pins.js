// 📌 핀(저장 경로) 하이브리드 저장소 (AWS RDS PostgreSQL 백엔드 실시간 동기화 + localStorage 로컬 캐시/오프라인 지원)
import { apiFetch } from './client';

const STORAGE_KEY = 'soyo-pin-folders-v1';
const lastSyncTimeMap = new Map();
const SYNC_THROTTLE_MS = 10000;

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

export function subscribePinsUpdated(callback) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(PIN_UPDATE_EVENT, callback);
  return () => window.removeEventListener(PIN_UPDATE_EVENT, callback);
}

function notifyPinsUpdated(detail = {}) {
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent(PIN_UPDATE_EVENT, { detail }));
    } catch {
      // ignore
    }
  }
}

/** 핀 제목과 소요시간/거리를 100% 동기화하고 정규화합니다. */
export function normalizePin(pin) {
  if (!pin) return pin;
  const rawTitle = String(pin.title || '');
  const cleanTitle = rawTitle.replace(/\s*[\(\（]\s*\d+\s*분\s*[\)\）]/g, '').trim();
  const effectiveMin = Number(pin.durationMin ?? pin.duration_minutes ?? pin.duration ?? 25);
  const effectiveDistance = Number(pin.distanceKm ?? pin.distanceToStartKm ?? 0.8);
  const synchronizedTitle = effectiveMin ? `${cleanTitle} (${effectiveMin}분)` : cleanTitle;

  return {
    ...pin,
    title: synchronizedTitle,
    durationMin: effectiveMin,
    distanceKm: effectiveDistance,
  };
}

/** 서버에서 최신 폴더 및 핀 목록을 가져와 로컬 캐시와 안전하게 병합합니다. */
export async function syncPinFoldersFromServer(userId = getCurrentUserId()) {
  if (!userId || userId === 'guest') return getPinFolders(userId);
  try {
    const res = await apiFetch(`/api/pins/folders?userId=${encodeURIComponent(userId)}`, {
      method: 'GET'
    });
    if (res?.success && Array.isArray(res.folders)) {
      const serverFolders = res.folders.map((f) => {
        const rawList = Array.isArray(f.pins) ? f.pins : (Array.isArray(f.courses) ? f.courses : []);
        const list = rawList.map(normalizePin);
        return {
          ...f,
          pins: list,
          courses: list,
        };
      });

      const all = readAll();
      delete all[userId]?._tombstones; // 구버전 잔여 툼스톤 완전 삭제

      // 최근 15초 이내에 오프라인/인플라이트 상태에서 막 저장되어 서버에 아직 도달하지 않은 신규 핀만 안전하게 보존
      const now = Date.now();
      const localFolders = Array.isArray(all[userId]?.folders) ? all[userId].folders : [];

      localFolders.forEach((lf) => {
        const pins = lf.pins || lf.courses || [];
        pins.forEach((lp) => {
          if (lp.serverPinId) return;
          const savedTime = lp.savedAt ? new Date(lp.savedAt).getTime() : 0;
          if (now - savedTime > 15000) return; // 15초가 지난 구버전 로컬 잔여물은 영구 정리

          const cleanLpTitle = String(lp.title || '').replace(/\s*[\(\（]\s*\d+\s*분\s*[\)\）]/g, '').trim();

          const alreadyOnServer = serverFolders.some((sf) =>
            (sf.pins || []).some((sp) => {
              const cleanSpTitle = String(sp.title || '').replace(/\s*[\(\（]\s*\d+\s*분\s*[\)\）]/g, '').trim();
              return sp.id === lp.id || (cleanLpTitle && cleanSpTitle === cleanLpTitle);
            })
          );

          if (!alreadyOnServer) {
            const targetFolder = serverFolders.find((sf) => sf.id === lf.id || sf.name === lf.name) || serverFolders[0];
            if (targetFolder) {
              targetFolder.pins.unshift(lp);
              targetFolder.courses = targetFolder.pins;
              apiFetch('/api/pins/routes', {
                method: 'POST',
                body: JSON.stringify({ userId, folderId: targetFolder.id, route: lp })
              }).catch(() => {});
            }
          }
        });
      });

      // 로컬스토리지의 구버전 잔여 캐시를 서버의 실제 데이터로 100% 동기화 및 덮어쓰기
      all[userId] = {
        ...all[userId],
        folders: serverFolders
      };
      delete all[userId]._tombstones;
      writeAll(all);
      notifyPinsUpdated({ userId, folders: serverFolders });
      return serverFolders;
    }
  } catch (err) {
    console.warn('⚠️ [Pins] 서버 핀 동기화 대기 (로컬 캐시 사용):', err.message);
  }
  return getPinFolders(userId);
}

/** 사용자의 폴더 목록을 돌려주고, 없으면 기본 '내 핀' 폴더를 만듭니다. (동기 즉각 반환) */
export function getPinFolders(userId = getCurrentUserId()) {
  const all = readAll();
  if (all[userId]?._tombstones) {
    delete all[userId]._tombstones;
    writeAll(all);
  }
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
    const rawList = Array.isArray(f.pins) ? f.pins : (Array.isArray(f.courses) ? f.courses : []);
    const list = rawList.map(normalizePin);
    return {
      ...f,
      pins: list,
      courses: list,
    };
  });

  // 로그인 상태인 경우 백그라운드에서 최신 서버 동기화 시도 (10초 스로틀)
  const lastSync = lastSyncTimeMap.get(userId) || 0;
  if (userId && userId !== 'guest' && Date.now() - lastSync > SYNC_THROTTLE_MS) {
    lastSyncTimeMap.set(userId, Date.now());
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
  delete all[userId]?._tombstones;
  all[userId] = {
    ...all[userId],
    folders
  };
  delete all[userId]._tombstones;
  writeAll(all);
  notifyPinsUpdated({ userId, action: 'deleteFolder', folderId });

  // 백엔드 서버 동기화 (삭제 완료 보장)
  if (userId && userId !== 'guest') {
    try {
      await apiFetch(`/api/pins/folders/${encodeURIComponent(folderId)}?userId=${encodeURIComponent(userId)}`, {
        method: 'DELETE'
      });
      await syncPinFoldersFromServer(userId);
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

  const target = folders.find((folder) => folder.id === folderId) ||
                 folders.find((folder) => folder.id === 'default' || folder.sortOrder === 0 || folder.name === '내 핀') ||
                 folders[0];
  if (!target) return { saved: false, folders };

  const targetPins = Array.isArray(target.pins) ? target.pins : (Array.isArray(target.courses) ? target.courses : []);
  const normalizedRoute = normalizePin(route);
  if (!normalizedRoute.geoPath && route.geoPath) {
    normalizedRoute.geoPath = route.geoPath;
  }
  const cleanNewTitle = String(normalizedRoute.title || '').replace(/\s*[\(\（]\s*\d+\s*분\s*[\)\）]/g, '').trim();

  const alreadyInTarget = targetPins.some((pin) => {
    if (pin?.id === normalizedRoute.id) return true;
    const cleanPinTitle = String(pin?.title || '').replace(/\s*[\(\（]\s*\d+\s*분\s*[\)\）]/g, '').trim();
    return cleanNewTitle && cleanPinTitle === cleanNewTitle;
  });
  if (alreadyInTarget) return { saved: true, alreadySaved: true, folders };

  const newPin = {
    ...normalizedRoute,
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
  delete all[userId]?._tombstones;
  all[userId] = { ...all[userId], folders: nextFolders };
  delete all[userId]._tombstones;
  writeAll(all);
  notifyPinsUpdated({ userId, action: 'savePin', route: newPin });

  // 백엔드 서버 동기화
  if (userId && userId !== 'guest') {
    apiFetch('/api/pins/routes', {
      method: 'POST',
      body: JSON.stringify({ userId, folderId: target.id, route: newPin })
    }).then((res) => {
      if (res?.pin?.id) {
        const latestAll = readAll();
        if (latestAll[userId]?.folders) {
          latestAll[userId].folders = latestAll[userId].folders.map((f) => {
            if (f.id === target.id) {
              const updatedPins = (f.pins || []).map((p) => {
                const cP = String(p.title || '').replace(/\s*[\(\（]\s*\d+\s*분\s*[\)\）]/g, '').trim();
                if (p.id === newPin.id || (cleanNewTitle && cP === cleanNewTitle)) {
                  return { ...p, serverPinId: res.pin.id };
                }
                return p;
              });
              return { ...f, pins: updatedPins, courses: updatedPins };
            }
            return f;
          });
          writeAll(latestAll);
        }
      }
      syncPinFoldersFromServer(userId).catch(() => {});
    }).catch((err) => {
      console.warn('⚠️ [Pins] 서버 핀 저장 대기:', err.message);
    });
  }

  return { saved: true, folders: nextFolders };
}

/** 특정 폴더에서 핀 삭제 */
export function removeRoutePin(userId = getCurrentUserId(), folderId, routeId, title) {
  const cleanTarget = title ? String(title).replace(/\s*[\(\（]\s*\d+\s*분\s*[\)\）]/g, '').trim() : '';
  const folders = getPinFolders(userId).map((folder) => {
    if (folder.id !== folderId && folderId !== 'default') return folder;
    const filteredPins = (folder.pins || folder.courses || []).filter((pin) => {
      if (routeId && (pin.id === routeId || pin.serverPinId === routeId)) return false;
      if (cleanTarget) {
        const cleanPin = String(pin.title || '').replace(/\s*[\(\（]\s*\d+\s*분\s*[\)\）]/g, '').trim();
        if (cleanPin === cleanTarget || (cleanTarget && cleanPin && (cleanPin.includes(cleanTarget) || cleanTarget.includes(cleanPin)))) {
          return false;
        }
      }
      return true;
    });
    return {
      ...folder,
      pins: filteredPins,
      courses: filteredPins
    };
  });

  const all = readAll();
  delete all[userId]?._tombstones;
  all[userId] = { ...all[userId], folders };
  delete all[userId]._tombstones;
  writeAll(all);
  notifyPinsUpdated({ userId, action: 'removePin', routeId, title });

  // 백엔드 서버 동기화
  if (userId && userId !== 'guest') {
    const query = cleanTarget ? `?userId=${encodeURIComponent(userId)}&title=${encodeURIComponent(cleanTarget)}` : `?userId=${encodeURIComponent(userId)}`;
    apiFetch(`/api/pins/folders/${encodeURIComponent(folderId)}/routes/${encodeURIComponent(routeId || 'by-title')}${query}`, {
      method: 'DELETE'
    }).then(() => {
      syncPinFoldersFromServer(userId).catch(() => {});
    }).catch((err) => {
      console.warn('⚠️ [Pins] 서버 핀 삭제 대기:', err.message);
    });
  }

  return folders;
}

/** 모든 폴더에서 해당 핀 제거 (북마크 토글 해제 시 사용) */
export function removeRoutePinEverywhere(userId = getCurrentUserId(), routeId, title) {
  const cleanTarget = title ? String(title).replace(/\s*[\(\（]\s*\d+\s*분\s*[\)\）]/g, '').trim() : '';
  const folders = getPinFolders(userId).map((folder) => {
    const filteredPins = (folder.pins || folder.courses || []).filter((pin) => {
      if (routeId && (pin.id === routeId || pin.serverPinId === routeId)) return false;
      if (cleanTarget) {
        const cleanPin = String(pin.title || '').replace(/\s*[\(\（]\s*\d+\s*분\s*[\)\）]/g, '').trim();
        if (cleanPin === cleanTarget || (cleanTarget && cleanPin && (cleanPin.includes(cleanTarget) || cleanTarget.includes(cleanPin)))) {
          return false;
        }
      }
      return true;
    });
    return {
      ...folder,
      pins: filteredPins,
      courses: filteredPins
    };
  });

  const all = readAll();
  delete all[userId]?._tombstones;
  all[userId] = { ...all[userId], folders };
  delete all[userId]._tombstones;
  writeAll(all);
  notifyPinsUpdated({ userId, action: 'removePinEverywhere', routeId, title });

  // 백엔드 서버 동기화
  if (userId && userId !== 'guest') {
    const query = cleanTarget ? `?userId=${encodeURIComponent(userId)}&title=${encodeURIComponent(cleanTarget)}` : `?userId=${encodeURIComponent(userId)}`;
    apiFetch(`/api/pins/folders/default/routes/${encodeURIComponent(routeId || 'by-title')}${query}`, {
      method: 'DELETE'
    }).then(() => {
      syncPinFoldersFromServer(userId).catch(() => {});
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
  const cleanTarget = title ? String(title).replace(/\s*[\(\（]\s*\d+\s*분\s*[\)\）]/g, '').trim() : '';
  const folders = getPinFolders(userId);
  return folders.some((folder) => {
    const list = Array.isArray(folder.pins) ? folder.pins : (Array.isArray(folder.courses) ? folder.courses : []);
    return list.some((pin) => {
      if (routeId && (pin.id === routeId || pin.serverPinId === routeId)) return true;
      if (cleanTarget) {
        const cleanPin = String(pin.title || '').replace(/\s*[\(\（]\s*\d+\s*분\s*[\)\）]/g, '').trim();
        if (cleanPin === cleanTarget || (cleanTarget && cleanPin && (cleanPin.includes(cleanTarget) || cleanTarget.includes(cleanPin)))) {
          return true;
        }
      }
      return false;
    });
  });
}

export function countPins(folders = []) {
  return folders.reduce((total, folder) => total + ((folder.pins || folder.courses || []).length), 0);
}
