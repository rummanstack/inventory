import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Info, Loader2, PackageOpen, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip as ChartTooltip,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { useInventoryApp } from '../app/useInventoryApp.jsx';
import { getCssVar } from '../utils/theme.js';
import { formatCurrency, formatNumber } from '../utils/calculations.js';

ChartJS.register(ArcElement, BarElement, CategoryScale, Filler, LinearScale, LineElement, PointElement, ChartTooltip, Legend);
ChartJS.defaults.font.family = "'Inter', 'Segoe UI Variable', 'Segoe UI', 'Avenir Next', sans-serif";

const chartTooltipStyle = {
  backgroundColor: getCssVar('--tooltip-bg', 'rgba(15, 23, 42, 0.94)'),
  titleColor: getCssVar('--chart-tooltip-title', '#f8fafc'),
  bodyColor: getCssVar('--chart-tooltip-body', '#e2e8f0'),
  padding: 12,
  cornerRadius: 12,
  displayColors: true,
  boxPadding: 4,
  titleFont: { weight: '700', size: 12 },
  bodyFont: { weight: '600', size: 12 },
};

const chartAxisTickStyle = { color: getCssVar('--highlight', '#94a3b8'), font: { weight: '700', size: 11 } };
const chartGridStyle = { color: getCssVar('--chart-grid', 'rgba(148,163,184,0.16)'), drawBorder: false };

function hexToRgba(color, alpha) {
  if (!color) return `rgba(37, 99, 235, ${alpha})`;
  if (color.startsWith('#')) {
    let hex = color.slice(1);
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    const num = parseInt(hex, 16);
    return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
  }
  if (color.startsWith('rgb')) {
    const [r = 0, g = 0, b = 0] = color.match(/[\d.]+/g) || [];
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}

function buildAreaGradient(chart, color) {
  const { ctx, chartArea } = chart;
  if (!chartArea) return hexToRgba(color, 0.18);
  const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
  gradient.addColorStop(0, hexToRgba(color, 0.34));
  gradient.addColorStop(1, hexToRgba(color, 0.02));
  return gradient;
}

function buildBarGradient(chart, color) {
  const { ctx, chartArea } = chart;
  if (!chartArea) return color;
  const gradient = ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
  gradient.addColorStop(0, hexToRgba(color, 0.55));
  gradient.addColorStop(1, hexToRgba(color, 0.98));
  return gradient;
}

export function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function Modal({ title, description, children, onClose, width = 'max-w-2xl' }) {
  const { t } = useInventoryApp();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[10px] no-print">
      <div className={cx('panel-strong w-full overflow-hidden', width)}>
        <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50/80 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-950">{title}</h2>
            {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
          </div>
          <button type="button" className="icon-btn" title={t('common.close')} onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[calc(100vh-10rem)] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'rose',
  onConfirm,
  onCancel,
}) {
  const tones = {
    rose: 'border-rose-200 bg-rose-50 text-rose-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    blue: 'border-[var(--muted)] bg-[var(--secondary-soft)] text-[var(--secondary-strong)]',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    slate: 'border-slate-200 bg-slate-100 text-slate-700',
  };

  if (!open) {
    return null;
  }

  const toneIcon = {
    rose: AlertTriangle,
    amber: AlertTriangle,
    blue: Info,
    emerald: CheckCircle2,
    slate: Info,
  };
  const toneButton = {
    rose: 'bg-rose-600 text-white shadow-[0_14px_28px_rgba(225,29,72,0.22)] hover:bg-rose-700 focus:ring-rose-100',
    amber: 'bg-amber-500 text-white shadow-[0_14px_28px_rgba(245,158,11,0.22)] hover:bg-amber-600 focus:ring-amber-100',
    blue: 'bg-[var(--secondary)] text-white shadow-[0_14px_28px_var(--secondary-shadow)] hover:bg-[var(--secondary-strong)] focus:ring-[var(--secondary-soft)]',
    emerald: 'bg-emerald-600 text-white shadow-[0_14px_28px_rgba(5,150,105,0.22)] hover:bg-emerald-700 focus:ring-emerald-100',
    slate: 'bg-slate-800 text-white shadow-[0_14px_28px_rgba(15,23,42,0.18)] hover:bg-slate-900 focus:ring-slate-100',
  };
  const Icon = toneIcon[tone] || toneIcon.rose;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[10px] no-print">
      <div className="panel-strong w-full max-w-lg overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-5">
          <div className="flex items-start gap-3">
            <div className={cx('rounded-2xl p-2.5', tones[tone] || tones.rose)}>
              <Icon size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <span className={cx('inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.2em]', tones[tone] || tones.rose)}>
                {title}
              </span>
              <p className="mt-3 text-sm font-medium leading-6 text-slate-600">{description}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col-reverse gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-end">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className={cx('btn-primary', toneButton[tone] || toneButton.rose)} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function SectionHeader({ eyebrow, description, action }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="brand-chip">
            {eyebrow}
          </p>
        ) : null}
        {description ? <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}

