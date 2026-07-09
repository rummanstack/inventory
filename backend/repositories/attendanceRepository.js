export function mapAttendance(row) {
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
    attendanceDate: row.attendance_date ? String(row.attendance_date).slice(0, 10) : null,
    status: row.status,
    checkInTime: row.check_in_time ? String(row.check_in_time).slice(0, 5) : "",
    checkOutTime: row.check_out_time ? String(row.check_out_time).slice(0, 5) : "",
    lateMinutes: Number(row.late_minutes || 0),
    overtimeMinutes: Number(row.overtime_minutes || 0),
    note: row.note || "",
    createdBy: row.created_by || null,
    updatedBy: row.updated_by || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const ATTENDANCE_SELECT = `
  SELECT a.*,
         e.employee_number,
         e.name AS employee_name,
         e.department_id,
         COALESCE(d.name, e.department, '') AS department_name,
         e.designation_id,
         COALESCE(des.name, e.designation, '') AS designation_name
  FROM attendance a
  JOIN employees e ON e.id = a.employee_id AND e.tenant_id = a.tenant_id
  LEFT JOIN departments d ON d.id = e.department_id AND d.tenant_id = e.tenant_id AND d.deleted_at IS NULL
  LEFT JOIN designations des ON des.id = e.designation_id AND des.tenant_id = e.tenant_id AND des.deleted_at IS NULL
`;

export async function findAttendanceById(client, tenantId, id) {
  const result = await client.query(
    `${ATTENDANCE_SELECT}
     WHERE a.tenant_id=$1 AND a.id=$2
     LIMIT 1`,
    [tenantId, id],
  );
  return result.rows[0] ? mapAttendance(result.rows[0]) : null;
}

export async function findAttendanceByEmployeeDate(client, tenantId, employeeId, attendanceDate, excludeId = null) {
  const values = [tenantId, employeeId, attendanceDate];
  let excludeClause = "";
  if (excludeId) {
    values.push(excludeId);
    excludeClause = ` AND id != $${values.length}`;
  }
  const result = await client.query(
    `SELECT * FROM attendance
     WHERE tenant_id=$1 AND employee_id=$2 AND attendance_date=$3${excludeClause}
     LIMIT 1`,
    values,
  );
  return result.rows[0] || null;
}

export async function listDailyAttendance(client, filters) {
  const conditions = ["a.tenant_id=$1", "a.attendance_date=$2"];
  const values = [filters.tenantId, filters.date];
  let i = 3;

  if (filters.departmentId) {
    conditions.push(`e.department_id=$${i++}`);
    values.push(filters.departmentId);
  }
  if (filters.employeeId) {
    conditions.push(`a.employee_id=$${i++}`);
    values.push(filters.employeeId);
  }
  if (filters.status) {
    conditions.push(`a.status=$${i++}`);
    values.push(filters.status);
  }

  const result = await client.query(
    `${ATTENDANCE_SELECT}
     WHERE ${conditions.join(" AND ")}
     ORDER BY e.name ASC`,
    values,
  );
  return result.rows.map(mapAttendance);
}

export async function insertAttendance(client, attendance) {
  const result = await client.query(
    `INSERT INTO attendance
      (id, tenant_id, employee_id, attendance_date, status, check_in_time, check_out_time,
       late_minutes, overtime_minutes, note, created_by, updated_by, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11,NOW(),NOW())
     RETURNING *`,
    [
      attendance.id,
      attendance.tenantId,
      attendance.employeeId,
      attendance.attendanceDate,
      attendance.status,
      attendance.checkInTime || null,
      attendance.checkOutTime || null,
      attendance.lateMinutes || 0,
      attendance.overtimeMinutes || 0,
      attendance.note || "",
      attendance.actorId || null,
    ],
  );
  return result.rows[0];
}

export async function updateAttendance(client, attendance) {
  const result = await client.query(
    `UPDATE attendance
     SET employee_id=$3, attendance_date=$4, status=$5, check_in_time=$6, check_out_time=$7,
         late_minutes=$8, overtime_minutes=$9, note=$10, updated_by=$11, updated_at=NOW()
     WHERE id=$1 AND tenant_id=$2
     RETURNING *`,
    [
      attendance.id,
      attendance.tenantId,
      attendance.employeeId,
      attendance.attendanceDate,
      attendance.status,
      attendance.checkInTime || null,
      attendance.checkOutTime || null,
      attendance.lateMinutes || 0,
      attendance.overtimeMinutes || 0,
      attendance.note || "",
      attendance.actorId || null,
    ],
  );
  return result.rows[0] || null;
}

export async function getMonthlyAttendanceSummary(client, filters) {
  const values = [filters.tenantId, `${filters.month}-01`];
  const conditions = [
    "a.tenant_id=$1",
    "a.attendance_date >= $2::date",
    "a.attendance_date < ($2::date + INTERVAL '1 month')",
  ];
  let i = 3;

  if (filters.departmentId) {
    conditions.push(`e.department_id=$${i++}`);
    values.push(filters.departmentId);
  }
  if (filters.employeeId) {
    conditions.push(`a.employee_id=$${i++}`);
    values.push(filters.employeeId);
  }

  const result = await client.query(
    `SELECT a.employee_id,
            e.employee_number,
            e.name AS employee_name,
            e.department_id,
            COALESCE(d.name, e.department, '') AS department_name,
            e.designation_id,
            COALESCE(des.name, e.designation, '') AS designation_name,
            COUNT(*)::INTEGER AS total_days,
            COUNT(*) FILTER (WHERE a.status='PRESENT')::INTEGER AS present_days,
            COUNT(*) FILTER (WHERE a.status='ABSENT')::INTEGER AS absent_days,
            COUNT(*) FILTER (WHERE a.status='LEAVE')::INTEGER AS leave_days,
            COUNT(*) FILTER (WHERE a.status='HOLIDAY')::INTEGER AS holiday_days,
            COALESCE(SUM(a.late_minutes), 0)::INTEGER AS late_minutes,
            COALESCE(SUM(a.overtime_minutes), 0)::INTEGER AS overtime_minutes
     FROM attendance a
     JOIN employees e ON e.id = a.employee_id AND e.tenant_id = a.tenant_id
     LEFT JOIN departments d ON d.id = e.department_id AND d.tenant_id = e.tenant_id AND d.deleted_at IS NULL
     LEFT JOIN designations des ON des.id = e.designation_id AND des.tenant_id = e.tenant_id AND des.deleted_at IS NULL
     WHERE ${conditions.join(" AND ")}
     GROUP BY a.employee_id, e.employee_number, e.name, e.department_id, d.name, e.department, e.designation_id, des.name, e.designation
     ORDER BY e.name ASC`,
    values,
  );

  return result.rows.map((row) => ({
    employeeId: row.employee_id,
    employeeNumber: row.employee_number || "",
    employeeName: row.employee_name || "",
    departmentId: row.department_id || "",
    departmentName: row.department_name || "",
    designationId: row.designation_id || "",
    designationName: row.designation_name || "",
    totalDays: Number(row.total_days || 0),
    presentDays: Number(row.present_days || 0),
    absentDays: Number(row.absent_days || 0),
    leaveDays: Number(row.leave_days || 0),
    holidayDays: Number(row.holiday_days || 0),
    lateMinutes: Number(row.late_minutes || 0),
    overtimeMinutes: Number(row.overtime_minutes || 0),
  }));
}
