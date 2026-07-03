import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cx } from "../../../components/ui.jsx";
import { formatCurrency } from "../../../utils/calculations.js";

function buildCalendarGrid(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function toISO(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const CALENDAR_BACK_MONTHS = 12;

export function ActivityCalendar({ cells = [], today, language = "en", t }) {
  const dayHeaders = t ? t("common.weekdaysShort") : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const todayDate = today ? new Date(`${today}T00:00:00`) : new Date();

  // earliest allowed month (12 months back)
  const minDate = new Date(todayDate.getFullYear(), todayDate.getMonth() - CALENDAR_BACK_MONTHS, 1);

  const [viewYear, setViewYear] = useState(todayDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(todayDate.getMonth());

  const cellMap = new Map(cells.map((c) => [c.date, c]));

  const grid = buildCalendarGrid(viewYear, viewMonth);
  const monthLabel = new Intl.DateTimeFormat(language === "bn" ? "bn-BD" : "en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(viewYear, viewMonth, 1));

  function prevMonth() {
    const prev = new Date(viewYear, viewMonth - 1, 1);
    if (prev < minDate) return;
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewYear > todayDate.getFullYear() || (viewYear === todayDate.getFullYear() && viewMonth >= todayDate.getMonth())) return;
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  }

  const isPrevDisabled = new Date(viewYear, viewMonth - 1, 1) < minDate;
  const isNextDisabled =
    viewYear > todayDate.getFullYear() ||
    (viewYear === todayDate.getFullYear() && viewMonth >= todayDate.getMonth());

  return (
    <div>
      {/* Month navigation */}
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          disabled={isPrevDisabled}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-30"
        >
          <ChevronLeft size={15} />
        </button>
        <p className="text-sm font-semibold text-slate-800">{monthLabel}</p>
        <button
          type="button"
          onClick={nextMonth}
          disabled={isNextDisabled}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-30"
        >
          <ChevronRight size={15} />
        </button>
      </div>

      {/* Day headers */}
      <div className="mb-1 grid grid-cols-7 gap-1">
        {dayHeaders.map((d) => (
          <p key={d} className="py-1 text-center text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            {d}
          </p>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {grid.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} className="min-h-[80px] rounded-xl" />;

          const iso = toISO(viewYear, viewMonth, day);
          const cell = cellMap.get(iso);
          const isToday = iso === today;
          const hasActivity = cell && cell.revenue > 0;

          return (
            <div
              key={iso}
              className={cx(
                "flex min-h-[80px] flex-col rounded-xl p-2 ring-1 transition-colors",
                isToday
                  ? "bg-[color-mix(in_srgb,var(--brand)_8%,rgb(var(--white)))] ring-[var(--brand)]/30"
                  : hasActivity
                  ? "bg-white ring-slate-200/70"
                  : "bg-slate-50/40 ring-slate-100",
              )}
            >
              <p className={cx("text-xs font-semibold", isToday ? "text-[var(--brand)]" : "text-slate-500")}>
                {day}
              </p>

              {hasActivity && (
                <div className="mt-1 flex flex-col gap-0.5">
                  {cell.transactions > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--secondary)]" />
                      <span className="text-[9px] font-semibold text-slate-500">
                        {t ? t("common.salesCount", { count: cell.transactions }) : `${cell.transactions} sales`}
                      </span>
                    </span>
                  )}
                  <p className="mt-0.5 text-[9px] font-semibold text-emerald-700">
                    {formatCurrency(cell.revenue, language)}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
