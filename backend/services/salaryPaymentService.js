import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import { cleanMoney } from "../lib/normalizers.js";
import { SALARY_PAYMENT_ACTIONS } from "../lib/auditActions.js";
import { logActivity } from "./shared/inventoryHelpers.js";
import { findEmployeeById } from "../repositories/employeeRepository.js";
import {
  mapSalaryPayment,
  insertSalaryPayment,
  getSalaryOverview,
  listPaymentsByMonth,
  findSalaryPaymentById,
  deleteSalaryPaymentRecord,
} from "../repositories/salaryPaymentRepository.js";

export class SalaryPaymentService {
  constructor(databaseManager, { auditService, financeAccountService }) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
    this.financeAccountService = financeAccountService;
  }

  recordActivity(client, actor, payload) {
    return logActivity(this.auditService, client, actor, payload);
  }

  async getOverview(month, actor) {
    const m = String(month || '').trim().slice(0, 7) || new Date().toISOString().slice(0, 7);
    return this.databaseManager.withClient(async (client) => {
      const [overviewResult, paymentsResult] = await Promise.all([
        getSalaryOverview(client, actor.tenantId, m),
        listPaymentsByMonth(client, actor.tenantId, m),
      ]);

      const paymentsByEmployee = {};
      for (const row of paymentsResult.rows) {
        const p = mapSalaryPayment(row);
        if (!paymentsByEmployee[p.employeeId]) paymentsByEmployee[p.employeeId] = [];
        paymentsByEmployee[p.employeeId].push(p);
      }

      const employees = overviewResult.rows.map((row) => {
        const salaryAmount = Number(row.salary_amount || 0);
        const totalPaid = Number(row.total_paid || 0);
        const isMonthly = row.pay_type === 'MONTHLY';
        return {
          employeeId: row.employee_id,
          employeeName: row.employee_name,
          department: row.department || '',
          salaryAmount,
          payType: row.pay_type,
          totalPaid,
          remaining: isMonthly ? salaryAmount - totalPaid : null,
          payments: paymentsByEmployee[row.employee_id] || [],
        };
      });

      const totalBudget = employees.filter(e => e.payType === 'MONTHLY').reduce((s, e) => s + e.salaryAmount, 0);
      const totalPaid = employees.reduce((s, e) => s + e.totalPaid, 0);

      return { month: m, employees, totalBudget, totalPaid };
    });
  }

  async recordPayment(input, actor) {
    const amount = Math.max(0, cleanMoney(input.amount ?? 0));
    assert(amount > 0, "Payment amount must be greater than 0.", 400);
    assert(input.employeeId, "Employee is required.", 400);
    const paymentMethod = ['CASH', 'BANK'].includes(String(input.paymentMethod || '').toUpperCase())
      ? String(input.paymentMethod).toUpperCase()
      : 'CASH';
    const paymentDate = input.paymentDate
      ? String(input.paymentDate).slice(0, 10)
      : new Date().toISOString().slice(0, 10);
    const paymentMonth = paymentDate.slice(0, 7);

    return this.databaseManager.withTransaction(async (client) => {
      const employee = await findEmployeeById(client, input.employeeId, actor.tenantId);
      assert(employee, "Employee not found.", 404);

      const paymentId = createId("salpay");
      await insertSalaryPayment(client, {
        id: paymentId,
        tenantId: actor.tenantId,
        employeeId: employee.id,
        employeeName: employee.name,
        paymentDate,
        paymentMonth,
        amount,
        paymentMethod,
        note: String(input.note || '').trim(),
        createdById: actor.id,
      });

      const accountType = paymentMethod === 'BANK' ? 'BANK' : 'CASH';
      await this.financeAccountService.recordTransactionInClient(
        client,
        {
          accountType,
          type: 'WITHDRAWAL',
          amount,
          date: paymentDate,
          note: `Salary: ${employee.name} (${paymentMonth})`,
        },
        actor,
      );

      await this.recordActivity(client, actor, {
        actionType: SALARY_PAYMENT_ACTIONS.CREATE,
        entityType: 'salary_payment',
        entityId: paymentId,
        description: `${actor.name} paid salary ৳${amount} to ${employee.name} for ${paymentMonth}`,
        metadata: { employeeId: employee.id, employeeName: employee.name, amount, paymentMonth, paymentMethod },
      });

      return { ok: true, paymentId, employeeName: employee.name, amount, paymentMonth };
    });
  }

  async deletePayment(id, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const result = await findSalaryPaymentById(client, id, actor.tenantId);
      const row = result.rows[0];
      assert(row, "Salary payment not found.", 404);
      const payment = mapSalaryPayment(row);

      await deleteSalaryPaymentRecord(client, id, actor.tenantId);

      const accountType = payment.paymentMethod === 'BANK' ? 'BANK' : 'CASH';
      await this.financeAccountService.recordTransactionInClient(
        client,
        {
          accountType,
          type: 'DEPOSIT',
          amount: payment.amount,
          date: payment.paymentDate,
          note: `Salary reversed: ${payment.employeeName} (${payment.paymentMonth})`,
        },
        actor,
      );

      await this.recordActivity(client, actor, {
        actionType: SALARY_PAYMENT_ACTIONS.DELETE,
        entityType: 'salary_payment',
        entityId: id,
        description: `${actor.name} deleted salary payment of ৳${payment.amount} for ${payment.employeeName}`,
        metadata: { employeeId: payment.employeeId, employeeName: payment.employeeName, amount: payment.amount },
      });

      return { ok: true };
    });
  }
}
