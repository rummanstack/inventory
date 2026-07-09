import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { Alert, EmptyState, SectionHeader, TableSkeleton } from '../../../../components/ui.jsx';
import TableReportActions from '../../../../components/TableReportActions.jsx';
import { inventoryApi } from '../../../../services/inventoryApi.js';

const monthNow = () => new Date().toISOString().slice(0, 7);
const money = (value) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(Number(value || 0));

function MiniTable({ title, rows, columns, reportId }) {
  return (
    <div id={reportId} className="surface overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-5">
        <h2 className="section-title">{title}</h2>
        <TableReportActions targetId={reportId} title={title} fileName={reportId} entityType={reportId} t={(key) => key} />
      </div>
      {!rows.length ? (
        <div className="p-5"><EmptyState title={`No ${title.toLowerCase()}`} description="Data will appear here when available." icon={FileText} /></div>
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
      setError(err?.message || 'Failed to load HR reports.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [month]);

  return (
    <div>
      <SectionHeader eyebrow="HR" title="HR Reports" description="Employee, attendance, leave, payroll, advance, loan, and department summaries." />
      <div className="mb-5 flex justify-end"><input className="input w-44" type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></div>
      {error ? <Alert type="error">{error}</Alert> : null}
      {loading ? <div className="surface p-5"><TableSkeleton columns={8} /></div> : (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="surface p-4"><p className="text-xs uppercase text-slate-400">Employees</p><p className="text-2xl font-semibold">{data.employees.length}</p></div>
            <div className="surface p-4"><p className="text-xs uppercase text-slate-400">Departments</p><p className="text-2xl font-semibold">{data.departments.length}</p></div>
            <div className="surface p-4"><p className="text-xs uppercase text-slate-400">Payroll Net</p><p className="text-2xl font-semibold">{money(data.payrollTotals.netTotal)}</p></div>
            <div className="surface p-4"><p className="text-xs uppercase text-slate-400">Open Recoveries</p><p className="text-2xl font-semibold">{money([...data.advances, ...data.loans].reduce((sum, row) => sum + row.outstandingAmount, 0))}</p></div>
          </div>

          <MiniTable title="Employee List" reportId="hr-report-employees" rows={data.employees} columns={[
            { key: 'employeeNumber', label: 'Employee #' },
            { key: 'name', label: 'Name' },
            { key: 'departmentName', label: 'Department', render: (row) => row.departmentName || row.department || '-' },
            { key: 'designationName', label: 'Designation', render: (row) => row.designationName || row.designation || '-' },
            { key: 'status', label: 'Status' },
          ]} />

          <MiniTable title="Attendance Report" reportId="hr-report-attendance" rows={data.attendance} columns={[
            { key: 'employeeName', label: 'Employee' },
            { key: 'presentDays', label: 'Present' },
            { key: 'absentDays', label: 'Absent' },
            { key: 'leaveDays', label: 'Leave' },
            { key: 'lateMinutes', label: 'Late' },
            { key: 'overtimeMinutes', label: 'Overtime' },
          ]} />

          <MiniTable title="Leave Report" reportId="hr-report-leave" rows={data.leave} columns={[
            { key: 'status', label: 'Status' },
            { key: 'requestCount', label: 'Requests' },
            { key: 'totalDays', label: 'Days' },
          ]} />

          <MiniTable title="Payroll Register" reportId="hr-report-payroll" rows={data.payroll} columns={[
            { key: 'payrollMonth', label: 'Month' },
            { key: 'status', label: 'Status' },
            { key: 'paymentStatus', label: 'Payment' },
            { key: 'totalEmployees', label: 'Employees' },
            { key: 'grossTotal', label: 'Gross', align: 'right', render: (row) => money(row.grossTotal) },
            { key: 'netTotal', label: 'Net', align: 'right', render: (row) => money(row.netTotal) },
          ]} />

          <MiniTable title="Advance Report" reportId="hr-report-advances" rows={data.advances} columns={[
            { key: 'employeeName', label: 'Employee' },
            { key: 'status', label: 'Status' },
            { key: 'amount', label: 'Amount', align: 'right', render: (row) => money(row.amount) },
            { key: 'recoveredAmount', label: 'Recovered', align: 'right', render: (row) => money(row.recoveredAmount) },
            { key: 'outstandingAmount', label: 'Outstanding', align: 'right', render: (row) => money(row.outstandingAmount) },
          ]} />

          <MiniTable title="Loan Report" reportId="hr-report-loans" rows={data.loans} columns={[
            { key: 'employeeName', label: 'Employee' },
            { key: 'status', label: 'Status' },
            { key: 'principalAmount', label: 'Principal', align: 'right', render: (row) => money(row.principalAmount) },
            { key: 'recoveredAmount', label: 'Recovered', align: 'right', render: (row) => money(row.recoveredAmount) },
            { key: 'outstandingAmount', label: 'Outstanding', align: 'right', render: (row) => money(row.outstandingAmount) },
          ]} />

          <MiniTable title="Department Summary" reportId="hr-report-departments" rows={data.departments} columns={[
            { key: 'name', label: 'Department' },
            { key: 'headEmployeeName', label: 'Head', render: (row) => row.headEmployeeName || '-' },
            { key: 'employeeCount', label: 'Employees' },
            { key: 'status', label: 'Status' },
          ]} />
        </div>
      )}
    </div>
  );
}
