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
import { getCssVar } from '../../utils/theme.js';
import { cx } from './utils.js';

ChartJS.register(ArcElement, BarElement, CategoryScale, Filler, LinearScale, LineElement, PointElement, ChartTooltip, Legend);
ChartJS.defaults.font.family = "'Inter', 'Segoe UI Variable', 'Segoe UI', 'Avenir Next', sans-serif";

export const chartTooltipStyle = {
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

export const chartAxisTickStyle = { color: getCssVar('--highlight', '#94a3b8'), font: { weight: '700', size: 11 } };
export const chartGridStyle = { color: getCssVar('--chart-grid', 'rgba(148,163,184,0.16)'), drawBorder: false };

export function hexToRgba(color, alpha) {
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

export function buildAreaGradient(chart, color) {
  const { ctx, chartArea } = chart;
  if (!chartArea) return hexToRgba(color, 0.18);
  const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
  gradient.addColorStop(0, hexToRgba(color, 0.34));
  gradient.addColorStop(1, hexToRgba(color, 0.02));
  return gradient;
}

export function buildBarGradient(chart, color) {
  const { ctx, chartArea } = chart;
  if (!chartArea) return color;
  const gradient = ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
  gradient.addColorStop(0, hexToRgba(color, 0.55));
  gradient.addColorStop(1, hexToRgba(color, 0.98));
  return gradient;
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
        className="rounded-[28px] border border-slate-100 bg-[linear-gradient(180deg,rgba(var(--white),0.95),rgba(243,247,250,0.95))] p-4 shadow-[inset_0_1px_0_rgba(var(--white),0.9)]"
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
