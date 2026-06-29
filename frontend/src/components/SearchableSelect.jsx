import { useState, useRef, useEffect, useId, useCallback } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';

/**
 * SearchableSelect — accessible combobox with keyboard nav and search.
 *
 * Props:
 *   options     Array<{ value: string, label: string, sublabel?: string }>
 *   value       string | null — controlled selected value
 *   onChange    (value: string | null) => void
 *   placeholder string — shown when nothing selected
 *   searchPlaceholder string
 *   disabled    boolean
 *   clearable   boolean — show × to clear (default true)
 *   className   string — extra classes on the trigger button
 */
export function SearchableSelect({
  options = [],
  value = null,
  onChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  disabled = false,
  clearable = true,
  className = '',
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const triggerRef = useRef(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);
  const containerRef = useRef(null);

  const selected = options.find((o) => o.value === value) ?? null;

  const filtered = query.trim()
    ? options.filter((o) =>
        o.label.toLowerCase().includes(query.toLowerCase()) ||
        (o.sublabel && o.sublabel.toLowerCase().includes(query.toLowerCase()))
      )
    : options;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleDown(e) {
      if (!containerRef.current?.contains(e.target)) close();
    }
    document.addEventListener('mousedown', handleDown);
    return () => document.removeEventListener('mousedown', handleDown);
  }, [open]);

  // Focus search input when opening
  useEffect(() => {
    if (open) {
      setActiveIndex(-1);
      setTimeout(() => searchRef.current?.focus(), 0);
    }
  }, [open]);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const item = listRef.current.children[activeIndex];
    item?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  function close() {
    setOpen(false);
    setQuery('');
    setActiveIndex(-1);
  }

  function toggle() {
    if (disabled) return;
    if (open) close();
    else setOpen(true);
  }

  function select(opt) {
    onChange(opt.value);
    close();
    triggerRef.current?.focus();
  }

  function clear(e) {
    e.stopPropagation();
    onChange(null);
    triggerRef.current?.focus();
  }

  function handleSearchKey(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && filtered[activeIndex]) select(filtered[activeIndex]);
    } else if (e.key === 'Escape') {
      close();
      triggerRef.current?.focus();
    }
  }

  function handleTriggerKey(e) {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={`${id}-listbox`}
        disabled={disabled}
        onClick={toggle}
        onKeyDown={handleTriggerKey}
        className={[
          'input flex items-center justify-between gap-2 text-left',
          !selected && 'text-slate-400',
          className,
        ].filter(Boolean).join(' ')}
      >
        <span className="flex-1 truncate">
          {selected ? (
            <span className="flex items-center gap-2">
              <span className="truncate font-medium text-slate-900">{selected.label}</span>
              {selected.sublabel && (
                <span className="shrink-0 text-xs font-normal text-slate-400">{selected.sublabel}</span>
              )}
            </span>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </span>
        <span className="flex shrink-0 items-center gap-0.5">
          {clearable && selected && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              onClick={clear}
              className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X size={13} />
            </span>
          )}
          <ChevronDown
            size={15}
            className={`text-slate-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl ring-1 ring-slate-900/5">
          {/* Search box */}
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
            <Search size={14} className="shrink-0 text-slate-400" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
              onKeyDown={handleSearchKey}
              placeholder={searchPlaceholder}
              className="flex-1 bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
            />
            {query && (
              <button type="button" onClick={() => { setQuery(''); setActiveIndex(-1); searchRef.current?.focus(); }} className="shrink-0 text-slate-400 hover:text-slate-600">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Options list */}
          <ul
            ref={listRef}
            id={`${id}-listbox`}
            role="listbox"
            className="max-h-56 overflow-y-auto py-1.5"
          >
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-center text-sm text-slate-400">No results found</li>
            ) : (
              filtered.map((opt, i) => {
                const isSelected = opt.value === value;
                const isActive = i === activeIndex;
                return (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => select(opt)}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={[
                      'flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                      isActive ? 'bg-slate-50' : '',
                      isSelected ? 'text-brand font-semibold' : 'text-slate-800 font-medium',
                    ].join(' ')}
                  >
                    <span className="flex-1 truncate">
                      {opt.label}
                      {opt.sublabel && (
                        <span className="ml-2 text-xs font-normal text-slate-400">{opt.sublabel}</span>
                      )}
                    </span>
                    {isSelected && <Check size={14} className="shrink-0 text-brand" />}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