export function Sparkline({ data = [], color = getCssVar('--secondary', '#2563eb'), height = 40 }) {
  if (!data.length) {
    return null;
  }

  const chartData = {
    labels: data.map((_, index) => index),
    datasets: [{
      data,
      borderColor: color,
      backgroundColor: (context) => buildAreaGradient(context.chart, color),
      fill: true,
      tension: 0.4,
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 0,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 600, easing: 'easeOutQuart' },
    scales: {
      x: { display: false },
      y: { display: false },
    },
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
  };

  return (
    <div style={{ height }} aria-hidden="true">
      <Line data={chartData} options={options} />
    </div>
  );
}

export function RadialProgressChart({ value = 0, label, valueLabel, color = getCssVar('--secondary', '#2563eb'), trackColor = getCssVar('--muted', '#cbd5e1'), size = 168 }) {
  const clamped = Math.max(0, Math.min(100, Number(value) || 0));

  const chartData = {
    labels: [label || '', ''],
    datasets: [{
      data: [clamped, 100 - clamped],
      backgroundColor: [color, hexToRgba(trackColor, 0.32)],
      hoverBackgroundColor: [color, hexToRgba(trackColor, 0.32)],
      borderWidth: 0,
      circumference: 360,
      rotation: -90,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '76%',
    animation: { animateRotate: true, duration: 900, easing: 'easeOutQuart' },
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
  };

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <Doughnut data={chartData} options={options} />
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-black tracking-tight text-slate-950">{valueLabel ?? `${clamped}%`}</span>
        {label ? <span className="mt-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</span> : null}
      </div>
    </div>
  );
}

function heatmapActivityLabel(cell) {
  if (!cell.count) return 'No activity';
  if (cell.intensity >= 0.75) return 'Peak activity day';
  if (cell.intensity >= 0.4) return 'Above average';
  return 'Light activity';
}

const heatmapFullDateFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

function HeatmapTooltip({ anchor, cell }) {
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
            Issues
          </span>
          <span>{cell.issued}</span>
        </div>
        <div className="flex items-center justify-between gap-3 text-[11px] font-bold" style={{ color: tooltipBodyColor }}>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: getCssVar('--success', '#0f766e') }} />
            Settlements
          </span>
          <span>{cell.settled}</span>
        </div>
      </div>

      {(cell.issuedPieces || cell.soldPieces || cell.returnedPieces) ? (
        <div className="mt-2.5 space-y-1 border-t border-white/10 pt-2">
          <div className="flex items-center justify-between gap-3 text-[11px] font-bold" style={{ color: tooltipBodyColor }}>
            <span>Pieces issued</span>
            <span>{formatNumber(cell.issuedPieces)}</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-[11px] font-bold" style={{ color: tooltipBodyColor }}>
            <span>Pieces sold</span>
            <span>{formatNumber(cell.soldPieces)}</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-[11px] font-bold" style={{ color: tooltipBodyColor }}>
            <span>Pieces returned</span>
            <span>{formatNumber(cell.returnedPieces)}</span>
          </div>
        </div>
      ) : null}

      {cell.settled ? (
        <div className="mt-2.5 space-y-1 border-t border-white/10 pt-2">
          <div className="flex items-center justify-between gap-3 text-[11px] font-bold" style={{ color: tooltipBodyColor }}>
            <span>Total payable</span>
            <span>{formatCurrency(cell.totalPayable)}</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-[11px] font-bold" style={{ color: tooltipBodyColor }}>
            <span>Collected</span>
            <span>{formatCurrency(cell.amountPaid)}</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-[11px] font-bold" style={{ color: tooltipBodyColor }}>
            <span>Due</span>
            <span>{formatCurrency(cell.dueAmount)}</span>
          </div>
        </div>
      ) : null}

      {dsrNames.length ? (
        <div className="mt-2.5 border-t border-white/10 pt-2">
          <p className="text-[9px] font-black uppercase tracking-[0.18em]" style={{ color: getCssVar('--highlight', '#94a3b8') }}>
            Active DSRs
          </p>
          <p className="mt-1 text-[11px] font-semibold leading-snug" style={{ color: tooltipBodyColor }}>
            {visibleDsrNames.join(', ')}
            {extraDsrCount > 0 ? ` +${extraDsrCount} more` : ''}
          </p>
        </div>
      ) : null}

      <p className="mt-2.5 border-t border-white/10 pt-2 text-[9px] font-black uppercase tracking-[0.18em]" style={{ color: getCssVar('--highlight', '#94a3b8') }}>
        {heatmapActivityLabel(cell)}
      </p>
    </div>,
    document.body,
  );
}

