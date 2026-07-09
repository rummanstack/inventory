export function mapLeaveType(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    code: row.code || "",
    status: row.status,
    paid: Boolean(row.paid),
    annualDays: Number(row.annual_days || 0),
    carryForward: Boolean(row.carry_forward),
    note: row.note || "",
    requestCount: Number(row.request_count || 0),
    createdBy: row.created_by || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at || null,
  };
}

export function mapLeaveRequest(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    employeeId: row.employee_id,
    employeeNumber: row.employee_number || "",
    employeeName: row.employee_name || "",
    departmentId: row.department_id || "",
    departmentName: row.department_name || "",
    designationId: row.designation_id || "",
    designationName: row.designation_name || "",
    leaveTypeId: row.leave_type_id,
    leaveTypeName: row.leave_type_name || "",
    leaveTypeCode: row.leave_type_code || "",
    startDate: row.start_date ? String(row.start_date).slice(0, 10) : null,
    endDate: row.end_date ? String(row.end_date).slice(0, 10) : null,
    totalDays: Number(row.total_days || 0),
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

const LEAVE_TYPE_SELECT = `
  SELECT lt.*,
         COUNT(lr.id) AS request_count
  FROM leave_types lt
  LEFT JOIN leave_requests lr ON lr.leave_type_id = lt.id AND lr.tenant_id = lt.tenant_id
`;

const LEAVE_REQUEST_SELECT = `
  SELECT lr.*,
         e.employee_number,
         e.name AS employee_name,
         e.department_id,
         COALESCE(d.name, e.department, '') AS department_name,
         e.designation_id,
         COALESCE(des.name, e.designation, '') AS designation_name,
         lt.name AS leave_type_name,
         lt.code AS leave_type_code
  FROM leave_requests lr
  JOIN employees e ON e.id = lr.employee_id AND e.tenant_id = lr.tenant_id
  JOIN leave_types lt ON lt.id = lr.leave_type_id AND lt.tenant_id = lr.tenant_id
  LEFT JOIN departments d ON d.id = e.department_id AND d.tenant_id = e.tenant_id AND d.deleted_at IS NULL
  LEFT JOIN designations des ON des.id = e.designation_id AND des.tenant_id = e.tenant_id AND des.deleted_at IS NULL
`;

function buildLeaveTypeFilters(filters) {
  const conditions = ["lt.tenant_id=$1", "lt.deleted_at IS NULL"];
  const values = [filters.tenantId];
  let i = 2;

  if (filters.status) {
    conditions.push(`lt.status=$${i++}`);
    values.push(filters.status);
  }
  if (filters.search) {
    conditions.push(`(LOWER(lt.name) LIKE $${i} OR LOWER(lt.code) LIKE $${i})`);
    values.push(`%${String(filters.search).trim().toLowerCase()}%`);
    i += 1;
  }

  return { conditions, values, nextIndex: i };
}

export async function countLeaveTypes(client, filters) {
  const { conditions, values } = buildLeaveTypeFilters(filters);
  const result = await client.query(
    `SELECT COUNT(*)::INTEGER AS count FROM leave_types lt WHERE ${conditions.join(" AND ")}`,
    values,
  );
  return Number(result.rows[0]?.count || 0);
}

export async function listLeaveTypesPage(client, filters, limit, offset) {
  const { conditions, values, nextIndex } = buildLeaveTypeFilters(filters);
  const result = await client.query(
    `${LEAVE_TYPE_SELECT}
     WHERE ${conditions.join(" AND ")}
     GROUP BY lt.id
     ORDER BY lt.name ASC
     LIMIT $${nextIndex} OFFSET $${nextIndex + 1}`,
    [...values, limit, offset],
  );
  return result.rows.map(mapLeaveType);
}

export async function listActiveLeaveTypes(client, tenantId) {
  const result = await client.query(
    `${LEAVE_TYPE_SELECT}
     WHERE lt.tenant_id=$1 AND lt.status='ACTIVE' AND lt.deleted_at IS NULL
     GROUP BY lt.id
     ORDER BY lt.name ASC`,
    [tenantId],
  );
  return result.rows.map(mapLeaveType);
}

export async function findLeaveTypeById(client, tenantId, id) {
  const result = await client.query(
    `${LEAVE_TYPE_SELECT}
     WHERE lt.tenant_id=$1 AND lt.id=$2
     GROUP BY lt.id
     LIMIT 1`,
    [tenantId, id],
  );
  return result.rows[0] ? mapLeaveType(result.rows[0]) : null;
}

export async function findLeaveTypeByName(client, tenantId, name, excludeId = null) {
  const values = [tenantId, name];
  let excludeClause = "";
  if (excludeId) {
    values.push(excludeId);
    excludeClause = `AND id != $${values.length}`;
  }
  const result = await client.query(
    `SELECT * FROM leave_types
     WHERE tenant_id=$1 AND LOWER(name)=LOWER($2) AND deleted_at IS NULL ${excludeClause}
     LIMIT 1`,
    values,
  );
  return result.rows[0] ? mapLeaveType(result.rows[0]) : null;
}

export async function insertLeaveType(client, leaveType) {
  const result = await client.query(
    `INSERT INTO leave_types
      (id, tenant_id, name, code, status, paid, annual_days, carry_forward, note, created_by, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())
     RETURNING *`,
    [
      leaveType.id,
      leaveType.tenantId,
      leaveType.name,
      leaveType.code || "",
      leaveType.status,
      leaveType.paid,
      leaveType.annualDays || 0,
      leaveType.carryForward,
      leaveType.note || "",
      leaveType.createdBy || null,
    ],
  );
  return mapLeaveType(result.rows[0]);
}

export async function updateLeaveType(client, leaveType) {
  const result = await client.query(
    `UPDATE leave_types
     SET name=$3, code=$4, status=$5, paid=$6, annual_days=$7, carry_forward=$8, note=$9, updated_at=NOW()
     WHERE id=$1 AND tenant_id=$2 AND deleted_at IS NULL
     RETURNING *`,
    [
      leaveType.id,
      leaveType.tenantId,
      leaveType.name,
      leaveType.code || "",
      leaveType.status,
      leaveType.paid,
      leaveType.annualDays || 0,
      leaveType.carryForward,
      leaveType.note || "",
    ],
  );
  return result.rows[0] ? mapLeaveType(result.rows[0]) : null;
}

export function softDeleteLeaveType(client, tenantId, id, { deletedById, deleteReason } = {}) {
  return client.query(
    `UPDATE leave_types
     SET deleted_at=NOW(), deleted_by_id=$3, delete_reason=$4, updated_at=NOW()
     WHERE tenant_id=$1 AND id=$2 AND deleted_at IS NULL`,
    [tenantId, id, deletedById || null, deleteReason || ""],
  );
}

function buildLeaveRequestFilters(filters) {
  const conditions = ["lr.tenant_id=$1"];
  const values = [filters.tenantId];
  let i = 2;

  if (filters.status) {
    conditions.push(`lr.status=$${i++}`);
    values.push(filters.status);
  }
  if (filters.employeeId) {
    conditions.push(`lr.employee_id=$${i++}`);
    values.push(filters.employeeId);
  }
  if (filters.leaveTypeId) {
    conditions.push(`lr.leave_type_id=$${i++}`);
    values.push(filters.leaveTypeId);
  }
  if (filters.departmentId) {
    conditions.push(`e.department_id=$${i++}`);
    values.push(filters.departmentId);
  }
  if (filters.fromDate) {
    conditions.push(`lr.end_date >= $${i++}::date`);
    values.push(filters.fromDate);
  }
  if (filters.toDate) {
    conditions.push(`lr.start_date <= $${i++}::date`);
    values.push(filters.toDate);
  }

  return { conditions, values, nextIndex: i };
}

export async function countLeaveRequests(client, filters) {
  const { conditions, values } = buildLeaveRequestFilters(filters);
  const result = await client.query(
    `${LEAVE_REQUEST_SELECT}
     WHERE ${conditions.join(" AND ")}`.replace(/^\s*SELECT[\s\S]*?FROM leave_requests lr/, "SELECT COUNT(*) FROM leave_requests lr"),
    values,
  );
  return Number(result.rows[0]?.count || 0);
}

export async function listLeaveRequestsPage(client, filters, limit, offset) {
  const { conditions, values, nextIndex } = buildLeaveRequestFilters(filters);
  const result = await client.query(
    `${LEAVE_REQUEST_SELECT}
     WHERE ${conditions.join(" AND ")}
     ORDER BY lr.start_date DESC, lr.created_at DESC
     LIMIT $${nextIndex} OFFSET $${nextIndex + 1}`,
    [...values, limit, offset],
  );
  return result.rows.map(mapLeaveRequest);
}

export async function findLeaveRequestById(client, tenantId, id) {
  const result = await client.query(
    `${LEAVE_REQUEST_SELECT}
     WHERE lr.tenant_id=$1 AND lr.id=$2
     LIMIT 1`,
    [tenantId, id],
  );
  return result.rows[0] ? mapLeaveRequest(result.rows[0]) : null;
}

export async function findOverlappingLeaveRequest(client, { tenantId, employeeId, startDate, endDate, excludeId = null }) {
  const values = [tenantId, employeeId, startDate, endDate];
  let excludeClause = "";
  if (excludeId) {
    values.push(excludeId);
    excludeClause = `AND id != $${values.length}`;
  }
  const result = await client.query(
    `SELECT * FROM leave_requests
     WHERE tenant_id=$1 AND employee_id=$2 AND status IN ('PENDING','APPROVED')
       AND start_date <= $4::date AND end_date >= $3::date ${excludeClause}
     LIMIT 1`,
    values,
  );
  return result.rows[0] || null;
}

export async function insertLeaveRequest(client, leaveRequest) {
  const result = await client.query(
    `INSERT INTO leave_requests
      (id, tenant_id, employee_id, leave_type_id, start_date, end_date, total_days, status, reason, requested_by, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'PENDING',$8,$9,NOW(),NOW())
     RETURNING *`,
    [
      leaveRequest.id,
      leaveRequest.tenantId,
      leaveRequest.employeeId,
      leaveRequest.leaveTypeId,
      leaveRequest.startDate,
      leaveRequest.endDate,
      leaveRequest.totalDays,
      leaveRequest.reason || "",
      leaveRequest.requestedBy || null,
    ],
  );
  return result.rows[0];
}

export async function approveLeaveRequest(client, { tenantId, id, actorId, decisionNote }) {
  const result = await client.query(
    `UPDATE leave_requests
     SET status='APPROVED', decision_note=$4, approved_by=$3, approved_at=NOW(), rejected_by=NULL, rejected_at=NULL, updated_at=NOW()
     WHERE tenant_id=$1 AND id=$2 AND status='PENDING'
     RETURNING *`,
    [tenantId, id, actorId || null, decisionNote || ""],
  );
  return result.rows[0] || null;
}

export async function rejectLeaveRequest(client, { tenantId, id, actorId, decisionNote }) {
  const result = await client.query(
    `UPDATE leave_requests
     SET status='REJECTED', decision_note=$4, rejected_by=$3, rejected_at=NOW(), approved_by=NULL, approved_at=NULL, updated_at=NOW()
     WHERE tenant_id=$1 AND id=$2 AND status='PENDING'
     RETURNING *`,
    [tenantId, id, actorId || null, decisionNote || ""],
  );
  return result.rows[0] || null;
}

export async function getLeaveReportSummary(client, filters) {
  const { conditions, values } = buildLeaveRequestFilters(filters);
  const result = await client.query(
    `SELECT lr.status,
            COUNT(*)::INTEGER AS request_count,
            COALESCE(SUM(lr.total_days), 0)::NUMERIC AS total_days
     FROM leave_requests lr
     JOIN employees e ON e.id = lr.employee_id AND e.tenant_id = lr.tenant_id
     WHERE ${conditions.join(" AND ")}
     GROUP BY lr.status`,
    values,
  );
  return result.rows.map((row) => ({
    status: row.status,
    requestCount: Number(row.request_count || 0),
    totalDays: Number(row.total_days || 0),
  }));
}
