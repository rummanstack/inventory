import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getCssVar } from '../../utils/theme.js';
import { formatCurrency, formatNumber } from '../../utils/calculations.js';
import { hexToRgba } from './charts.jsx';
import { cx } from './utils.js';

function heatmapActivityLabel(cell, t) {
  if (!cell.count) return t('activityHeatmap.noActivity');
  if (cell.intensity >= 0.75) return t('activityHeatmap.peakActivityDay');
  if (cell.intensity >= 0.4) return t('activityHeatmap.aboveAverage');
  return t('activityHeatmap.lightActivity');
}

function getHeatmapLocale(language) {
  return language === 'bn' ? 'bn-BD' : 'en-US';
}

function HeatmapTooltip({ anchor, cell, t, language }) {
  const [style, setStyle] = useState(null);
  const tooltipRef = useRef(null);

  useEffect(() => {
    if (!anchor || typeof window === 'undefined') {
      return undefined;
    }

    function updatePosition() {
      const rect = anchor.getBoundingClientRect();
      const tooltip = tooltipRef.current;
      const width = tooltip ? tooltip.offsetWidth : 240;
      const height = tooltip ? tooltip.offsetHeight : 220;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const gap = 10;

      const left = Math.min(Math.max(rect.left + rect.width / 2 - width / 2, 12), Math.max(viewportWidth - width - 12, 12));
      const fitsAbove = rect.top - gap - height >= 8;
      const top = fitsAbove
        ? rect.top - gap - height
        : Math.min(rect.bottom + gap, Math.max(viewportHeight - height - 12, 12));

      setStyle({ left, top, width });
    }

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [anchor]);

  if (!style || typeof document === 'undefined') {
    return null;
  }

  const tooltipBg = getCssVar('--tooltip-bg', 'rgba(15, 23, 42, 0.96)');
  const tooltipTitleColor = getCssVar('--chart-tooltip-title', '#f8fafc');
  const tooltipBodyColor = getCssVar('--chart-tooltip-body', '#e2e8f0');
  const dayDate = new Date(`${cell.date}T00:00:00`);
  const heatmapFullDateFormatter = new Intl.DateTimeFormat(getHeatmapLocale(language), { weekday: 'long', month: 'short', day: 'numeric' });

  const dsrNames = cell.dsrNames || [];
  const visibleDsrNames = dsrNames.slice(0, 4);
  const extraDsrCount = dsrNames.length - visibleDsrNames.length;

  return createPortal(
    <div
      ref={tooltipRef}
      style={{ position: 'fixed', left: style.left, top: style.top, width: style.width, zIndex: 200, backgroundColor: tooltipBg }}
      className="pointer-events-none w-60 rounded-2xl px-4 py-3 text-left shadow-[0_24px_55px_rgba(15,23,42,0.35)] ring-1 ring-white/10"
    >
      <p className="text-[11px] font-black tracking-tight" style={{ color: tooltipTitleColor }}>
        {heatmapFullDateFormatter.format(dayDate)}
      </p>
      <div className="mt-2 space-y-1">
        <div className="flex items-center justify-between gap-3 text-[11px] font-bold" style={{ color: tooltipBodyColor }}>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: getCssVar('--secondary', '#2563eb') }} />
            {t('activityHeatmap.issues')}
          </span>
          <span>{formatNumber(cell.issued, language)}</span>
        </div>
        <div className="flex items-center justify-between gap-3 text-[11px] font-bold" style={{ color: tooltipBodyColor }}>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: getCssVar('--success', '#0f766e') }} />
            {t('activityHeatmap.settlements')}
          </span>
          <span>{formatNumber(cell.settled, language)}</span>
        </div>
      </div>

      {(cell.issuedPieces || cell.soldPieces || cell.returnedPieces) ? (
        <div className="mt-2.5 space-y-1 border-t border-white/10 pt-2">
          <div className="flex items-center justify-between gap-3 text-[11px] font-bold" style={{ color: tooltipBodyColor }}>
            <span>{t('activityHeatmap.piecesIssued')}</span>
            <span>{formatNumber(cell.issuedPieces, language)}</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-[11px] font-bold" style={{ color: tooltipBodyColor }}>
            <span>{t('activityHeatmap.piecesSold')}</span>
            <span>{formatNumber(cell.soldPieces, language)}</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-[11px] font-bold" style={{ color: tooltipBodyColor }}>
            <span>{t('activityHeatmap.piecesReturned')}</span>
            <span>{formatNumber(cell.returnedPieces, language)}</span>
          </div>
        </div>
      ) : null}

      {cell.settled ? (
        <div className="mt-2.5 space-y-1 border-t border-white/10 pt-2">
          <div className="flex items-center justify-between gap-3 text-[11px] font-bold" style={{ color: tooltipBodyColor }}>
            <span>{t('activityHeatmap.totalPayable')}</span>
            <span>{formatCurrency(cell.totalPayable, language)}</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-[11px] font-bold" style={{ color: tooltipBodyColor }}>
            <span>{t('activityHeatmap.collected')}</span>
            <span>{formatCurrency(cell.amountPaid, language)}</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-[11px] font-bold" style={{ color: tooltipBodyColor }}>
            <span>{t('activityHeatmap.due')}</span>
            <span>{formatCurrency(cell.dueAmount, language)}</span>
          </div>
        </div>
      ) : null}

      {dsrNames.length ? (
        <div className="mt-2.5 border-t border-white/10 pt-2">
          <p className="text-[9px] font-black uppercase tracking-[0.18em]" style={{ color: getCssVar('--highlight', '#94a3b8') }}>
            {t('activityHeatmap.activeDsrs')}
          </p>
          <p className="mt-1 text-[11px] font-semibold leading-snug" style={{ color: tooltipBodyColor }}>
            {visibleDsrNames.join(', ')}
            {extraDsrCount > 0 ? ` +${extraDsrCount} ${t('activityHeatmap.more')}` : ''}
          </p>
        </div>
      ) : null}

      <p className="mt-2.5 border-t border-white/10 pt-2 text-[9px] font-black uppercase tracking-[0.18em]" style={{ color: getCssVar('--highlight', '#94a3b8') }}>
        {heatmapActivityLabel(cell, t)}
      </p>
    </div>,
    document.body,
  );
}