export function ActivityHeatmap({ cells = [], color = getCssVar('--secondary', '#2563eb') }) {
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

  const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
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

      {hovered ? <HeatmapTooltip anchor={hovered.anchor} cell={hovered.cell} /> : null}

      <div className="flex items-center justify-end gap-2.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
        <span>Less</span>
        <div className="flex gap-1">
          {legendStops.map((stop) => (
            <span
              key={stop}
              className="h-3.5 w-3.5 rounded-md ring-1 ring-inset ring-slate-900/[0.05]"
              style={{ backgroundColor: stop === 0 ? emptyTone : hexToRgba(color, 0.16 + stop * 0.76) }}
            />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  );
}

export function StatCard({ title, value, helper, icon: Icon, tone = 'blue', trend }) {
  const tones = {
    blue: {
      card: 'from-white to-[var(--secondary-soft)]',
      icon: 'bg-[var(--secondary)] text-white shadow-[0_10px_20px_var(--secondary-shadow)]',
      accent: 'bg-[var(--secondary-strong)]',
      spark: getCssVar('--secondary', '#2563eb'),
    },
    emerald: {
      card: 'from-white to-emerald-50/75',
      icon: 'bg-emerald-600 text-white shadow-[0_10px_20px_rgba(5,150,105,0.24)]',
      accent: 'bg-emerald-500',
      spark: '#059669',
    },
    amber: {
      card: 'from-white to-amber-50/80',
      icon: 'bg-amber-500 text-white shadow-[0_10px_20px_rgba(245,158,11,0.22)]',
      accent: 'bg-amber-400',
      spark: '#f59e0b',
    },
    indigo: {
      card: 'from-white to-indigo-50/75',
      icon: 'bg-indigo-600 text-white shadow-[0_10px_20px_rgba(79,70,229,0.24)]',
      accent: 'bg-indigo-500',
      spark: '#4f46e5',
    },
    rose: {
      card: 'from-white to-rose-50/75',
      icon: 'bg-rose-600 text-white shadow-[0_10px_20px_rgba(225,29,72,0.22)]',
      accent: 'bg-rose-500',
      spark: '#e11d48',
    },
    slate: {
      card: 'from-white to-slate-100/80',
      icon: 'bg-slate-800 text-white shadow-[0_10px_20px_rgba(15,23,42,0.18)]',
      accent: 'bg-slate-400',
      spark: '#475569',
    },
  };
  const toneSet = tones[tone] || tones.blue;

  return (
    <div className={cx('group relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-gradient-to-br p-4 shadow-[0_18px_45px_rgba(15,23,42,0.07)] ring-1 ring-slate-900/[0.03] transition hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(15,23,42,0.11)]', toneSet.card)}>
      <div className={cx('absolute inset-x-0 top-0 h-1', toneSet.accent)} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-black tracking-normal text-slate-950">{value}</p>
        </div>
        {Icon ? (
          <div className={cx('rounded-lg p-2.5 transition group-hover:scale-105', toneSet.icon)}>
            <Icon size={20} />
          </div>
        ) : null}
      </div>
      {helper ? <p className="mt-3 text-xs font-medium text-slate-500">{helper}</p> : null}
      {trend && trend.length > 1 ? (
        <div className="-mx-1 -mb-1 mt-3 opacity-80 transition group-hover:opacity-100">
          <Sparkline data={trend} color={toneSet.spark} height={36} />
        </div>
      ) : null}
    </div>
  );
}

export function Badge({ children, tone = 'slate' }) {
  const tones = {
    blue: 'bg-[var(--secondary-soft)] text-[var(--secondary-strong)] ring-[var(--secondary-soft)]',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-800 ring-amber-100',
    rose: 'bg-rose-50 text-rose-700 ring-rose-100',
    teal: 'bg-teal-50 text-teal-700 ring-teal-100',
    purple: 'bg-purple-50 text-purple-700 ring-purple-100',
    slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  };

  return (
    <span className={cx('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-black ring-1', tones[tone] || tones.slate)}>
      {children}
    </span>
  );
}

export function EmptyState({ title = 'No data found', description = 'Add records to see them here.', icon: Icon = PackageOpen }) {
  const { t } = useInventoryApp();
  const resolvedTitle = title === 'No data found' ? t('common.noData') : title;
  const resolvedDescription = description === 'Add records to see them here.' ? t('common.addRecords') : description;

  return (
    <div className="flex min-h-52 flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-200 bg-slate-50/60 px-6 py-10 text-center">
      <div className="rounded-2xl bg-white p-3 text-slate-500 shadow-[0_12px_24px_rgba(15,23,42,0.06)] ring-1 ring-slate-200">
        <Icon size={24} />
      </div>
      <h3 className="mt-4 text-base font-bold text-slate-900">{resolvedTitle}</h3>
      <p className="mt-1 max-w-md text-sm font-medium text-slate-500">{resolvedDescription}</p>
    </div>
  );
}

export function Alert({ type = 'info', children }) {
  const tones = {
    info: 'border-[var(--muted)] bg-[var(--secondary-soft)] text-[var(--secondary-strong)]',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
    error: 'border-rose-200 bg-rose-50 text-rose-800',
  };

  return <div className={cx('rounded-2xl border px-4 py-3 text-sm font-medium shadow-[0_10px_22px_rgba(15,23,42,0.04)]', tones[type] || tones.info)}>{children}</div>;
}

export function LoadingState({ title, description, compact = false }) {
  return (
    <div className={cx('panel relative overflow-hidden', compact ? 'min-h-32 p-4' : 'min-h-64 p-6')}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.08),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.08),transparent_35%)]" />
        <div className="relative flex flex-col items-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--secondary-strong),var(--bg-dark))] text-white shadow-[0_16px_32px_rgba(15,23,42,0.18)]">
          <Loader2 size={22} className="animate-spin" />
        </div>
        <div className="mt-5 grid w-full max-w-sm gap-2">
          <div className={cx('mx-auto h-3 rounded-full bg-slate-200/90', compact ? 'w-2/3' : 'w-3/4')} />
          <div className="mx-auto h-2.5 w-1/2 rounded-full bg-slate-200/80" />
          <div className="mx-auto h-2.5 w-5/6 rounded-full bg-slate-100" />
        </div>
        {title ? <h3 className="mt-4 text-base font-bold text-slate-950">{title}</h3> : null}
        {description ? <p className="mt-1 max-w-md text-sm font-medium text-slate-500">{description}</p> : null}
      </div>
    </div>
  );
}

