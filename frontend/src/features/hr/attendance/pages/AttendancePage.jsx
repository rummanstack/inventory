import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Alert, EmptyState, SectionHeader, Select, TableSkeleton } from '../../../../components/ui.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../../services/inventoryApi.js';

const today = () => new Date().toISOString().slice(0, 10);
const monthNow = () => new Date().toISOString().slice(0, 7);

export default function AttendancePage() {
  const { can, pushToast, t } = useInventoryApp();
  const [date, setDate] = useState(today());
  const [month, setMonth] = useState(monthNow());
  const [employees, setEmployees] = useState([]);
  const [daily, setDaily] = useState([]);
  const [monthly, setMonthly] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ employeeId: '', status: 'PRESENT', checkInTime: '', checkOutTime: '', lateMinutes: 0, overtimeMinutes: 0, note: '' });
  const canManage = can('attendance.manage');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [employeeRows, dailyRows, monthRows] = await Promise.all([
        inventoryApi.getActiveEmployees(),
        inventoryApi.listDailyAttendance({ date }),
        inventoryApi.getMonthlyAttendanceReport({ month }),
      ]);
      setEmployees(Array.isArray(employeeRows) ? employeeRows : []);
      setDaily(dailyRows.items || dailyRows || []);
      setMonthly(monthRows);
    } catch (err) {
      setError(err?.message || 'Failed to load attendance.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [date, month]);

  async function save(event) {
    event.preventDefault();
    try {
      const existing = daily.find((row) => row.employeeId === form.employeeId);
      const payload = { ...form, attendanceDate: date };
      if (existing) await inventoryApi.updateAttendance({ ...payload, id: existing.id });
      else await inventoryApi.createAttendance(payload);
      setForm({ employeeId: '', status: 'PRESENT', checkInTime: '', checkOutTime: '', lateMinutes: 0, overtimeMinutes: 0, note: '' });
      pushToast('success', 'Attendance', existing ? t('alerts.updated') : t('alerts.created'));
      load();
    } catch (err) {
      pushToast('error', 'Attendance', err?.message || t('alerts.requestFailed'));
    }
  }

  return (
    <div>
      <SectionHeader eyebrow="HR" title="Attendance" description="Record daily manual attendance and review monthly totals." />
      {error ? <Alert type="error">{error}</Alert> : null}

      {canManage ? (
        <form className="surface mb-5 p-5" onSubmit={save}>
          <div className="grid gap-3 md:grid-cols-4">
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <Select className="input" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}>
              <option value="">Employee</option>
              {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
            </Select>
            <Select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="PRESENT">Present</option>
              <option value="ABSENT">Absent</option>
              <option value="LEAVE">Leave</option>
              <option value="HOLIDAY">Holiday</option>
            </Select>
            <button type="submit" className="btn-primary"><Plus size={16} /> Save</button>
            <input className="input" type="time" value={form.checkInTime} onChange={(e) => setForm({ ...form, checkInTime: e.target.value })} />
            <input className="input" type="time" value={form.checkOutTime} onChange={(e) => setForm({ ...form, checkOutTime: e.target.value })} />
            <input className="input" type="number" min="0" placeholder="Late minutes" value={form.lateMinutes} onChange={(e) => setForm({ ...form, lateMinutes: e.target.value })} />
            <input className="input" type="number" min="0" placeholder="Overtime minutes" value={form.overtimeMinutes} onChange={(e) => setForm({ ...form, overtimeMinutes: e.target.value })} />
            <input className="input md:col-span-4" placeholder="Note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
        </form>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="surface overflow-hidden">
          <div className="border-b border-slate-100 p-5"><h2 className="section-title">Daily Attendance</h2></div>
          {loading ? <div className="p-5"><TableSkeleton columns={6} /></div> : daily.length === 0 ? (
            <div className="p-5"><EmptyState title="No attendance" description="No attendance has been recorded for this date." /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="table-head"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">In</th><th className="px-4 py-3">Out</th><th className="px-4 py-3">Late</th><th className="px-4 py-3">OT</th></tr></thead>
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
          )}
        </div>

        <div className="surface overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-5">
            <h2 className="section-title">Monthly Report</h2>
            <input className="input w-40" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
          {loading ? <div className="p-5"><TableSkeleton columns={7} /></div> : !monthly?.items?.length ? (
            <div className="p-5"><EmptyState title="No monthly data" description="Attendance totals will appear after records are added." /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="table-head"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Present</th><th className="px-4 py-3">Absent</th><th className="px-4 py-3">Leave</th><th className="px-4 py-3">Holiday</th><th className="px-4 py-3">Late</th><th className="px-4 py-3">OT</th></tr></thead>
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
          )}
        </div>
      </div>
    </div>
  );
}
