import { MOCK_PIN_FOLDERS } from '../mocks/pins';

// 내 핀 (폴더 · 저장 코스) 데이터
// ⚠️ 아직 백엔드 API 가 없어서 이 브라우저(localStorage)에만 저장해요.
//    백엔드가 생기면 아래 함수 안쪽만 apiFetch 로 바꾸면 화면은 그대로 동작합니다.
//    (예: GET /api/pins/folders, POST /api/pins/folders, DELETE /api/pins/folders/:id/courses/:courseId)

const storageKey = () => `soyo-pin-folders:${localStorage.getItem('soyo-current-user-id') || 'guest'}`;
const clone = (value) => JSON.parse(JSON.stringify(value));

function readFolders() {
  try {
    const saved = localStorage.getItem(storageKey());
    if (saved) return JSON.parse(saved);
  } catch {
    // 저장소를 못 읽으면 예시 데이터로
  }
  return clone(MOCK_PIN_FOLDERS);
}

function writeFolders(folders) {
  try {
    localStorage.setItem(storageKey(), JSON.stringify(folders));
  } catch {
    // 저장 실패해도 화면은 계속 동작
  }
  return clone(folders);
}

export async function getPinFolders() {
  return readFolders();
}

export async function createPinFolder(name) {
  const folders = readFolders();
  const trimmed = name.trim();
  if (folders.some((folder) => folder.name === trimmed)) {
    throw new Error('같은 이름의 폴더가 이미 있어요.');
  }
  folders.push({ id: `folder-${Date.now()}`, name: trimmed, createdAt: new Date().toISOString(), courses: [] });
  return writeFolders(folders);
}

export async function removePinCourse(folderId, courseId) {
  const folders = readFolders().map((folder) => (
    folder.id === folderId ? { ...folder, courses: folder.courses.filter((course) => course.id !== courseId) } : folder
  ));
  return writeFolders(folders);
}

// 직접 정렬: 코스 id 순서대로 다시 저장
export async function reorderPinCourses(folderId, courseIds) {
  const folders = readFolders().map((folder) => {
    if (folder.id !== folderId) return folder;
    const byId = new Map(folder.courses.map((course) => [course.id, course]));
    return { ...folder, courses: courseIds.map((id) => byId.get(id)).filter(Boolean) };
  });
  return writeFolders(folders);
}