export function PageLoadingState({ title, description }) {
  return (
    <div className="page-shell">
      <div className="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-6">
        <div className="w-full">
          <LoadingState title={title} description={description} />
        </div>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 6, columns = 5, showHeader = true }) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-[0_16px_35px_rgba(15,23,42,0.05)]">
      {showHeader ? (
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="h-4 w-48 animate-pulse rounded-full bg-slate-200" />
            <div className="h-8 w-28 animate-pulse rounded-full bg-slate-100" />
          </div>
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="table-head">
            <tr>
              {Array.from({ length: columns }).map((_, index) => (
                <th key={index} className="px-4 py-3">
                  <div className="h-3 w-16 animate-pulse rounded-full bg-slate-200" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-transparent">
                {Array.from({ length: columns }).map((__, colIndex) => (
                  <td key={colIndex} className="table-cell">
                    <div
                      className="h-4 animate-pulse rounded-full bg-slate-200"
                      style={{ width: `${Math.max(34, 76 - colIndex * 8)}%` }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const PAGINATION_ELLIPSIS = 'ellipsis';

function buildPaginationPages(current, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const candidates = new Set([1, 2, total - 1, total, current - 1, current, current + 1]);
  const sorted = [...candidates].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);

  const pages = [];
  let previous = 0;
  for (const page of sorted) {
    if (previous && page - previous > 1) {
      pages.push(PAGINATION_ELLIPSIS);
    }
    pages.push(page);
    previous = page;
  }

  return pages;
}

export function Pagination({ page, totalPages, onPageChange, className = '' }) {
  if (!totalPages || totalPages <= 1) {
    return null;
  }

  return (
    <div className={cx('flex items-center justify-center gap-1.5', className)}>
      <button
        type="button"
        className="icon-btn"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      {buildPaginationPages(page, totalPages).map((entry, index) => (
        entry === PAGINATION_ELLIPSIS ? (
          <span key={`ellipsis-${index}`} className="px-1.5 text-sm text-slate-400">
            …
          </span>
        ) : (
          <button
            key={entry}
            type="button"
            className={cx(
              'h-9 min-w-[2.25rem] rounded-full px-3 text-sm font-semibold transition',
              entry === page ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100',
            )}
            onClick={() => onPageChange(entry)}
          >
            {entry}
          </button>
        )
      ))}
      <button
        type="button"
        className="icon-btn"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ToastViewport({ toasts, onDismiss }) {
  const { t } = useInventoryApp();
  const icons = {
    success: CheckCircle2,
    error: AlertTriangle,
    warning: AlertTriangle,
    info: Info,
  };

  const tones = {
    success: {
      shell: 'border-emerald-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(236,253,245,0.98))] text-emerald-950',
      icon: 'bg-emerald-600 text-white shadow-[0_10px_24px_rgba(5,150,105,0.28)]',
      bar: 'bg-emerald-500',
    },
    error: {
      shell: 'border-rose-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(255,241,242,0.98))] text-rose-950',
      icon: 'bg-rose-600 text-white shadow-[0_10px_24px_rgba(225,29,72,0.26)]',
      bar: 'bg-rose-500',
    },
    warning: {
      shell: 'border-amber-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(255,251,235,0.98))] text-amber-950',
      icon: 'bg-amber-500 text-white shadow-[0_10px_24px_rgba(245,158,11,0.24)]',
      bar: 'bg-amber-400',
    },
    info: {
      shell: 'border-sky-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(240,249,255,0.98))] text-slate-950',
      icon: 'bg-sky-600 text-white shadow-[0_10px_24px_rgba(2,132,199,0.24)]',
      bar: 'bg-sky-500',
    },
  };

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[70] flex w-[min(420px,calc(100vw-2rem))] flex-col gap-3 no-print">
      {toasts.map((toast) => {
        const Icon = icons[toast.type] || Info;
        const tone = tones[toast.type] || tones.info;
        return (
          <div key={toast.id} className={cx('pointer-events-auto overflow-hidden rounded-[28px] border shadow-[0_24px_50px_rgba(15,23,42,0.14)] backdrop-blur', tone.shell)}>
            <div className={cx('h-1.5 w-full', tone.bar)} />
            <div className="relative flex items-start gap-3 px-4 py-4">
              <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full bg-white/50 blur-2xl" />
              <div className={cx('relative mt-0.5 rounded-2xl p-2.5', tone.icon)}>
                <Icon size={18} strokeWidth={2.4} />
              </div>
              <div className="relative min-w-0 flex-1">
                <p className="text-sm font-black tracking-tight">{toast.title}</p>
                {toast.message ? <p className="mt-1 text-sm font-medium leading-6 text-slate-600">{toast.message}</p> : null}
              </div>
              <button
                type="button"
                className="relative inline-flex h-8 w-8 items-center justify-center rounded-2xl border border-white/70 bg-white/70 text-slate-500 shadow-sm transition hover:bg-white hover:text-slate-900"
                onClick={() => onDismiss(toast.id)}
                aria-label={t('common.close')}
              >
                <X size={16} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ChartPanel({ title, description, action, children, className = '' }) {
  return (
    <section className={cx('surface overflow-hidden', className)}>
      <div className="flex items-start justify-between gap-4 border-b border-slate-100/80 px-5 py-4">
        <div>
          <h2 className="text-base font-black text-slate-950">{title}</h2>
          {description ? <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-slate-500">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function DonutChart({ data, valueFormatter = (value) => value, centerLabel = 'Total', centerValue, size = 220 }) {
  const total = data.reduce((sum, item) => sum + Number(item.value || 0), 0);

  const chartData = {
    labels: data.map((item) => item.label),
    datasets: [{
      data: data.map((item) => Number(item.value || 0)),
      backgroundColor: data.map((item) => item.color),
      borderColor: getCssVar('--surface-white', '#ffffff'),
      borderWidth: 3,
      borderRadius: 10,
      spacing: 3,
      hoverOffset: 12,
      hoverBorderWidth: 4,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    animation: { animateRotate: true, animateScale: true, duration: 800, easing: 'easeOutQuart' },
    plugins: {
      legend: { display: false },
      tooltip: {
        ...chartTooltipStyle,
        callbacks: {
          label: (context) => `${context.label}: ${valueFormatter(context.parsed)}`,
        },
      },
    },
  };

  return (
    <div className="flex flex-col items-center gap-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="relative" style={{ width: size, height: size }}>
        <Doughnut data={chartData} options={options} />
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">{centerLabel}</span>
          <span className="mt-2 text-3xl font-black tracking-tight text-slate-950">{centerValue ?? valueFormatter(total)}</span>
        </div>
      </div>
      <div className="grid w-full gap-3">
        {data.map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-100 bg-white/70 px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="truncate text-sm font-bold text-slate-700">{item.label}</span>
              </div>
              <span className="shrink-0 text-sm font-black text-slate-950">{valueFormatter(item.value)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TrendChart({ data, series, valueFormatter = (value) => value, height = 260 }) {
  const chartData = {
    labels: data.map((item) => item.label),
    datasets: series.map((entry) => ({
      label: entry.label,
      data: data.map((item) => Number(item[entry.key] || 0)),
      borderColor: entry.color,
      backgroundColor: entry.fill ? (context) => buildAreaGradient(context.chart, entry.color) : 'transparent',
      fill: Boolean(entry.fill),
      tension: 0.4,
      borderWidth: 3,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointBackgroundColor: getCssVar('--surface-white', '#ffffff'),
      pointBorderColor: entry.color,
      pointBorderWidth: 2.5,
      pointHoverBackgroundColor: entry.color,
      pointHoverBorderColor: getCssVar('--surface-white', '#ffffff'),
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    animation: { duration: 700, easing: 'easeOutQuart' },
    scales: {
      x: { grid: { display: false }, ticks: chartAxisTickStyle },
      y: { grid: chartGridStyle, ticks: { ...chartAxisTickStyle, callback: (value) => valueFormatter(value) } },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        ...chartTooltipStyle,
        callbacks: {
          label: (context) => `${context.dataset.label}: ${valueFormatter(context.parsed.y)}`,
        },
      },
    },
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {series.map((entry) => (
          <div key={entry.key} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
            {entry.label}
          </div>
        ))}
      </div>
      <div
        className="rounded-[28px] border border-slate-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(243,247,250,0.95))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
        style={{ height }}
      >
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}

export function HorizontalBarChart({ data, valueFormatter = (value) => value, trackClassName = '', valueKey = 'value' }) {
  const chartData = {
    labels: data.map((item) => item.label),
    datasets: [{
      data: data.map((item) => Number(item[valueKey] || 0)),
      backgroundColor: (context) => {
        const item = data[context.dataIndex];
        return buildBarGradient(context.chart, item?.color || getCssVar('--secondary', '#2563eb'));
      },
      borderRadius: 10,
      borderSkipped: false,
      barThickness: 22,
      maxBarThickness: 26,
      hoverBackgroundColor: (context) => data[context.dataIndex]?.color || getCssVar('--secondary-strong', '#1d4ed8'),
    }],
  };

  const options = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 700, easing: 'easeOutQuart' },
    scales: {
      x: { grid: chartGridStyle, ticks: { ...chartAxisTickStyle, callback: (value) => valueFormatter(value) } },
      y: { grid: { display: false }, ticks: { color: getCssVar('--tick-color', '#475569'), font: { weight: '800', size: 12 } } },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        ...chartTooltipStyle,
        callbacks: {
          title: (items) => {
            const item = data[items[0].dataIndex];
            return item.meta ? `${item.label} · ${item.meta}` : item.label;
          },
          label: (context) => valueFormatter(context.parsed.x),
        },
      },
    },
  };

  return (
    <div className={cx('rounded-[24px] p-2', trackClassName)} style={{ height: Math.max(data.length * 50, 180) }}>
      <Bar data={chartData} options={options} />
    </div>
  );
}

export function StackedBarChart({ data, segments, totalFormatter = (value) => value }) {
  const chartData = {
    labels: data.map((item) => item.label),
    datasets: segments.map((segment) => ({
      label: segment.label,
      data: data.map((item) => Number(item[segment.key] || 0)),
      backgroundColor: (context) => buildBarGradient(context.chart, segment.color),
      hoverBackgroundColor: segment.color,
      borderRadius: 8,
      borderSkipped: false,
      barThickness: 22,
      maxBarThickness: 26,
    })),
  };

  const options = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 700, easing: 'easeOutQuart' },
    scales: {
      x: { stacked: true, grid: chartGridStyle, ticks: chartAxisTickStyle },
      y: { stacked: true, grid: { display: false }, ticks: { color: getCssVar('--tick-color', '#475569'), font: { weight: '800', size: 12 } } },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        ...chartTooltipStyle,
        callbacks: {
          label: (context) => `${context.dataset.label}: ${totalFormatter(context.parsed.x)}`,
        },
      },
    },
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3">
        {segments.map((segment) => (
          <div key={segment.key} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
            {segment.label}
          </div>
        ))}
      </div>
      <div style={{ height: Math.max(data.length * 56, 200) }}>
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}
