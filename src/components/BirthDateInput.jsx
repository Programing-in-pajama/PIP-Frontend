import React from 'react';
import { formatBirthDateInput } from '../utils/format';

/**
 * 생년월일 키패드 입력
 * 20070305 → 2007-03-05
 */
export default function BirthDateInput({
  value,
  onChange,
  className = 'input',
  placeholder = '생년월일',
  id,
  ...rest
}) {
  const handleChange = (event) => {
    const next = formatBirthDateInput(event.target.value);
    onChange?.(next);
  };

  return (
    <input
      {...rest}
      id={id}
      className={className}
      type="text"
      inputMode="numeric"
      autoComplete="bday"
      maxLength={10}
      placeholder={placeholder}
      value={value ?? ''}
      onChange={handleChange}
    />
  );
}
