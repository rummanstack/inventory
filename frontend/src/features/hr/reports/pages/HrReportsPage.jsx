import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { Alert, EmptyState, SectionHeader, TableSkeleton } from '../../../../components/ui.jsx';
import TableReportActions from '../../../../components/TableReportActions.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../../services/inventoryApi.js';

const monthNow = () => new Date().toISOString().slice(0, 7);
const money = (value) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(Number(value || 0));
const HR_REPORTS_SHORTCUTS = {
  pdf: { alt: true, key: 'd', label: 'Alt+D' },
  excel: { alt: true, key: 'e', label: 'Alt+E' },
  csv: { alt: true, key: 'c', label: 'Alt+C' },
  print: { alt: true, key: 'p', label: 'Alt+P' },
};

function MiniTable({ title, rows, columns, reportId, t, noDataDesc }) {
  return (
    <div id={reportId} className="surface overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-5">
        <h2 className="section-title">{title}</h2>
        <TableReportActions targetId={reportId} title={title} fileName={reportId} entityType={reportId.replace(/-/g, '_')} t={t} shortcuts={HR_REPORTS_SHORTCUTS} />
      </div>
      {!rows.length ? (
        <div className="p-5"><EmptyState title={title} description={noDataDesc} icon={FileText} /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="table-head"><tr>{columns.map((column) => <th key={column.key} className={`px-4 py-3 ${column.align === 'right' ? 'text-right' : ''}`}>{column.label}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, index) => (
                <tr key={row.id || row.employeeId || row.status || row.name || index}>
                  {columns.map((column) => <td key={column.key} className={`table-cell ${column.align === 'right' ? 'text-right' : ''}`}>{column.render ? column.render(row) : row[column.key]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function HrReportsPage() {
  const { t } = useInventoryApp();
  const [month, setMonth] = useState(monthNow());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [employees, departments, attendance, leave, payroll, advances, loans] = await Promise.all([
        inventoryApi.listEmployees({ pageSize: 500 }),
        inventoryApi.listDepartments({ pageSize: 500 }),
        inventoryApi.getMonthlyAttendanceReport({ month }),
        inventoryApi.getLeaveReport({ fromDate: `${month}-01`, toDate: `${month}-31` }),
        inventoryApi.getPayrollRegister({ month }),
        inventoryApi.listEmployeeAdvances({}),
        inventoryApi.listEmployeeLoans({}),
      ]);
      setData({
        employees: employees.items || [],
        departments: departments.items || [],
        attendance: attendance.items || [],
        leave: leave.items || [],
        payroll: payroll.items || [],
        payrollTotals: payroll.totals || {},
        advances: advances.items || [],
        loans: loans.items || [],
      });
    } catch (err) {
      setError(err?.message || t('hrReports.loadFailed'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [month]);

  return (
    <div>
      <SectionHeader eyebrow={t('hrReports.eyebrow')} title={t('hrReports.title')} description={t('hrReports.description')} />
      <div className="mb-5 flex justify-end"><input className="input w-44" type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></div>
      {error ? <Alert type="error">{error}</Alert> : null}
      {loading ? <div className="surface p-5"><TableSkeleton columns={8} /></div> : (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="surface p-4"><p className="text-xs uppercase text-slate-400">{t('hrReports.employees')}</p><p className="text-2xl font-semibold">{data.employees.length}</p></div>
            <div className="surface p-4"><p className="text-xs uppercase text-slate-400">{t('hrReports.departments')}</p><p className="text-2xl font-semibold">{data.departments.length}</p></div>
            <div className="surface p-4"><p className="text-xs uppercase text-slate-400">{t('hrReports.payrollNet')}</p><p className="text-2xl font-semibold">{money(data.payrollTotals.netTotal)}</p></div>
            <div className="surface p-4"><p className="text-xs uppercase text-slate-400">{t('hrReports.openRecoveries')}</p><p className="text-2xl font-semibold">{money([...data.advances, ...data.loans].reduce((sum, row) => sum + row.outstandingAmount, 0))}</p></div>
          </div>

          <MiniTable t={t} noDataDesc={t('hrReports.noDataDesc')} title={t('hrReports.employeeListTitle')} reportId="hr-report-employees" rows={data.employees} columns={[
            { key: 'employeeNumber', label: t('hrReports.columnEmployeeNumber') },
            { key: 'name', label: t('hrReports.columnName') },
            { key: 'departmentName', label: t('hrReports.columnDepartment'), render: (row) => row.departmentName || row.department || '-' },
            { key: 'designationName', label: t('hrReports.columnDesignation'), render: (row) => row.designationName || row.designation || '-' },
            { key: 'status', label: t('hrReports.columnStatus') },
          ]} />

          <MiniTable t={t} noDataDesc={t('hrReports.noDataDesc')} title={t('hrReports.attendanceReportTitle')} reportId="hr-report-attendance" rows={data.attendance} columns={[
            { key: 'employeeName', label: t('hrReports.columnEmployee') },
            { key: 'presentDays', label: t('hrReports.columnPresent') },
            { key: 'absentDays', label: t('hrReports.columnAbsent') },
            { key: 'leaveDays', label: t('hrReports.columnLeave') },
            { key: 'lateMinutes', label: t('hrReports.columnLate') },
            { key: 'overtimeMinutes', label: t('hrReports.columnOvertime') },
          ]} />

          <MiniTable t={t} noDataDesc={t('hrReports.noDataDesc')} title={t('hrReports.leaveReportTitle')} reportId="hr-report-leave" rows={data.leave} columns={[
            { key: 'status', label: t('hrReports.columnStatus') },
            { key: 'requestCount', label: t('hrReports.columnRequests') },
            { key: 'totalDays', label: t('hrReports.columnDays') },
          ]} />

          <MiniTable t={t} noDataDesc={t('hrReports.noDataDesc')} title={t('hrReports.payrollRegisterTitle')} reportId="hr-report-payroll" rows={data.payroll} columns={[
            { key: 'payrollMonth', label: t('hrReports.columnMonth') },
            { key: 'status', label: t('hrReports.columnStatus') },
            { key: 'paymentStatus', label: t('hrReports.columnPayment') },
            { key: 'totalEmployees', label: t('hrReports.columnEmployees') },
            { key: 'grossTotal', label: t('hrReports.columnGross'), align: 'right', render: (row) => money(row.grossTotal) },
            { key: 'netTotal', label: t('hrReports.columnNet'), align: 'right', render: (row) => money(row.netTotal) },
          ]} />

          <MiniTable t={t} noDataDesc={t('hrReports.noDataDesc')} title={t('hrReports.advanceReportTitle')} reportId="hr-report-advances" rows={data.advances} columns={[
            { key: 'employeeName', label: t('hrReports.columnEmployee') },
            { key: 'status', label: t('hrReports.columnStatus') },
            { key: 'amount', label: t('hrReports.columnAmount'), align: 'right', render: (row) => money(row.amount) },
            { key: 'recoveredAmount', label: t('hrReports.columnRecovered'), align: 'right', render: (row) => money(row.recoveredAmount) },
            { key: 'outstandingAmount', label: t('hrReports.columnOutstanding'), align: 'right', render: (row) => money(row.outstandingAmount) },
          ]} />

          <MiniTable t={t} noDataDesc={t('hrReports.noDataDesc')} title={t('hrReports.loanReportTitle')} reportId="hr-report-loans" rows={data.loans} columns={[
            { key: 'employeeName', label: t('hrReports.columnEmployee') },
            { key: 'status', label: t('hrReports.columnStatus') },
            { key: 'principalAmount', label: t('hrReports.columnAmount'), align: 'right', render: (row) => money(row.principalAmount) },
            { key: 'recoveredAmount', label: t('hrReports.columnRecovered'), align: 'right', render: (row) => money(row.recoveredAmount) },
            { key: 'outstandingAmount', label: t('hrReports.columnOutstanding'), align: 'right', render: (row) => money(row.outstandingAmount) },
          ]} />

          <MiniTable t={t} noDataDesc={t('hrReports.noDataDesc')} title={t('hrReports.departmentSummaryTitle')} reportId="hr-report-departments" rows={data.departments} columns={[
            { key: 'name', label: t('hrReports.columnDepartment') },
            { key: 'headEmployeeName', label: t('hrReports.columnHead'), render: (row) => row.headEmployeeName || '-' },
            { key: 'employeeCount', label: t('hrReports.columnEmployees') },
            { key: 'status', label: t('hrReports.columnStatus') },
          ]} />
        </div>
      )}
    </div>
  );
}
