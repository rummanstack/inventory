export function mapRepairJob(row) {
  return {
    id: row.id,
    jobNumber: row.job_number,
    customerName: row.customer_name || "",
    customerPhone: row.customer_phone || "",
    productId: row.product_id || null,
    deviceName: row.device_name || "",
    productName: row.product_name || row.device_name || null,
    serialNumber: row.serial_number || "",
    problemDescription: row.problem_description || "",
    estimatedCost: Number(row.estimated_cost || 0),
    laborCost: Number(row.labor_cost || 0),
    actualCost: Number(row.actual_cost || 0),
    partsUsed: row.parts_used || "",
    technicianId: row.technician_id || null,
    technicianName: row.technician_name || null,
    status: row.status,
    approvalStatus: row.approval_status,
    receivedDate: row.received_date,
    promisedDate: row.promised_date || null,
    deliveredDate: row.delivered_date || null,
    resolutionNote: row.resolution_note || "",
    createdById: row.created_by || null,
    createdByName: row.created_by_name || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTrashedRepairJob(row) {
  return {
    ...mapRepairJob(row),
    deletedAt: row.deleted_at,
    deletedById: row.deleted_by_id,
    deletedByName: row.deleted_by_name || null,
    deleteReason: row.delete_reason || "",
  };
}

const BASE_JOINS = `
  LEFT JOIN products p ON p.id = rj.product_id
  LEFT JOIN users tech ON tech.id = rj.technician_id
  LEFT JOIN users creator ON creator.id = rj.created_by
`;

const BASE_SELECT = `
  rj.*,
  p.name AS product_name,
  tech.name AS technician_name,
  creator.name AS created_by_name
`;

function buildFilters({ tenantId, status, technicianId, search, dateFrom, dateTo }) {
  const params = [tenantId];
  const conditions = ["rj.tenant_id = $1", "rj.deleted_at IS NULL"];

  if (status) {
    params.push(status);
    conditions.push(`rj.status = $${params.length}`);
  }

  if (technicianId) {
    params.push(technicianId);
    conditions.push(`rj.technician_id = $${params.length}`);
  }

  if (search) {
    params.push(`%${search}%`);
    const idx = params.length;
    conditions.push(
      `(rj.job_number ILIKE $${idx} OR rj.customer_name ILIKE $${idx} OR rj.customer_phone ILIKE $${idx} OR rj.serial_number ILIKE $${idx})`,
    );
  }

  if (dateFrom) {
    params.push(dateFrom);
    conditions.push(`rj.received_date >= $${params.length}::date`);
  }

  if (dateTo) {
    params.push(dateTo);
    conditions.push(`rj.received_date <= $${params.length}::date`);
  }

  return { params, where: `WHERE ${conditions.join(" AND ")}` };
}

export async function countRepairJobs(client, filters = {}) {
  const { params, where } = buildFilters(filters);
  const result = await client.query(
    `SELECT COUNT(*)::INTEGER AS count FROM repair_jobs rj ${BASE_JOINS} ${where}`,
    params,
  );
  return result.rows[0].count;
}

export async function listRepairJobsPage(client, { limit, offset, ...filters }) {
  const { params, where } = buildFilters(filters);
  params.push(limit, offset);
  const result = await client.query(
    `SELECT ${BASE_SELECT} FROM repair_jobs rj ${BASE_JOINS}
     ${where}
     ORDER BY rj.received_date DESC, rj.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return result.rows.map(mapRepairJob);
}

export function findRepairJobById(client, id, tenantId) {
  return client.query(
    `SELECT ${BASE_SELECT} FROM repair_jobs rj ${BASE_JOINS}
     WHERE rj.id = $1 AND rj.tenant_id = $2 AND rj.deleted_at IS NULL`,
    [id, tenantId],
  );
}

export function findRepairJobForUpdate(client, id, tenantId) {
  return client.query(
    "SELECT * FROM repair_jobs WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL FOR UPDATE",
    [id, tenantId],
  );
}

export function insertRepairJob(client, job) {
  return client.query(
    `WITH inserted AS (
      INSERT INTO repair_jobs (
        id, tenant_id, job_number, customer_name, customer_phone,
        device_name, product_id, serial_number, problem_description,
        estimated_cost, labor_cost, actual_cost, parts_used,
        technician_id, status, approval_status,
        received_date, promised_date, delivered_date,
        resolution_note, created_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
      RETURNING *
    )
    SELECT ${BASE_SELECT} FROM inserted rj ${BASE_JOINS}`,
    [
      job.id, job.tenantId, job.jobNumber, job.customerName, job.customerPhone,
      job.deviceName || '', job.productId, job.serialNumber, job.problemDescription,
      job.estimatedCost, job.laborCost, job.actualCost, job.partsUsed,
      job.technicianId, job.status, job.approvalStatus,
      job.receivedDate, job.promisedDate, job.deliveredDate,
      job.resolutionNote, job.createdById,
    ],
  );
}

export function updateRepairJob(client, job) {
  return client.query(
    `WITH updated AS (
       UPDATE repair_jobs
       SET status = $3, approval_status = $4, technician_id = $5,
           labor_cost = $6, actual_cost = $7, parts_used = $8,
           promised_date = $9, delivered_date = $10, resolution_note = $11,
           updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING *
     )
     SELECT ${BASE_SELECT} FROM updated rj ${BASE_JOINS}`,
    [
      job.id, job.tenantId, job.status, job.approvalStatus, job.technicianId,
      job.laborCost, job.actualCost, job.partsUsed,
      job.promisedDate, job.deliveredDate, job.resolutionNote,
    ],
  );
}

export function softDeleteRepairJob(client, id, tenantId, { deletedById, deleteReason } = {}) {
  return client.query(
    `UPDATE repair_jobs
     SET deleted_at = NOW(), deleted_by_id = $3, delete_reason = $4
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [id, tenantId, deletedById || null, deleteReason || ""],
  );
}

export function restoreRepairJob(client, id, tenantId) {
  return client.query(
    `UPDATE repair_jobs
     SET deleted_at = NULL, deleted_by_id = NULL, delete_reason = ''
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NOT NULL
     RETURNING *`,
    [id, tenantId],
  );
}

export function permanentlyDeleteRepairJob(client, id, tenantId) {
  return client.query(
    "DELETE FROM repair_jobs WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NOT NULL",
    [id, tenantId],
  );
}

export async function countTrashedRepairJobs(client, tenantId) {
  const result = await client.query(
    "SELECT COUNT(*)::INTEGER AS count FROM repair_jobs WHERE tenant_id = $1 AND deleted_at IS NOT NULL",
    [tenantId],
  );
  return result.rows[0].count;
}

export async function listTrashedRepairJobs(client, { tenantId, limit, offset }) {
  const result = await client.query(
    `SELECT ${BASE_SELECT}, dbu.name AS deleted_by_name
     FROM repair_jobs rj ${BASE_JOINS}
     LEFT JOIN users dbu ON dbu.id = rj.deleted_by_id
     WHERE rj.tenant_id = $1 AND rj.deleted_at IS NOT NULL
     ORDER BY rj.deleted_at DESC
     LIMIT $2 OFFSET $3`,
    [tenantId, limit, offset],
  );
  return result.rows.map(mapTrashedRepairJob);
}
