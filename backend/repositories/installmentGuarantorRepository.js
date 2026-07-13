export function mapInstallmentGuarantor(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    planId: row.plan_id,
    name: row.name,
    phone: row.phone || "",
    address: row.address || "",
    nationalId: row.national_id || "",
    relationship: row.relationship || "",
    occupation: row.occupation || "",
    employer: row.employer || "",
    monthlyIncome: Number(row.monthly_income || 0),
    referenceNotes: row.reference_notes || "",
    emergencyContact: row.emergency_contact || "",
    createdById: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function insertInstallmentGuarantor(client, guarantor) {
  const result = await client.query(
    `INSERT INTO installment_guarantors (
       id, tenant_id, plan_id, name, phone, address, national_id, relationship,
       occupation, employer, monthly_income, reference_notes, emergency_contact, created_by
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     RETURNING *`,
    [
      guarantor.id,
      guarantor.tenantId,
      guarantor.planId,
      guarantor.name,
      guarantor.phone,
      guarantor.address,
      guarantor.nationalId,
      guarantor.relationship,
      guarantor.occupation,
      guarantor.employer,
      guarantor.monthlyIncome,
      guarantor.referenceNotes,
      guarantor.emergencyContact,
      guarantor.createdById,
    ],
  );
  return mapInstallmentGuarantor(result.rows[0]);
}

export async function listGuarantorsByPlan(client, planId, tenantId) {
  const result = await client.query(
    `SELECT * FROM installment_guarantors
     WHERE plan_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
     ORDER BY created_at ASC`,
    [planId, tenantId],
  );
  return result.rows.map(mapInstallmentGuarantor);
}

export async function findInstallmentGuarantorById(client, guarantorId, tenantId) {
  return client.query(
    `SELECT * FROM installment_guarantors WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL LIMIT 1`,
    [guarantorId, tenantId],
  );
}

export async function softDeleteInstallmentGuarantor(client, guarantorId, tenantId) {
  const result = await client.query(
    `UPDATE installment_guarantors SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL RETURNING *`,
    [guarantorId, tenantId],
  );
  return result.rowCount > 0 ? mapInstallmentGuarantor(result.rows[0]) : null;
}
