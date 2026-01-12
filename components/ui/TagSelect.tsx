import React, { useState, useRef, useEffect } from 'react';

export type TagSelectProps = {
  label?: string;
  values: string[];
  suggestions?: string[]; // base suggestions
  placeholder?: string;
  onChange: (vals: string[]) => void;
  allowCustom?: boolean; // allow arbitrary new tokens
  otherLabel?: string; // label for custom input trigger
  disabled?: boolean;
  className?: string;
};

// Utility: normalize value (trim + collapse spaces)
function norm(v: string) {
  return v.trim().replace(/\s+/g, ' ');
}

export function TagSelect({
  label,
  values,
  suggestions = [],
  placeholder,
  onChange,
  allowCustom = true,
  otherLabel = 'Otro…',
  disabled = false,
  className = ''
}: TagSelectProps) {
  const [input, setInput] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [filter, setFilter] = useState('');
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as any)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  function commitTokens(raw: string) {
    const parts = raw.split(/[;,]/).map(norm).filter(Boolean);
    if (!parts.length) return;
    const next = [...values];
    for (const p of parts) {
      if (!next.some(v => v.toLowerCase() === p.toLowerCase())) {
        next.push(p);
      }
    }
    onChange(next);
  }

  function addToken(tok: string) {
    const v = norm(tok);
    if (!v) return;
    if (!values.some(t => t.toLowerCase() === v.toLowerCase())) {
      onChange([...values, v]);
    }
  }

  function removeToken(idx: number) {
    const next = values.filter((_, i) => i !== idx);
    onChange(next);
  }

  const filtered = suggestions.filter(s => !values.some(v => v.toLowerCase() === s.toLowerCase()) && s.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div ref={wrapperRef} className={`flex flex-col gap-1 ${className}`}>
      {label && <label className="text-sm font-medium">{label}</label>}
      <div className={`flex flex-wrap gap-1 p-2 border rounded bg-white dark:bg-zinc-900 min-h-[42px] ${disabled ? 'opacity-50' : ''}`}
        onClick={() => { if (!disabled) setShowMenu(true); }}>
        {values.map((v, i) => (
          <span key={v} className="flex items-center gap-1 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200 px-2 py-0.5 rounded text-xs">
            {v}
            {!disabled && (
              <button type="button" aria-label={`Eliminar ${v}`} onClick={() => removeToken(i)} className="text-[10px] hover:text-red-600">✕</button>
            )}
          </span>
        ))}
        <input
          type="text"
          disabled={disabled}
          value={input}
          onChange={e => {
            setInput(e.target.value);
            setFilter(e.target.value);
            if (!showMenu) setShowMenu(true);
            // Token commit on trailing comma/semicolon
            if (/[;,]$/.test(e.target.value)) {
              commitTokens(e.target.value.slice(0, -1));
              setInput('');
              setFilter('');
            }
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commitTokens(input);
              setInput('');
              setFilter('');
            } else if (e.key === 'Escape') {
              setShowMenu(false); setFilter(''); setInput('');
            } else if (e.key === 'Backspace' && !input && values.length && !disabled) {
              // Quick remove last
              removeToken(values.length - 1);
            }
          }}
          placeholder={placeholder}
          className="flex-1 min-w-[160px] text-sm outline-none bg-transparent"
        />
      </div>
      {showMenu && !disabled && (
        <div className="border rounded bg-white dark:bg-zinc-800 shadow-sm max-h-48 overflow-auto text-sm">
          {filtered.length === 0 && allowCustom && filter.trim() && (
            <button
              type="button"
              onClick={() => { addToken(filter); setFilter(''); setInput(''); setShowMenu(false); }}
              className="w-full text-left px-2 py-1 hover:bg-blue-50 dark:hover:bg-zinc-700"
            >
              Añadir "{filter.trim()}"
            </button>
          )}
          {filtered.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => { addToken(s); setFilter(''); setInput(''); }}
              className="w-full text-left px-2 py-1 hover:bg-blue-50 dark:hover:bg-zinc-700"
            >
              {s}
            </button>
          ))}
          {allowCustom && (
            <button
              type="button"
              onClick={() => { setFilter(''); setInput(''); const otherVal = prompt('Ingresar valor personalizado:'); if (otherVal) addToken(otherVal); setShowMenu(false); }}
              className="w-full text-left px-2 py-1 hover:bg-blue-100 dark:hover:bg-zinc-700 border-t"
            >
              {otherLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default TagSelect;
