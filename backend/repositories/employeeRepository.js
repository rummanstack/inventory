export function mapEmployee(row) {
  const departmentName = row.department_name || row.department || "";
  const designationName = row.designation_name || row.designation || "";
  return {
    id: row.id,
    tenantId: row.tenant_id,
    employeeNumber: row.employee_number,
    name: row.name,
    photoUrl: row.photo_url || "",
    phone: row.phone,
    email: row.email,
    address: row.address,
    department: departmentName,
    departmentId: row.department_id || "",
    departmentName,
    designation: designationName,
    designationId: row.designation_id || "",
    designationName,
    joinDate: row.join_date ? String(row.join_date).slice(0, 10) : null,
    status: row.status,
    note: row.note,
    emergencyContactName: row.emergency_contact_name || "",
    emergencyContactPhone: row.emergency_contact_phone || "",
    emergencyContactRelation: row.emergency_contact_relation || "",
    nationalId: row.national_id || "",
    dateOfBirth: row.date_of_birth ? String(row.date_of_birth).slice(0, 10) : "",
    gender: row.gender || "",
    bloodGroup: row.blood_group || "",
    bankName: row.bank_name || "",
    bankAccountName: row.bank_account_name || "",
    bankAccountNumber: row.bank_account_number || "",
    bankBranch: row.bank_branch || "",
    salaryAmount: Number(row.salary_amount || 0),
    payType: row.pay_type || "MONTHLY",
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export function mapEmployeeDocument(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    employeeId: row.employee_id,
    documentType: row.document_type,
    title: row.title || "",
    originalFilename: row.original_filename,
    storedFilename: row.stored_filename,
    mimeType: row.mime_type,
    fileSize: Number(row.file_size || 0),
    uploadedBy: row.uploaded_by || null,
    uploadedByName: row.uploaded_by_name || "",
    createdAt: row.created_at,
    deletedAt: row.deleted_at || null,
  };
}

const EMPLOYEE_SELECT = `
  SELECT e.*,
         d.name AS department_name,
         des.name AS designation_name
  FROM employees e
  LEFT JOIN departments d ON d.id = e.department_id AND d.tenant_id = e.tenant_id AND d.deleted_at IS NULL
  LEFT JOIN designations des ON des.id = e.designation_id AND des.tenant_id = e.tenant_id AND des.deleted_at IS NULL
`;

export async function insertEmployee(client, emp) {
  await client.query(
    `INSERT INTO employees
      (id, tenant_id, employee_number, name, photo_url, phone, email, address, department, department_id,
       designation, designation_id, join_date, status, note, emergency_contact_name, emergency_contact_phone,
       emergency_contact_relation, national_id, date_of_birth, gender, blood_group, bank_name, bank_account_name,
       bank_account_number, bank_branch, salary_amount, pay_type, created_by, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,NOW(),NOW())`,
    [
      emp.id, emp.tenantId, emp.employeeNumber, emp.name, emp.photoUrl || "", emp.phone, emp.email,
      emp.address, emp.department || "", emp.departmentId || null, emp.designation || "", emp.designationId || null,
      emp.joinDate, emp.status, emp.note, emp.emergencyContactName || "", emp.emergencyContactPhone || "",
      emp.emergencyContactRelation || "", emp.nationalId || "", emp.dateOfBirth || null, emp.gender || "",
      emp.bloodGroup || "", emp.bankName || "", emp.bankAccountName || "", emp.bankAccountNumber || "",
      emp.bankBranch || "", emp.salaryAmount ?? 0, emp.payType ?? "MONTHLY", emp.createdBy,
    ],
  );
}

export async function updateEmployee(client, emp) {
  await client.query(
    `UPDATE employees SET
      name=$3, photo_url=$4, phone=$5, email=$6, address=$7, department=$8, department_id=$9,
      designation=$10, designation_id=$11, join_date=$12, status=$13, note=$14,
      emergency_contact_name=$15, emergency_contact_phone=$16, emergency_contact_relation=$17,
      national_id=$18, date_of_birth=$19, gender=$20, blood_group=$21, bank_name=$22,
      bank_account_name=$23, bank_account_number=$24, bank_branch=$25, salary_amount=$26, pay_type=$27,
      updated_at=NOW()
     WHERE id=$1 AND tenant_id=$2 AND deleted_at IS NULL`,
    [
      emp.id, emp.tenantId, emp.name, emp.photoUrl || "", emp.phone, emp.email, emp.address,
      emp.department || "", emp.departmentId || null, emp.designation || "", emp.designationId || null,
      emp.joinDate, emp.status, emp.note, emp.emergencyContactName || "", emp.emergencyContactPhone || "",
      emp.emergencyContactRelation || "", emp.nationalId || "", emp.dateOfBirth || null, emp.gender || "",
      emp.bloodGroup || "", emp.bankName || "", emp.bankAccountName || "", emp.bankAccountNumber || "",
      emp.bankBranch || "", emp.salaryAmount ?? 0, emp.payType ?? "MONTHLY",
    ],
  );
}

export async function findEmployeeById(client, id, tenantId) {
  const result = await client.query(
    `${EMPLOYEE_SELECT} WHERE e.id=$1 AND e.tenant_id=$2 LIMIT 1`,
    [id, tenantId],
  );
  return result.rows[0] ? mapEmployee(result.rows[0]) : null;
}

export function buildEmployeeFilters(params) {
  const conditions = ["e.tenant_id=$1", "e.deleted_at IS NULL"];
  const values = [params.tenantId];
  let i = 2;

  if (params.status) {
    conditions.push(`e.status=$${i++}`);
    values.push(params.status);
  }
  if (params.departmentId) {
    conditions.push(`e.department_id=$${i++}`);
    values.push(params.departmentId);
  } else if (params.department) {
    conditions.push(`LOWER(COALESCE(d.name, e.department))=LOWER($${i++})`);
    values.push(params.department);
  }
  if (params.designationId) {
    conditions.push(`e.designation_id=$${i++}`);
    values.push(params.designationId);
  }
  if (params.search) {
    conditions.push(`(LOWER(e.name) LIKE $${i} OR LOWER(e.employee_number) LIKE $${i} OR LOWER(e.phone) LIKE $${i} OR LOWER(e.email) LIKE $${i} OR LOWER(e.national_id) LIKE $${i})`);
    values.push(`%${params.search.toLowerCase()}%`);
    i++;
  }
  return { conditions, values, nextIndex: i };
}

export async function countEmployees(client, params) {
  const { conditions, values } = buildEmployeeFilters(params);
  const result = await client.query(
    `${EMPLOYEE_SELECT} WHERE ${conditions.join(" AND ")}`.replace(/^\s*SELECT[\s\S]*?FROM employees e/, "SELECT COUNT(*) FROM employees e"),
    values,
  );
  return Number(result.rows[0].count);
}

export async function listEmployeesPage(client, params, limit, offset) {
  const { conditions, values, nextIndex } = buildEmployeeFilters(params);
  const result = await client.query(
    `${EMPLOYEE_SELECT} WHERE ${conditions.join(" AND ")}
     ORDER BY e.created_at DESC LIMIT $${nextIndex} OFFSET $${nextIndex + 1}`,
    [...values, limit, offset],
  );
  return result.rows.map(mapEmployee);
}

export async function listAllActiveEmployees(client, tenantId) {
  const result = await client.query(
    `${EMPLOYEE_SELECT} WHERE e.tenant_id=$1 AND e.status='ACTIVE' AND e.deleted_at IS NULL ORDER BY e.name ASC`,
    [tenantId],
  );
  return result.rows.map(mapEmployee);
}

export async function softDeleteEmployee(client, id, tenantId, deletedById, reason) {
  await client.query(
    `UPDATE employees SET deleted_at=NOW(), deleted_by_id=$3, delete_reason=$4, updated_at=NOW()
     WHERE id=$1 AND tenant_id=$2 AND deleted_at IS NULL`,
    [id, tenantId, deletedById, reason],
  );
}

export async function restoreEmployee(client, id, tenantId) {
  await client.query(
    `UPDATE employees SET deleted_at=NULL, deleted_by_id=NULL, delete_reason='', updated_at=NOW()
     WHERE id=$1 AND tenant_id=$2`,
    [id, tenantId],
  );
}

export async function listEmployeeDocuments(client, tenantId, employeeId) {
  const result = await client.query(
    `SELECT ed.*, u.name AS uploaded_by_name
     FROM employee_documents ed
     LEFT JOIN users u ON u.id = ed.uploaded_by
     WHERE ed.tenant_id=$1 AND ed.employee_id=$2 AND ed.deleted_at IS NULL
     ORDER BY ed.created_at DESC`,
    [tenantId, employeeId],
  );
  return result.rows.map(mapEmployeeDocument);
}

export async function findEmployeeDocumentById(client, tenantId, employeeId, documentId) {
  const result = await client.query(
    `SELECT ed.*, u.name AS uploaded_by_name
     FROM employee_documents ed
     LEFT JOIN users u ON u.id = ed.uploaded_by
     WHERE ed.tenant_id=$1 AND ed.employee_id=$2 AND ed.id=$3
     LIMIT 1`,
    [tenantId, employeeId, documentId],
  );
  return result.rows[0] || null;
}

export async function insertEmployeeDocument(client, doc) {
  const result = await client.query(
    `INSERT INTO employee_documents
      (id, tenant_id, employee_id, document_type, title, original_filename, stored_filename, storage_path,
       mime_type, file_size, uploaded_by, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())
     RETURNING *`,
    [
      doc.id, doc.tenantId, doc.employeeId, doc.documentType, doc.title || "", doc.originalFilename,
      doc.storedFilename, doc.storagePath, doc.mimeType, doc.fileSize || 0, doc.uploadedBy || null,
    ],
  );
  return mapEmployeeDocument(result.rows[0]);
}

export async function softDeleteEmployeeDocument(client, tenantId, employeeId, documentId, deletedById, reason) {
  await client.query(
    `UPDATE employee_documents
     SET deleted_at=NOW(), deleted_by_id=$4, delete_reason=$5
     WHERE tenant_id=$1 AND employee_id=$2 AND id=$3 AND deleted_at IS NULL`,
    [tenantId, employeeId, documentId, deletedById || null, reason || ""],
  );
}
