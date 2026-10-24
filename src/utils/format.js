// 공통 포맷 유틸

/** 키패드로 20070305 를 입력하면 2007-03-05 로 자동 변환 */
export function formatBirthDateInput(raw) {
  const digits = String(raw ?? '').replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

/** YYYY-MM-DD 형식이면서 실제 존재하는 날짜인지 확인 */
export function isValidBirthDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1900 || year > new Date().getFullYear()) return false;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function calculateAge(birthDate) {
  if (!isValidBirthDate(birthDate)) return null;
  const today = new Date();
  const birth = new Date(`${birthDate}T00:00:00`);
  let age = today.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

export function formatDistance(km) {
  if (km == null) return '';
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${Number(km).toFixed(1)}km`;
}

export function formatClock(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const h = String(Math.floor(safe / 3600)).padStart(2, '0');
  const m = String(Math.floor((safe % 3600) / 60)).padStart(2, '0');
  const s = String(safe % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

/** '2007-03-05' → '2007년 3월 5일' */
export function formatBirthDateKo(value) {
  if (!isValidBirthDate(value)) return value || '';
  const [year, month, day] = value.split('-').map(Number);
  return `${year}년 ${month}월 ${day}일`;
}
