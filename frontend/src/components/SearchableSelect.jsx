import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { createPortal } from 'react-dom';

/**
 * SearchableSelect � accessible combobox with keyboard nav and search.
 *
 * Props:
 *   options     Array<{ value: string, label: ReactNode, sublabel?: string, searchText?: string }>
 *   value       string | null � controlled selected value
 *   onChange    (value: string | null) => void
 *   placeholder string � shown when nothing selected
 *   searchPlaceholder string
 *   disabled    boolean
 *   clearable   boolean � show x to clear (default true)
 *   containerClassName string � extra classes on the outer container
 *   className   string � extra classes on the trigger button
 */
export function SearchableSelect({
  options = [],
  value = null,
  onChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  disabled = false,
  clearable = true,
  containerClassName = '',
  className = '',
  ...triggerProps
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [menuPosition, setMenuPosition] = useState({
    left: 0,
    top: 0,
    width: 0,
    maxListHeight: 224,
    placement: 'bottom',
  });
  const triggerRef = useRef(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);

  const selected = options.find((option) => option.value === value) ?? null;

  const filtered = query.trim()
    ? options.filter((option) => {
        const searchSource = [
          option.searchText,
          typeof option.label === 'string' ? option.label : '',
          option.sublabel || '',
        ].filter(Boolean).join(' ').toLowerCase();
        return searchSource.includes(query.toLowerCase());
      })
    : options;

  const updateMenuPosition = useCallback(() => {
    if (!triggerRef.current || typeof window === 'undefined') return;

    const rect = triggerRef.current.getBoundingClientRect();
    const viewportPadding = 8;
    const gap = 4;
    const searchAreaHeight = 56;
    const preferredListHeight = 224;
    const availableBelow = window.innerHeight - rect.bottom - viewportPadding;
    const availableAbove = rect.top - viewportPadding;
    const placement = availableBelow < 240 && availableAbove > availableBelow ? 'top' : 'bottom';
    const availableSpace = Math.max(placement === 'top' ? availableAbove : availableBelow, 120);
    const width = Math.min(rect.width, window.innerWidth - viewportPadding * 2);
    const left = Math.min(
      Math.max(rect.left, viewportPadding),
      Math.max(viewportPadding, window.innerWidth - width - viewportPadding)
    );

    setMenuPosition({
      left,
      top: placement === 'top' ? rect.top - gap : rect.bottom + gap,
      width,
      maxListHeight: Math.max(96, Math.min(preferredListHeight, availableSpace - searchAreaHeight)),
      placement,
    });
  }, []);

  useEffect(() => {
    if (!open) return;

    function handleDown(event) {
      if (
        containerRef.current?.contains(event.target) ||
        dropdownRef.current?.contains(event.target)
      ) {
        return;
      }
      close();
    }

    document.addEventListener('mousedown', handleDown);
    return () => document.removeEventListener('mousedown', handleDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    updateMenuPosition();
    setActiveIndex(-1);
    setTimeout(() => searchRef.current?.focus(), 0);

    function handleViewportChange() {
      updateMenuPosition();
    }

    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [open, updateMenuPosition]);

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

  function select(option) {
    if (option.disabled) return;
    onChange(option.value);
    close();
    triggerRef.current?.focus();
  }

  function clear(event) {
    event.stopPropagation();
    onChange(null);
    triggerRef.current?.focus();
  }

  function handleSearchKey(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, filtered.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (activeIndex >= 0 && filtered[activeIndex]) select(filtered[activeIndex]);
    } else if (event.key === 'Escape') {
      close();
      triggerRef.current?.focus();
    }
  }

  function handleTriggerKey(event) {
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
    }
  }

  const dropdown = open && typeof document !== 'undefined'
    ? createPortal(
        <div
          ref={dropdownRef}
          className="popover-fade fixed z-[90] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl ring-1 ring-slate-900/5"
          style={{
            left: menuPosition.left,
            top: menuPosition.top,
            width: menuPosition.width,
            transform: menuPosition.placement === 'top' ? 'translateY(-100%)' : undefined,
          }}
        >
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
            <Search size={14} className="shrink-0 text-slate-400" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleSearchKey}
              placeholder={searchPlaceholder}
              className="flex-1 bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setActiveIndex(-1);
                  searchRef.current?.focus();
                }}
                className="shrink-0 text-slate-400 hover:text-slate-600"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <ul
            ref={listRef}
            id={`${id}-listbox`}
            role="listbox"
            className="overflow-y-auto py-1.5"
            style={{ maxHeight: menuPosition.maxListHeight }}
          >
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-center text-sm text-slate-400">No results found</li>
            ) : (
              filtered.map((option, index) => {
                const isSelected = option.value === value;
                const isActive = index === activeIndex;
                const isDisabled = Boolean(option.disabled);

                return (
                  <li
                    key={option.key ?? String(option.value)}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={isDisabled}
                    onClick={() => select(option)}
                    onMouseEnter={() => !isDisabled && setActiveIndex(index)}
                    className={[
                      'flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                      isActive ? 'bg-slate-50' : '',
                      isDisabled ? 'cursor-not-allowed opacity-50' : '',
                      isSelected ? 'text-brand font-semibold' : 'text-slate-800 font-medium',
                    ].join(' ')}
                  >
                    <span className="flex-1 truncate">
                      {option.label}
                      {option.sublabel && (
                        <span className="ml-2 text-xs font-normal text-slate-400">{option.sublabel}</span>
                      )}
                    </span>
                    {isSelected && <Check size={14} className="shrink-0 text-brand" />}
                  </li>
                );
              })
            )}
          </ul>
        </div>,
        document.body
      )
    : null;

  return (
    <div
      ref={containerRef}
      className={['relative w-full', containerClassName].filter(Boolean).join(' ')}
    >
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
        {...triggerProps}
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
      {dropdown}
    </div>
  );
}
