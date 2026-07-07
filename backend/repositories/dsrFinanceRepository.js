import { computeTransactionHash } from "../lib/transactionHash.js";

function mapRecord(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    date: row.record_date,
    dsrId: row.dsr_id,
    dsrName: row.dsr_name,
    dsrArea: row.dsr_area,
    dsrPhone: row.dsr_phone,
    amount: Number(row.amount),
    note: row.note,
    transactionHash: row.transaction_hash || null,
    performedById: row.performed_by_id,
    performedByName: row.performed_by_name,
    performedByEmail: row.performed_by_email,
    performedByRole: row.performed_by_role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildSelect(config) {
  return `SELECT
      ${config.table}.id,
      ${config.table}.${config.dateColumn} AS record_date,
      ${config.table}.dsr_id,
      ${config.table}.amount,
      ${config.table}.note,
      ${config.table}.transaction_hash,
      ${config.table}.created_at,
      ${config.table}.updated_at,
      dsrs.name AS dsr_name,
      dsrs.area AS dsr_area,
      dsrs.phone AS dsr_phone,
      users.id AS performed_by_id,
      users.name AS performed_by_name,
      users.email AS performed_by_email,
      users.role AS performed_by_role
    FROM ${config.table}
    LEFT JOIN dsrs ON dsrs.id = ${config.table}.dsr_id
    LEFT JOIN users ON users.id = ${config.table}.${config.ownerColumn}`;
}

export async function findRecordById(client, config, recordId, tenantId) {
  const result = await client.query(
    `${buildSelect(config)}
     WHERE ${config.table}.id = $1 AND ${config.table}.tenant_id = $2
     LIMIT 1`,
    [recordId, tenantId],
  );

  return mapRecord(result.rows[0]);
}

export async function listRecordsInRange(client, config, startDate, endDate, dsrId = "", tenantId) {
  const params = [tenantId, startDate, endDate];
  const conditions = [
    `${config.table}.tenant_id = $1`,
    `${config.table}.${config.dateColumn} >= $2`,
    `${config.table}.${config.dateColumn} < $3`,
  ];

  if (dsrId) {
    params.push(dsrId);
    conditions.push(`${config.table}.dsr_id = $${params.length}`);
  }

  const result = await client.query(
    `${buildSelect(config)}
     WHERE ${conditions.join(" AND ")}
     ORDER BY ${config.table}.${config.dateColumn} DESC, ${config.table}.created_at DESC`,
    params,
  );

  return result.rows.map(mapRecord);
}

export function insertRecord(client, config, record) {
  const transactionHash = computeTransactionHash(config.table, {
    id: record.id,
    tenantId: record.tenantId,
    date: record.date,
    dsrId: record.dsrId,
    amount: record.amount,
    note: record.note,
    createdById: record.performedBy,
  });
  return client.query(
    `INSERT INTO ${config.table} (id, tenant_id, ${config.dateColumn}, dsr_id, amount, note, ${config.ownerColumn}, transaction_hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [record.id, record.tenantId, record.date, record.dsrId, record.amount, record.note, record.performedBy, transactionHash],
  );
}

export function updateRecord(client, config, record, tenantId) {
  return client.query(
    `UPDATE ${config.table}
     SET ${config.dateColumn} = $3,
         dsr_id = $4,
         amount = $5,
         note = $6,
         updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2`,
    [record.id, tenantId, record.date, record.dsrId, record.amount, record.note],
  );
}

export function deleteRecord(client, config, recordId, tenantId) {
  return client.query(`DELETE FROM ${config.table} WHERE id = $1 AND tenant_id = $2`, [recordId, tenantId]);
}
