import { useEffect, useState } from 'react';
import { CalendarClock, Plus } from 'lucide-react';
import { Alert, EmptyState, MobileCardList, MobileListCard, SectionHeader, Select, TableSkeleton } from '../../../../components/ui.jsx';
import TableReportActions from '../../../../components/TableReportActions.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../../services/inventoryApi.js';
import { useMutation } from '@tanstack/react-query';
import { useTenantApiQuery } from '../../../../queries/useTenantApiQuery.js';
import { transactionKeys } from '../../../transactions/queries/transactionQueries.js';
import { getActiveTenantId } from '../../../../services/api/client.js';

const today = () => new Date().toISOString().slice(0, 10);
const monthNow = () => new Date().toISOString().slice(0, 7);
const DAILY_ATTENDANCE_REPORT_ID = 'daily-attendance-report';
const MONTHLY_ATTENDANCE_REPORT_ID = 'monthly-attendance-report';
const ATTENDANCE_REPORT_SHORTCUTS = {
  pdf: { alt: true, key: 'd', label: 'Alt+D' },
  excel: { alt: true, key: 'e', label: 'Alt+E' },
  csv: { alt: true, key: 'c', label: 'Alt+C' },
  print: { alt: true, key: 'p', label: 'Alt+P' },
};

export default function AttendancePage() {
  const { can, pushToast, t } = useInventoryApp();
  const [date, setDate] = useState(today());
  const [month, setMonth] = useState(monthNow());
  const [form, setForm] = useState({ employeeId: '', status: 'PRESENT', checkInTime: '', checkOutTime: '', lateMinutes: 0, overtimeMinutes: 0, note: '' });
  const canManage = can('attendance.manage');
  const attendanceQuery = useTenantApiQuery({
    scope: 'attendance',
    params: { date, month },
    queryFn: async () => {
      const [employees, daily, monthly] = await Promise.all([
        inventoryApi.getActiveEmployees(),
        inventoryApi.listDailyAttendance({ date }),
        inventoryApi.getMonthlyAttendanceReport({ month }),
      ]);
      return { employees, daily, monthly };
    },
    keepPrevious: true,
  });
  const saveMutation = useMutation({
    mutationKey: transactionKeys.mutation(getActiveTenantId(), 'save-attendance'),
    mutationFn: ({ existing, payload }) => existing
      ? inventoryApi.updateAttendance({ ...payload, id: existing.id })
      : inventoryApi.createAttendance(payload),
  });
  const employees = Array.isArray(attendanceQuery.data?.employees) ? attendanceQuery.data.employees : [];
  const dailyRows = attendanceQuery.data?.daily;
  const daily = dailyRows?.items || dailyRows || [];
  const monthly = attendanceQuery.data?.monthly || null;
  const loading = attendanceQuery.isPending;
  const error = attendanceQuery.error?.message || '';

  async function save(event) {
    event.preventDefault();
    try {
      const existing = daily.find((row) => row.employeeId === form.employeeId);
      const payload = { ...form, attendanceDate: date };
      await saveMutation.mutateAsync({ existing, payload });
      setForm({ employeeId: '', status: 'PRESENT', checkInTime: '', checkOutTime: '', lateMinutes: 0, overtimeMinutes: 0, note: '' });
      pushToast('success', t('attendance.title'), existing ? t('alerts.updated') : t('alerts.created'));
      attendanceQuery.refetch();
    } catch (err) {
      pushToast('error', t('attendance.title'), err?.message || t('alerts.requestFailed'));
    }
  }

  return (
    <div>
      <SectionHeader eyebrow={t('attendance.eyebrow')} title={t('attendance.title')} description={t('attendance.description')} />
      {error ? <Alert type="error">{error}</Alert> : null}

      {canManage ? (
        <form className="surface mb-5 p-5" onSubmit={save}>
          <div className="grid gap-3 md:grid-cols-4">
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <Select className="input" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}>
              <option value="">{t('attendance.employeeLabel')}</option>
              {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
            </Select>
            <Select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="PRESENT">{t('attendance.statusPresent')}</option>
              <option value="ABSENT">{t('attendance.statusAbsent')}</option>
              <option value="LEAVE">{t('attendance.statusLeave')}</option>
              <option value="HOLIDAY">{t('attendance.statusHoliday')}</option>
            </Select>
            <button type="submit" className="btn-primary"><Plus size={16} /> {t('attendance.save')}</button>
            <input className="input" type="time" value={form.checkInTime} onChange={(e) => setForm({ ...form, checkInTime: e.target.value })} />
            <input className="input" type="time" value={form.checkOutTime} onChange={(e) => setForm({ ...form, checkOutTime: e.target.value })} />
            <input className="input" type="number" min="0" placeholder={t('attendance.lateMinutesLabel')} value={form.lateMinutes} onChange={(e) => setForm({ ...form, lateMinutes: e.target.value })} />
            <input className="input" type="number" min="0" placeholder={t('attendance.overtimeMinutesLabel')} value={form.overtimeMinutes} onChange={(e) => setForm({ ...form, overtimeMinutes: e.target.value })} />
            <input className="input md:col-span-4" placeholder={t('attendance.noteLabel')} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
        </form>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-2">
        <div id={DAILY_ATTENDANCE_REPORT_ID} className="surface overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-5">
            <h2 className="section-title">{t('attendance.dailyTitle')}</h2>
            <TableReportActions targetId={DAILY_ATTENDANCE_REPORT_ID} title={t('attendance.dailyTitle')} fileName="daily-attendance" entityType="daily_attendance" t={t} shortcuts={ATTENDANCE_REPORT_SHORTCUTS} />
          </div>
          {loading ? <div className="p-5"><TableSkeleton columns={6} /></div> : daily.length === 0 ? (
            <div className="p-5"><EmptyState title={t('attendance.noAttendanceTitle')} description={t('attendance.noAttendanceDesc')} icon={CalendarClock} /></div>
          ) : (
            <>
            <MobileCardList>
              {daily.map((row) => (
                <MobileListCard
                  key={row.id}
                  title={row.employeeName}
                  badge={<span className="muted-chip">{row.status}</span>}
                  subtitle={`${row.checkInTime || '-'} – ${row.checkOutTime || '-'}`}
                  value={row.lateMinutes ? `${row.lateMinutes}m` : null}
                  valueSub={row.overtimeMinutes ? `${row.overtimeMinutes}m` : null}
                />
              ))}
            </MobileCardList>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead className="table-head"><tr><th className="px-4 py-3">{t('attendance.columnEmployee')}</th><th className="px-4 py-3">{t('attendance.columnStatus')}</th><th className="px-4 py-3">{t('attendance.columnIn')}</th><th className="px-4 py-3">{t('attendance.columnOut')}</th><th className="px-4 py-3">{t('attendance.columnLate')}</th><th className="px-4 py-3">{t('attendance.columnOvertime')}</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {daily.map((row) => (
                    <tr key={row.id}>
                      <td className="table-cell font-semibold">{row.employeeName}</td>
                      <td className="table-cell"><span className="muted-chip">{row.status}</span></td>
                      <td className="table-cell">{row.checkInTime || '-'}</td>
                      <td className="table-cell">{row.checkOutTime || '-'}</td>
                      <td className="table-cell">{row.lateMinutes}</td>
                      <td className="table-cell">{row.overtimeMinutes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>

        <div id={MONTHLY_ATTENDANCE_REPORT_ID} className="surface overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
            <h2 className="section-title">{t('attendance.monthlyTitle')}</h2>
            <div className="flex flex-wrap items-center gap-2">
              <TableReportActions targetId={MONTHLY_ATTENDANCE_REPORT_ID} title={t('attendance.monthlyTitle')} fileName="monthly-attendance" entityType="monthly_attendance" t={t} shortcuts={ATTENDANCE_REPORT_SHORTCUTS} />
              <input className="input w-40" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            </div>
          </div>
          {loading ? <div className="p-5"><TableSkeleton columns={7} /></div> : !monthly?.items?.length ? (
            <div className="p-5"><EmptyState title={t('attendance.noMonthlyTitle')} description={t('attendance.noMonthlyDesc')} icon={CalendarClock} /></div>
          ) : (
            <>
            <MobileCardList>
              {monthly.items.map((row) => (
                <MobileListCard
                  key={row.employeeId}
                  title={row.employeeName}
                  subtitle={`${t('attendance.columnLeave')} ${row.leaveDays} · ${t('attendance.columnHoliday')} ${row.holidayDays}`}
                  value={row.presentDays}
                  valueSub={row.absentDays}
                />
              ))}
            </MobileCardList>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead className="table-head"><tr><th className="px-4 py-3">{t('attendance.columnEmployee')}</th><th className="px-4 py-3">{t('attendance.columnPresent')}</th><th className="px-4 py-3">{t('attendance.columnAbsent')}</th><th className="px-4 py-3">{t('attendance.columnLeave')}</th><th className="px-4 py-3">{t('attendance.columnHoliday')}</th><th className="px-4 py-3">{t('attendance.columnLate')}</th><th className="px-4 py-3">{t('attendance.columnOvertime')}</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {monthly.items.map((row) => (
                    <tr key={row.employeeId}>
                      <td className="table-cell font-semibold">{row.employeeName}</td>
                      <td className="table-cell">{row.presentDays}</td>
                      <td className="table-cell">{row.absentDays}</td>
                      <td className="table-cell">{row.leaveDays}</td>
                      <td className="table-cell">{row.holidayDays}</td>
                      <td className="table-cell">{row.lateMinutes}</td>
                      <td className="table-cell">{row.overtimeMinutes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
