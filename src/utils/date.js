// 생년월일 입력 도우미
// 키패드로 숫자만 입력해도 자동으로 하이픈을 넣어줘요: 20070305 → 2007-03-05
export function formatBirthDateInput(value) {
  const digits = String(value ?? '').replace(/\D/g, '').slice(0, 8);
  if (digits.length > 6) return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
  if (digits.length > 4) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return digits;
}

// 실제로 있는 날짜인지 (2007-02-30, 13월, 미래 날짜는 false)
export function isValidBirthDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const isRealDate = date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
  return isRealDate && y >= 1900 && date <= new Date();
}
