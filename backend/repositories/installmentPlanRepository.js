export function mapInstallmentPlan(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    planNumber: row.plan_number,
    customerId: row.customer_id,
    customerName: row.customer_name || null,
    customerPhone: row.customer_phone || null,
    salesInvoiceId: row.sales_invoice_id,
    invoiceNumber: row.invoice_number || null,
    saleDate: row.sale_date,
    productTotal: Number(row.product_total || 0),
    discountAmount: Number(row.discount_amount || 0),
    netSaleAmount: Number(row.net_sale_amount || 0),
    downPayment: Number(row.down_payment || 0),
    financeAmount: Number(row.finance_amount || 0),
    markupType: row.markup_type,
    markupValue: Number(row.markup_value || 0),
    markupAmount: Number(row.markup_amount || 0),
    finalPayableAmount: Number(row.final_payable_amount || 0),
    numberOfMonths: Number(row.number_of_months || 0),
    firstPaymentDate: row.first_payment_date,
    paymentDayOfMonth: Number(row.payment_day_of_month || 0),
    monthlyInstallmentAmount: Number(row.monthly_installment_amount || 0),
    totalPaid: Number(row.total_paid || 0),
    outstandingAmount: Number(row.outstanding_amount || 0),
    overdueAmount: Number(row.overdue_amount || 0),
    status: row.status,
    note: row.note || "",
    markupRecognitionMode: row.markup_recognition_mode,
    createdById: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildSelect() {
  return `SELECT
      installment_plans.*,
      retail_customers.name AS customer_name,
      retail_customers.phone AS customer_phone,
      sales_invoices.invoice_number
    FROM installment_plans
    LEFT JOIN retail_customers
      ON retail_customers.id = installment_plans.customer_id
      AND retail_customers.tenant_id = installment_plans.tenant_id
    LEFT JOIN sales_invoices
      ON sales_invoices.id = installment_plans.sales_invoice_id
      AND sales_invoices.tenant_id = installment_plans.tenant_id`;
}

export async function insertInstallmentPlan(client, plan) {
  const result = await client.query(
    `INSERT INTO installment_plans (
       id, tenant_id, plan_number, customer_id, sales_invoice_id, sale_date,
       product_total, discount_amount, net_sale_amount, down_payment, finance_amount,
       markup_type, markup_value, markup_amount, final_payable_amount,
       number_of_months, first_payment_date, payment_day_of_month, monthly_installment_amount,
       total_paid, outstanding_amount, overdue_amount, status, note, markup_recognition_mode, created_by
     ) VALUES (
       $1, $2, $3, $4, $5, $6,
       $7, $8, $9, $10, $11,
       $12, $13, $14, $15,
       $16, $17, $18, $19,
       $20, $21, $22, $23, $24, $25, $26
     )
     RETURNING *`,
    [
      plan.id,
      plan.tenantId,
      plan.planNumber,
      plan.customerId,
      plan.salesInvoiceId,
      plan.saleDate,
      plan.productTotal,
      plan.discountAmount,
      plan.netSaleAmount,
      plan.downPayment,
      plan.financeAmount,
      plan.markupType,
      plan.markupValue,
      plan.markupAmount,
      plan.finalPayableAmount,
      plan.numberOfMonths,
      plan.firstPaymentDate,
      plan.paymentDayOfMonth,
      plan.monthlyInstallmentAmount,
      plan.totalPaid,
      plan.outstandingAmount,
      plan.overdueAmount,
      plan.status,
      plan.note,
      plan.markupRecognitionMode,
      plan.createdById,
    ],
  );
  return mapInstallmentPlan(result.rows[0]);
}

export async function findInstallmentPlanById(client, planId, tenantId) {
  return client.query(
    `${buildSelect()} WHERE installment_plans.id = $1 AND installment_plans.tenant_id = $2 AND installment_plans.deleted_at IS NULL LIMIT 1`,
    [planId, tenantId],
  );
}

export async function findInstallmentPlanForUpdate(client, planId, tenantId) {
  const result = await client.query(
    `SELECT * FROM installment_plans WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL FOR UPDATE LIMIT 1`,
    [planId, tenantId],
  );
  return result.rowCount > 0 ? result.rows[0] : null;
}

export async function listInstallmentPlansPage(client, { tenantId, customerId, status, limit, offset }) {
  const params = [tenantId];
  const conditions = ["installment_plans.tenant_id = $1", "installment_plans.deleted_at IS NULL"];

  if (customerId) {
    params.push(customerId);
    conditions.push(`installment_plans.customer_id = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`installment_plans.status = $${params.length}`);
  }

  params.push(limit, offset);
  const result = await client.query(
    `${buildSelect()}
     WHERE ${conditions.join(" AND ")}
     ORDER BY installment_plans.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return result.rows.map(mapInstallmentPlan);
}

export async function countInstallmentPlans(client, { tenantId, customerId, status }) {
  const params = [tenantId];
  const conditions = ["tenant_id = $1", "deleted_at IS NULL"];

  if (customerId) {
    params.push(customerId);
    conditions.push(`customer_id = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }

  const result = await client.query(
    `SELECT COUNT(*)::INTEGER AS count FROM installment_plans WHERE ${conditions.join(" AND ")}`,
    params,
  );
  return result.rows[0].count;
}

// Customer Installment Statement: every plan for a customer, unpaginated —
// statements are meant to show the whole picture, not a page of it.
export async function listAllPlansForCustomer(client, customerId, tenantId) {
  const result = await client.query(
    `${buildSelect()}
     WHERE installment_plans.tenant_id = $1
       AND installment_plans.customer_id = $2
       AND installment_plans.deleted_at IS NULL
     ORDER BY installment_plans.created_at DESC`,
    [tenantId, customerId],
  );
  return result.rows.map(mapInstallmentPlan);
}

export async function updateInstallmentPlanTotals(client, planId, tenantId, { totalPaid, outstandingAmount, status }) {
  const result = await client.query(
    `UPDATE installment_plans
     SET total_paid = $3, outstanding_amount = $4, status = $5, updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2
     RETURNING *`,
    [planId, tenantId, totalPaid, outstandingAmount, status],
  );
  return mapInstallmentPlan(result.rows[0]);
}
