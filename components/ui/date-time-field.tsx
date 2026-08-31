'use client';

import { Calendar } from 'lucide-react';
import { useRef } from 'react';
import type { CSSProperties } from 'react';

interface DateTimeFieldProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
  style?: CSSProperties;
  'aria-label'?: string;
}

function formatDisplay(value: string) {
  if (!value) return '';
  const [date, time = ''] = value.split('T');
  const [year, month, day] = date.split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}${time ? ` ${time}` : ''}`;
}

export function DateTimeField({ value, onChange, required, placeholder = 'DD/MM/YYYY HH:MM', className = '', style, 'aria-label': ariaLabel }: DateTimeFieldProps) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const openPicker = () => {
    const picker = pickerRef.current;
    if (!picker) return;
    if (typeof picker.showPicker === 'function') picker.showPicker();
    else picker.click();
  };

  return (
    <div className="relative">
      <input
        type="text"
        readOnly
        required={required}
        value={formatDisplay(value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onClick={openPicker}
        className={`${className} pr-9 cursor-pointer`}
        style={style}
      />
      <input
        ref={pickerRef}
        type="datetime-local"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        tabIndex={-1}
        aria-hidden="true"
        className="absolute right-0 top-0 h-full w-8 opacity-0 cursor-pointer"
      />
      <button
        type="button"
        onClick={openPicker}
        tabIndex={-1}
        aria-label="Open date and time picker"
        className="absolute right-2 top-1/2 -translate-y-1/2"
      >
        <Calendar className="w-4 h-4" style={{ color: 'var(--primary)' }} />
      </button>
    </div>
  );
}
