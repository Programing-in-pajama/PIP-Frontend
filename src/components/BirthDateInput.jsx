import React, { useRef } from 'react';

/**
 * 생년월일 입력칸 — 칸 어디를 눌러도 달력이 열려요. (키보드로 직접 입력은 막음)
 * value / onChange 값 형식: 'YYYY-MM-DD' (변수 명세서 birthDate)
 *
 *  1) 지원 브라우저: 칸을 누르면 showPicker() 로 달력 열기
 *  2) 그 외 브라우저: 투명한 달력 버튼을 칸 전체 크기로 늘려서, 어디를 눌러도 달력 버튼이 눌리게 (styles.css .birth-date)
 *  휴대폰(앱·웹)은 날짜 칸을 누르면 기본으로 달력/날짜 선택창이 떠요.
 */
export default function BirthDateInput({
  value,
  onChange,
  className = 'input',
  placeholder = '생년월일',
  id,
  ...rest
}) {
  const inputRef = useRef(null);
  const today = new Date().toISOString().slice(0, 10);

  const openPicker = () => {
    try {
      inputRef.current?.showPicker?.();
    } catch {
      // showPicker 를 막는 브라우저는 칸 전체를 덮은 달력 버튼이 대신 열어 줘요.
    }
  };

  return (
    <span className={`birth-date ${value ? '' : 'is-empty'}`}>
      <input
        aria-label={placeholder}
        {...rest}
        ref={inputRef}
        id={id}
        className={`${className} birth-date-input`}
        type="date"
        min="1900-01-01"
        max={today}
        autoComplete="bday"
        value={value ?? ''}
        onClick={openPicker}
        onKeyDown={(event) => {
          if (event.key === 'Tab') return;
          event.preventDefault(); // 직접 입력 금지
          if (event.key === 'Enter' || event.key === ' ') openPicker();
        }}
        onChange={(event) => onChange?.(event.target.value)}
      />
      {!value && <span className="birth-date-placeholder" aria-hidden="true">{placeholder}</span>}
    </span>
  );
}
