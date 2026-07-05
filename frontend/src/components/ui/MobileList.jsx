import { cx } from './utils.js';

/*
 * Mobile card-list pattern (Day 6 of MOBILE-15-DAY-PLAN.md).
 * Replaces data tables below the md breakpoint:
 *   <div className="hidden overflow-x-auto md:block"><table>…</table></div>
 *   <MobileCardList>{items.map(… <MobileListCard/> …)}</MobileCardList>
 */

export function MobileCardList({ className, children }) {
  return <div className={cx('divide-y divide-slate-100 md:hidden', className)}>{children}</div>;
}

export function MobileListCard({ onClick, leading, title, badge, subtitle, value, valueSub, valueClass, action }) {
  const body = (
    <>
      {leading ? <div className="shrink-0">{leading}</div> : null}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="min-w-0 truncate text-sm font-bold text-slate-950">{title}</p>
          {badge ? <span className="shrink-0">{badge}</span> : null}
        </div>
        {subtitle ? <p className="mt-0.5 truncate text-xs font-medium text-slate-500">{subtitle}</p> : null}
      </div>
      <div className="shrink-0 text-right">
        {value != null ? <p className={cx('text-sm font-bold tabular-nums', valueClass || 'text-slate-950')}>{value}</p> : null}
        {valueSub ? <p className="mt-0.5 text-xs font-medium tabular-nums text-slate-500">{valueSub}</p> : null}
      </div>
    </>
  );

  return (
    <div className="flex items-center gap-2 px-4">
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="flex min-h-[64px] min-w-0 flex-1 items-center gap-3 py-2.5 text-left transition active:bg-slate-50"
        >
          {body}
        </button>
      ) : (
        <div className="flex min-h-[64px] min-w-0 flex-1 items-center gap-3 py-2.5">{body}</div>
      )}
      {action ? <div className="flex shrink-0 items-center gap-1">{action}</div> : null}
    </div>
  );
}
