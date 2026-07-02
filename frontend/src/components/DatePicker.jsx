import { createPortal } from 'react-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { cx } from './ui.jsx';
import { formatDate, formatMonth } from '../utils/calculations.js';

function toDateValue(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  const parsed = new Date(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function toMonthValue(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), 1);
  }

  const parsed = new Date(typeof value === 'string' && /^\d{4}-\d{2}$/.test(value) ? `${value}-01T00:00:00` : value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Date(parsed.getFullYear(), parsed.getMonth(), 1);
}

function toISODate(date) {
  const local = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const year = local.getFullYear();
  const month = String(local.getMonth() + 1).padStart(2, '0');
  const day = String(local.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toISOMonth(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function isSameDay(left, right) {
  return Boolean(left && right)
    && left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

function isSameMonth(left, right) {
  return Boolean(left && right)
    && left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth();
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function PickerFrame({ open, anchorRef, panelRef, children, className = '', panelWidth = 304, panelHeight = 392 }) {
  const [style, setStyle] = useState(null);

  useEffect(() => {
    if (!open || typeof window === 'undefined') {
      return undefined;
    }

    function updatePosition() {
      const anchor = anchorRef.current;
      if (!anchor) {
        return;
      }

      const rect = anchor.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const width = Math.min(panelWidth, Math.max(viewportWidth - 24, 240));
      const height = panelHeight;
      const spaceBelow = viewportHeight - rect.bottom - 12;
      const spaceAbove = rect.top - 12;
      const openAbove = spaceBelow < height && spaceAbove > spaceBelow;

      const left = clamp(rect.left, 12, Math.max(viewportWidth - width - 12, 12));
      const top = openAbove
        ? clamp(rect.top - height - 8, 12, Math.max(viewportHeight - height - 12, 12))
        : clamp(rect.bottom + 8, 12, Math.max(viewportHeight - height - 12, 12));

      setStyle({
        position: 'fixed',
        left,
        top,
        width,
        zIndex: 110,
      });
    }

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [anchorRef, open, panelHeight, panelWidth]);

  if (!open || !style || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      ref={panelRef}
      style={style}
      className={cx(
        'popover-enter rounded-card border border-slate-200 bg-white p-3 shadow-modal ring-1 ring-slate-900/[0.04]',
        className,
      )}
    >
      {children}
    </div>,
    document.body,
  );
}

export function DatePickerField({ value, onChange, placeholder = 'Select date', className = '', disabled = false, min = null, max = null }) {
  const wrapperRef = useRef(null);
  const panelRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(toDateValue(value) || new Date()));

  const selectedDate = useMemo(() => toDateValue(value), [value]);
  const minDate = useMemo(() => toDateValue(min), [min]);
  const maxDate = useMemo(() => toDateValue(max), [max]);

  useEffect(() => {
    if (open) {
      setViewMonth(startOfMonth(selectedDate || new Date()));
    }
  }, [open, selectedDate]);

  useEffect(() => {
    function onPointerDown(event) {
      const target = event.target;
      const isInsideAnchor = wrapperRef.current && wrapperRef.current.contains(target);
      const isInsidePanel = panelRef.current && panelRef.current.contains(target);

      if (!isInsideAnchor && !isInsidePanel) {
        setOpen(false);
      }
    }

    function onEscape(event) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onEscape);
    };
  }, []);

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const totalDays = daysInMonth(year, month);
  const firstDayIndex = new Date(year, month, 1).getDay();
  const days = [];

  for (let i = 0; i < firstDayIndex; i += 1) {
    days.push(null);
  }

  for (let day = 1; day <= totalDays; day += 1) {
    days.push(new Date(year, month, day));
  }

  const prevMonthDisabled = minDate ? addMonths(viewMonth, -1) < startOfMonth(minDate) : false;
  const nextMonthDisabled = maxDate ? addMonths(viewMonth, 1) > startOfMonth(maxDate) : false;

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const displayValue = selectedDate ? formatDate(selectedDate) : '';

  return (
    <div ref={wrapperRef} className={cx('relative', className)}>
      <button
        type="button"
        className="input flex items-center justify-between gap-3 text-left"
        onClick={() => !disabled && setOpen((current) => !current)}
        disabled={disabled}
      >
        <span className={cx('truncate', displayValue ? 'text-slate-950' : 'text-slate-400')}>
          {displayValue || placeholder}
        </span>
        <CalendarDays size={16} className="shrink-0 text-slate-400" />
      </button>

      <PickerFrame open={open} anchorRef={wrapperRef} panelRef={panelRef} panelWidth={304} panelHeight={392}>
        <div className="flex items-center justify-between gap-2 px-1 pt-1">
          <button
            type="button"
            className="icon-btn h-9 w-9 disabled:cursor-not-allowed disabled:opacity-30"
            disabled={prevMonthDisabled}
            onClick={() => !prevMonthDisabled && setViewMonth((current) => addMonths(current, -1))}
          >
            <ChevronLeft size={16} />
          </button>
          <div className="text-sm font-semibold text-slate-950">
            {formatMonth(viewMonth)}
          </div>
          <button
            type="button"
            className="icon-btn h-9 w-9 disabled:cursor-not-allowed disabled:opacity-30"
            disabled={nextMonthDisabled}
            onClick={() => !nextMonthDisabled && setViewMonth((current) => addMonths(current, 1))}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-1 px-1 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          {weekdays.map((weekday) => (
            <div key={weekday} className="py-1">
              {weekday}
            </div>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1 px-1">
          {days.map((day, index) => {
            if (!day) {
              return <div key={`blank-${index}`} className="h-9" />;
            }

            const isDisabled = Boolean((minDate && day < minDate) || (maxDate && day > maxDate));
            const selected = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());

            return (
              <button
                key={day.toISOString()}
                type="button"
                disabled={isDisabled}
                className={cx(
                  'h-9 rounded-xl text-sm font-bold transition',
                  isDisabled
                    ? 'cursor-not-allowed opacity-25'
                    : selected
                      ? 'bg-[var(--secondary)] text-white shadow-[0_1px_2px_var(--secondary-shadow)]'
                      : 'text-slate-700 hover:bg-slate-100',
                  isToday && !selected && !isDisabled ? 'ring-1 ring-[var(--secondary-soft)]' : '',
                )}
                onClick={() => {
                  if (isDisabled) return;
                  onChange(toISODate(day));
                  setOpen(false);
                }}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>
      </PickerFrame>
    </div>
  );
}

export function MonthPickerField({ value, onChange, placeholder = 'Select month', className = '', disabled = false }) {
  const wrapperRef = useRef(null);
  const panelRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => (toMonthValue(value) || new Date()).getFullYear());

  const selectedMonth = useMemo(() => toMonthValue(value), [value]);

  useEffect(() => {
    if (open) {
      setViewYear((selectedMonth || new Date()).getFullYear());
    }
  }, [open, selectedMonth]);

  useEffect(() => {
    function onPointerDown(event) {
      const target = event.target;
      const isInsideAnchor = wrapperRef.current && wrapperRef.current.contains(target);
      const isInsidePanel = panelRef.current && panelRef.current.contains(target);

      if (!isInsideAnchor && !isInsidePanel) {
        setOpen(false);
      }
    }

    function onEscape(event) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onEscape);
    };
  }, []);

  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const displayValue = selectedMonth ? formatMonth(selectedMonth) : '';

  return (
    <div ref={wrapperRef} className={cx('relative', className)}>
      <button
        type="button"
        className="input flex items-center justify-between gap-3 text-left"
        onClick={() => !disabled && setOpen((current) => !current)}
        disabled={disabled}
      >
        <span className={cx('truncate', displayValue ? 'text-slate-950' : 'text-slate-400')}>
          {displayValue || placeholder}
        </span>
        <CalendarDays size={16} className="shrink-0 text-slate-400" />
      </button>

      <PickerFrame open={open} anchorRef={wrapperRef} panelRef={panelRef} className="w-[21rem]" panelWidth={336} panelHeight={422}>
        <div className="flex items-center justify-between gap-2 px-1 pt-1">
          <button type="button" className="icon-btn h-9 w-9" onClick={() => setViewYear((current) => current - 1)}>
            <ChevronLeft size={16} />
          </button>
          <div className="text-sm font-semibold text-slate-950">{viewYear}</div>
          <button type="button" className="icon-btn h-9 w-9" onClick={() => setViewYear((current) => current + 1)}>
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {monthLabels.map((monthLabel, monthIndex) => {
            const candidate = new Date(viewYear, monthIndex, 1);
            const selected = isSameMonth(candidate, selectedMonth);

            return (
              <button
                key={monthLabel}
                type="button"
                className={cx(
                  'rounded-2xl px-3 py-3 text-sm font-bold transition',
                  selected ? 'bg-[var(--secondary)] text-white shadow-[0_1px_2px_var(--secondary-shadow)]' : 'bg-slate-50 text-slate-700 hover:bg-slate-100',
                )}
                onClick={() => {
                  onChange(toISOMonth(candidate));
                  setOpen(false);
                }}
              >
                {monthLabel}
              </button>
            );
          })}
        </div>
      </PickerFrame>
    </div>
  );
}
