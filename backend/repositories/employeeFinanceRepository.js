export function mapEmployeeAdvance(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    employeeId: row.employee_id,
    employeeName: row.employee_name || "",
    employeeNumber: row.employee_number || "",
    requestDate: row.request_date ? String(row.request_date).slice(0, 10) : null,
    amount: Number(row.amount || 0),
    recoveredAmount: Number(row.recovered_amount || 0),
    monthlyRecovery: Number(row.monthly_recovery || 0),
    outstandingAmount: Number(row.outstanding_amount ?? Math.max(0, Number(row.amount || 0) - Number(row.recovered_amount || 0))),
    status: row.status,
    reason: row.reason || "",
    decisionNote: row.decision_note || "",
    requestedBy: row.requested_by || null,
    approvedBy: row.approved_by || null,
    approvedAt: row.approved_at || null,
    rejectedBy: row.rejected_by || null,
    rejectedAt: row.rejected_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapEmployeeLoan(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    employeeId: row.employee_id,
    employeeName: row.employee_name || "",
    employeeNumber: row.employee_number || "",
    requestDate: row.request_date ? String(row.request_date).slice(0, 10) : null,
    principalAmount: Number(row.principal_amount || 0),
    installmentAmount: Number(row.installment_amount || 0),
    recoveredAmount: Number(row.recovered_amount || 0),
    outstandingAmount: Number(row.outstanding_amount ?? Math.max(0, Number(row.principal_amount || 0) - Number(row.recovered_amount || 0))),
    status: row.status,
    reason: row.reason || "",
    decisionNote: row.decision_note || "",
    requestedBy: row.requested_by || null,
    approvedBy: row.approved_by || null,
    approvedAt: row.approved_at || null,
    rejectedBy: row.rejected_by || null,
    rejectedAt: row.rejected_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const ADVANCE_SELECT = `
  SELECT ea.*, e.name AS employee_name, e.employee_number,
         GREATEST(ea.amount - ea.recovered_amount, 0) AS outstanding_amount
  FROM employee_advances ea
  JOIN employees e ON e.id = ea.employee_id AND e.tenant_id = ea.tenant_id
`;

const LOAN_SELECT = `
  SELECT el.*, e.name AS employee_name, e.employee_number,
         GREATEST(el.principal_amount - el.recovered_amount, 0) AS outstanding_amount
  FROM employee_loans el
  JOIN employees e ON e.id = el.employee_id AND e.tenant_id = el.tenant_id
`;

function buildFilters(alias, filters) {
  const conditions = [`${alias}.tenant_id=$1`];
  const values = [filters.tenantId];
  let i = 2;
  if (filters.status) {
    conditions.push(`${alias}.status=$${i++}`);
    values.push(filters.status);
  }
  if (filters.employeeId) {
    conditions.push(`${alias}.employee_id=$${i++}`);
    values.push(filters.employeeId);
  }
  return { conditions, values };
}

export async function listEmployeeAdvances(client, filters) {
  const { conditions, values } = buildFilters("ea", filters);
  const result = await client.query(
    `${ADVANCE_SELECT}
     WHERE ${conditions.join(" AND ")}
     ORDER BY ea.request_date DESC, ea.created_at DESC`,
    values,
  );
  return result.rows.map(mapEmployeeAdvance);
}

export async function findEmployeeAdvanceById(client, tenantId, id) {
  const result = await client.query(
    `${ADVANCE_SELECT}
     WHERE ea.tenant_id=$1 AND ea.id=$2
     LIMIT 1`,
    [tenantId, id],
  );
  return result.rows[0] ? mapEmployeeAdvance(result.rows[0]) : null;
}

export async function insertEmployeeAdvance(client, advance) {
  const result = await client.query(
    `INSERT INTO employee_advances
      (id, tenant_id, employee_id, request_date, amount, monthly_recovery, status, reason, requested_by, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,'PENDING',$7,$8,NOW(),NOW())
     RETURNING *`,
    [
      advance.id,
      advance.tenantId,
      advance.employeeId,
      advance.requestDate,
      advance.amount,
      advance.monthlyRecovery,
      advance.reason || "",
      advance.requestedBy || null,
    ],
  );
  return result.rows[0];
}

export async function approveEmployeeAdvance(client, { tenantId, id, actorId, decisionNote }) {
  const result = await client.query(
    `UPDATE employee_advances
     SET status='APPROVED', approved_by=$3, approved_at=NOW(), rejected_by=NULL, rejected_at=NULL,
         decision_note=$4, updated_at=NOW()
     WHERE tenant_id=$1 AND id=$2 AND status='PENDING'
     RETURNING *`,
    [tenantId, id, actorId || null, decisionNote || ""],
  );
  return result.rows[0] || null;
}

export async function rejectEmployeeAdvance(client, { tenantId, id, actorId, decisionNote }) {
  const result = await client.query(
    `UPDATE employee_advances
     SET status='REJECTED', rejected_by=$3, rejected_at=NOW(), approved_by=NULL, approved_at=NULL,
         decision_note=$4, updated_at=NOW()
     WHERE tenant_id=$1 AND id=$2 AND status='PENDING'
     RETURNING *`,
    [tenantId, id, actorId || null, decisionNote || ""],
  );
  return result.rows[0] || null;
}

export async function listEmployeeLoans(client, filters) {
  const { conditions, values } = buildFilters("el", filters);
  const result = await client.query(
    `${LOAN_SELECT}
     WHERE ${conditions.join(" AND ")}
     ORDER BY el.request_date DESC, el.created_at DESC`,
    values,
  );
  return result.rows.map(mapEmployeeLoan);
}

export async function findEmployeeLoanById(client, tenantId, id) {
  const result = await client.query(
    `${LOAN_SELECT}
     WHERE el.tenant_id=$1 AND el.id=$2
     LIMIT 1`,
    [tenantId, id],
  );
  return result.rows[0] ? mapEmployeeLoan(result.rows[0]) : null;
}

export async function insertEmployeeLoan(client, loan) {
  const result = await client.query(
    `INSERT INTO employee_loans
      (id, tenant_id, employee_id, request_date, principal_amount, installment_amount, status, reason, requested_by, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,'PENDING',$7,$8,NOW(),NOW())
     RETURNING *`,
    [
      loan.id,
      loan.tenantId,
      loan.employeeId,
      loan.requestDate,
      loan.principalAmount,
      loan.installmentAmount,
      loan.reason || "",
      loan.requestedBy || null,
    ],
  );
  return result.rows[0];
}

export async function approveEmployeeLoan(client, { tenantId, id, actorId, decisionNote }) {
  const result = await client.query(
    `UPDATE employee_loans
     SET status='APPROVED', approved_by=$3, approved_at=NOW(), rejected_by=NULL, rejected_at=NULL,
         decision_note=$4, updated_at=NOW()
     WHERE tenant_id=$1 AND id=$2 AND status='PENDING'
     RETURNING *`,
    [tenantId, id, actorId || null, decisionNote || ""],
  );
  return result.rows[0] || null;
}

export async function rejectEmployeeLoan(client, { tenantId, id, actorId, decisionNote }) {
  const result = await client.query(
    `UPDATE employee_loans
     SET status='REJECTED', rejected_by=$3, rejected_at=NOW(), approved_by=NULL, approved_at=NULL,
         decision_note=$4, updated_at=NOW()
     WHERE tenant_id=$1 AND id=$2 AND status='PENDING'
     RETURNING *`,
    [tenantId, id, actorId || null, decisionNote || ""],
  );
  return result.rows[0] || null;
}

export async function listPayrollRecoveries(client, tenantId) {
  const [advances, loans] = await Promise.all([
    client.query(
      `SELECT id, employee_id, GREATEST(amount - recovered_amount, 0) AS outstanding_amount, monthly_recovery
       FROM employee_advances
       WHERE tenant_id=$1 AND status='APPROVED' AND amount > recovered_amount
       ORDER BY request_date ASC, created_at ASC`,
      [tenantId],
    ),
    client.query(
      `SELECT id, employee_id, GREATEST(principal_amount - recovered_amount, 0) AS outstanding_amount, installment_amount
       FROM employee_loans
       WHERE tenant_id=$1 AND status='APPROVED' AND principal_amount > recovered_amount
       ORDER BY request_date ASC, created_at ASC`,
      [tenantId],
    ),
  ]);
  return { advances: advances.rows, loans: loans.rows };
}

export async function applyPayrollRecoveries(client, tenantId, recoveries) {
  for (const recovery of recoveries.advances || []) {
    await client.query(
      `UPDATE employee_advances
       SET recovered_amount=recovered_amount + $3,
           status=CASE WHEN recovered_amount + $3 >= amount THEN 'SETTLED' ELSE status END,
           updated_at=NOW()
       WHERE tenant_id=$1 AND id=$2`,
      [tenantId, recovery.id, recovery.amount],
    );
  }
  for (const recovery of recoveries.loans || []) {
    await client.query(
      `UPDATE employee_loans
       SET recovered_amount=recovered_amount + $3,
           status=CASE WHEN recovered_amount + $3 >= principal_amount THEN 'SETTLED' ELSE status END,
           updated_at=NOW()
       WHERE tenant_id=$1 AND id=$2`,
      [tenantId, recovery.id, recovery.amount],
    );
  }
}