export function ActivityHeatmap({ cells = [], color = getCssVar('--secondary', '#2563eb'), t, language = 'en' }) {
  const [hovered, setHovered] = useState(null);

  if (!cells.length) {
    return null;
  }

  const weeks = [];
  let currentWeek = new Array(cells[0].weekday).fill(null);
  cells.forEach((cell) => {
    currentWeek.push(cell);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });
  if (currentWeek.length) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  const weekdayLabels = language === 'bn'
    ? ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহ', 'শুক্র', 'শনি']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const emptyTone = getCssVar('--chart-grid', 'rgba(148,163,184,0.16)');
  const legendStops = [0, 0.22, 0.46, 0.7, 1];

  function showTooltip(event, cell) {
    setHovered({ anchor: event.currentTarget, cell });
  }

  function hideTooltip() {
    setHovered(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 overflow-x-auto premium-scrollbar pb-2">
        <div className="flex shrink-0 flex-col gap-1.5 pt-px">
          {weekdayLabels.map((label) => (
            <span key={label} className="flex h-9 items-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              {label}
            </span>
          ))}
        </div>
        <div className="flex gap-1.5">
          {weeks.map((week, weekIndex) => (
            <div key={`heatmap-week-${weekIndex}`} className="flex flex-col gap-1.5">
              {week.map((cell, dayIndex) => {
                if (!cell) {
                  return <div key={`heatmap-empty-${weekIndex}-${dayIndex}`} className="h-9 w-9" />;
                }

                const dayDate = new Date(`${cell.date}T00:00:00`);
                const lit = cell.count > 0 && cell.intensity > 0.5;

                return (
                  <div
                    key={cell.date}
                    tabIndex={0}
                    className={cx(
                      'flex h-9 w-9 cursor-default items-center justify-center rounded-xl text-xs font-black uppercase ring-1 ring-inset ring-slate-900/[0.05] outline-none transition duration-150 ease-out hover:-translate-y-1 hover:shadow-[0_14px_28px_rgba(15,23,42,0.2)] focus-visible:-translate-y-1 focus-visible:shadow-[0_14px_28px_rgba(15,23,42,0.2)]',
                      lit ? 'text-white' : 'text-slate-600',
                    )}
                    style={{ backgroundColor: cell.count ? hexToRgba(color, 0.16 + cell.intensity * 0.76) : emptyTone }}
                    onMouseEnter={(event) => showTooltip(event, cell)}
                    onMouseLeave={hideTooltip}
                    onFocus={(event) => showTooltip(event, cell)}
                    onBlur={hideTooltip}
                  >
                    {dayDate.getDate()}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {hovered ? <HeatmapTooltip anchor={hovered.anchor} cell={hovered.cell} t={t} language={language} /> : null}

      <div className="flex items-center justify-end gap-2.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
        <span>{t('activityHeatmap.less')}</span>
        <div className="flex gap-1">
          {legendStops.map((stop) => (
            <span
              key={stop}
              className="h-3.5 w-3.5 rounded-md ring-1 ring-inset ring-slate-900/[0.05]"
              style={{ backgroundColor: stop === 0 ? emptyTone : hexToRgba(color, 0.16 + stop * 0.76) }}
            />
          ))}
        </div>
        <span>{t('activityHeatmap.more')}</span>
      </div>
    </div>
  );
}
