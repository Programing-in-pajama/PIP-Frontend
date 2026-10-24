// 📌 핀(저장 경로) 로컬 저장소
// 백엔드가 연결되기 전까지 사용자별 핀 폴더를 localStorage 에 보관합니다.
const STORAGE_KEY = 'soyo-pin-folders-v1';

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

/** 사용자의 폴더 목록을 돌려주고, 없으면 기본 '내 핀' 폴더를 만듭니다. */
export function getPinFolders(userId = 'guest') {
  const all = readAll();
  if (!all[userId]) {
    all[userId] = {
      folders: [
        {
          id: 'default',
          name: '내 핀',
          createdAt: new Date().toISOString(),
          pins: [],
        },
      ],
    };
    writeAll(all);
  }
  return all[userId].folders;
}

export function createPinFolder(userId, name) {
  const folders = getPinFolders(userId);
  const trimmed = String(name ?? '').trim();
  if (!trimmed) return null;
  if (folders.some((folder) => folder.name === trimmed)) return null;
  const folder = {
    id: createId('folder'),
    name: trimmed,
    createdAt: new Date().toISOString(),
    pins: [],
  };
  const all = readAll();
  all[userId] = { folders: [...folders, folder] };
  writeAll(all);
  return folder;
}

export function saveRoutePin(userId, route, folderId = 'default') {
  const folders = getPinFolders(userId);
  const already = folders.some((folder) => folder.pins.some((pin) => pin.id === route.id));
  if (already) return { saved: false, folders };

  const target = folders.find((folder) => folder.id === folderId) ?? folders[0];
  const nextFolders = folders.map((folder) =>
    folder.id === target.id
      ? { ...folder, pins: [{ ...route, savedAt: new Date().toISOString() }, ...folder.pins] }
      : folder,
  );
  const all = readAll();
  all[userId] = { folders: nextFolders };
  writeAll(all);
  return { saved: true, folders: nextFolders };
}

export function removeRoutePin(userId, folderId, routeId) {
  const folders = getPinFolders(userId).map((folder) =>
    folder.id === folderId
      ? { ...folder, pins: folder.pins.filter((pin) => pin.id !== routeId) }
      : folder,
  );
  const all = readAll();
  all[userId] = { folders };
  writeAll(all);
  return folders;
}

export function removeRoutePinEverywhere(userId, routeId) {
  const folders = getPinFolders(userId).map((folder) => ({
    ...folder,
    pins: folder.pins.filter((pin) => pin.id !== routeId),
  }));
  const all = readAll();
  all[userId] = { folders };
  writeAll(all);
  return folders;
}

export function reorderPins(userId, folderId, fromIndex, toIndex) {
  const folders = getPinFolders(userId).map((folder) => {
    if (folder.id !== folderId) return folder;
    const pins = [...folder.pins];
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= pins.length || toIndex >= pins.length) {
      return folder;
    }
    const [moved] = pins.splice(fromIndex, 1);
    pins.splice(toIndex, 0, moved);
    return { ...folder, pins };
  });
  const all = readAll();
  all[userId] = { folders };
  writeAll(all);
  return folders;
}

export function isRoutePinned(userId, routeId) {
  return getPinFolders(userId).some((folder) => folder.pins.some((pin) => pin.id === routeId));
}

export function countPins(folders = []) {
  return folders.reduce((total, folder) => total + folder.pins.length, 0);
}
