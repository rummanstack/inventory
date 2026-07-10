function mapVoucher(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    voucherNumber: row.voucher_number,
    voucherType: row.voucher_type,
    status: row.status,
    voucherDate: row.voucher_date,
    fiscalYearId: row.fiscal_year_id,
    accountingPeriodId: row.accounting_period_id,
    referenceNumber: row.reference_number || '',
    narration: row.narration || '',
    notes: row.notes || '',
    counterpartyName: row.counterparty_name || '',
    cashBankAccountCode: row.cash_bank_account_code || null,
    fromAccountCode: row.from_account_code || null,
    toAccountCode: row.to_account_code || null,
    journalEntryId: row.journal_entry_id || null,
    reversalJournalEntryId: row.reversal_journal_entry_id || null,
    reversalOfVoucherId: row.reversal_of_voucher_id || null,
    createdBy: row.created_by || null,
    createdByName: row.created_by_name || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    submittedBy: row.submitted_by || null,
    submittedAt: row.submitted_at,
    approvedBy: row.approved_by || null,
    approvedAt: row.approved_at,
    postedBy: row.posted_by || null,
    postedAt: row.posted_at,
    lockedAt: row.locked_at,
    reversedBy: row.reversed_by || null,
    reversedAt: row.reversed_at,
    deletedAt: row.deleted_at,
    totalDebit: Number(row.total_debit || 0),
    totalCredit: Number(row.total_credit || 0),
    attachmentCount: Number(row.attachment_count || 0),
  };
}

function mapVoucherLine(row) {
  return {
    id: row.id,
    voucherId: row.voucher_id,
    lineNo: Number(row.line_no || 0),
    accountCode: row.account_code,
    accountName: row.account_name || '',
    side: row.side,
    amount: Number(row.amount || 0),
    note: row.note || '',
    referenceType: row.reference_type || '',
    referenceId: row.reference_id || null,
    referenceName: row.reference_name || '',
  };
}

function mapVoucherAttachment(row) {
  return {
    id: row.id,
    voucherId: row.voucher_id,
    title: row.title || '',
    originalFilename: row.original_filename,
    storedFilename: row.stored_filename,
    storagePath: row.storage_path,
    mimeType: row.mime_type || '',
    fileSize: Number(row.file_size || 0),
    uploadedBy: row.uploaded_by || null,
    uploadedByName: row.uploaded_by_name || '',
    createdAt: row.created_at,
    deletedAt: row.deleted_at || null,
  };
}

export async function nextVoucherCounter(client, tenantId, voucherType) {
  const result = await client.query(
    `INSERT INTO voucher_counters (tenant_id, voucher_type, last_value)
     VALUES ($1, $2, 1)
     ON CONFLICT (tenant_id, voucher_type)
     DO UPDATE SET last_value = voucher_counters.last_value + 1
     RETURNING last_value`,
    [tenantId, voucherType],
  );
  return Number(result.rows[0].last_value || 1);
}

export async function findVoucherById(client, tenantId, id) {
  const result = await client.query(
    `SELECT v.*,
            creator.name AS created_by_name,
            COALESCE(line_totals.total_debit, 0) AS total_debit,
            COALESCE(line_totals.total_credit, 0) AS total_credit,
            COALESCE(att.attachment_count, 0) AS attachment_count
     FROM vouchers v
     LEFT JOIN users creator ON creator.id = v.created_by
     LEFT JOIN (
       SELECT voucher_id,
              SUM(CASE WHEN side = 'DEBIT' THEN amount ELSE 0 END) AS total_debit,
              SUM(CASE WHEN side = 'CREDIT' THEN amount ELSE 0 END) AS total_credit
       FROM voucher_lines
       WHERE tenant_id = $1
       GROUP BY voucher_id
     ) line_totals ON line_totals.voucher_id = v.id
     LEFT JOIN (
       SELECT voucher_id, COUNT(*) AS attachment_count
       FROM voucher_attachments
       WHERE tenant_id = $1 AND deleted_at IS NULL
       GROUP BY voucher_id
     ) att ON att.voucher_id = v.id
     WHERE v.tenant_id = $1 AND v.id = $2 AND v.deleted_at IS NULL
     LIMIT 1`,
    [tenantId, id],
  );
  return result.rowCount ? mapVoucher(result.rows[0]) : null;
}

export async function findVoucherByReference(client, tenantId, voucherType, referenceNumber, excludeId = null) {
  if (!referenceNumber) return null;
  const params = [tenantId, voucherType, referenceNumber];
  let where = `tenant_id = $1 AND voucher_type = $2 AND reference_number = $3 AND deleted_at IS NULL`;
  if (excludeId) {
    params.push(excludeId);
    where += ` AND id <> $${params.length}`;
  }
  const result = await client.query(`SELECT id FROM vouchers WHERE ${where} LIMIT 1`, params);
  return result.rowCount ? result.rows[0] : null;
}

export async function insertVoucher(client, voucher) {
  const result = await client.query(
    `INSERT INTO vouchers (
      id, tenant_id, voucher_number, voucher_type, status, voucher_date, fiscal_year_id, accounting_period_id,
      reference_number, narration, notes, counterparty_name, cash_bank_account_code, from_account_code,
      to_account_code, created_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
    RETURNING *`,
    [
      voucher.id,
      voucher.tenantId,
      voucher.voucherNumber,
      voucher.voucherType,
      voucher.status,
      voucher.voucherDate,
      voucher.fiscalYearId,
      voucher.accountingPeriodId,
      voucher.referenceNumber,
      voucher.narration,
      voucher.notes,
      voucher.counterpartyName,
      voucher.cashBankAccountCode,
      voucher.fromAccountCode,
      voucher.toAccountCode,
      voucher.createdBy,
    ],
  );
  return mapVoucher(result.rows[0]);
}

export async function updateVoucherHeader(client, voucher) {
  const result = await client.query(
    `UPDATE vouchers
     SET voucher_date = $3,
         fiscal_year_id = $4,
         accounting_period_id = $5,
         reference_number = $6,
         narration = $7,
         notes = $8,
         counterparty_name = $9,
         cash_bank_account_code = $10,
         from_account_code = $11,
         to_account_code = $12,
         updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2
     RETURNING *`,
    [
      voucher.id,
      voucher.tenantId,
      voucher.voucherDate,
      voucher.fiscalYearId,
      voucher.accountingPeriodId,
      voucher.referenceNumber,
      voucher.narration,
      voucher.notes,
      voucher.counterpartyName,
      voucher.cashBankAccountCode,
      voucher.fromAccountCode,
      voucher.toAccountCode,
    ],
  );
  return result.rowCount ? mapVoucher(result.rows[0]) : null;
}

export async function replaceVoucherLines(client, tenantId, voucherId, lines) {
  await client.query(`DELETE FROM voucher_lines WHERE tenant_id = $1 AND voucher_id = $2`, [tenantId, voucherId]);
  for (const line of lines) {
    await client.query(
      `INSERT INTO voucher_lines (id, tenant_id, voucher_id, line_no, account_code, side, amount, note, reference_type, reference_id, reference_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        line.id,
        tenantId,
        voucherId,
        line.lineNo,
        line.accountCode,
        line.side,
        line.amount,
        line.note || '',
        line.referenceType || '',
        line.referenceId || null,
        line.referenceName || '',
      ],
    );
  }
}

export async function listVoucherLines(client, tenantId, voucherId) {
  const result = await client.query(
    `SELECT vl.*, coa.name AS account_name
     FROM voucher_lines vl
     JOIN chart_of_accounts coa ON coa.code = vl.account_code
     WHERE vl.tenant_id = $1 AND vl.voucher_id = $2
     ORDER BY vl.line_no ASC`,
    [tenantId, voucherId],
  );
  return result.rows.map(mapVoucherLine);
}

export async function listVouchers(client, filters) {
  const params = [filters.tenantId];
  const where = [`v.tenant_id = $1`, `v.deleted_at IS NULL`];

  if (filters.voucherType) {
    params.push(filters.voucherType);
    where.push(`v.voucher_type = $${params.length}`);
  }
  if (filters.status) {
    params.push(filters.status);
    where.push(`v.status = $${params.length}`);
  }
  if (filters.voucherNumber) {
    params.push(`%${filters.voucherNumber}%`);
    where.push(`v.voucher_number ILIKE $${params.length}`);
  }
  if (filters.referenceNumber) {
    params.push(`%${filters.referenceNumber}%`);
    where.push(`v.reference_number ILIKE $${params.length}`);
  }
  if (filters.dateFrom) {
    params.push(filters.dateFrom);
    where.push(`v.voucher_date >= $${params.length}::date`);
  }
  if (filters.dateTo) {
    params.push(filters.dateTo);
    where.push(`v.voucher_date <= $${params.length}::date`);
  }
  if (filters.fiscalYearId) {
    params.push(filters.fiscalYearId);
    where.push(`v.fiscal_year_id = $${params.length}`);
  }
  if (filters.accountingPeriodId) {
    params.push(filters.accountingPeriodId);
    where.push(`v.accounting_period_id = $${params.length}`);
  }
  if (filters.createdBy) {
    params.push(filters.createdBy);
    where.push(`v.created_by = $${params.length}`);
  }
  if (filters.accountCode) {
    params.push(filters.accountCode);
    where.push(`EXISTS (SELECT 1 FROM voucher_lines vl WHERE vl.voucher_id = v.id AND vl.tenant_id = v.tenant_id AND vl.account_code = $${params.length})`);
  }
  if (filters.customerId) {
    params.push(filters.customerId);
    where.push(`EXISTS (SELECT 1 FROM voucher_lines vl WHERE vl.voucher_id = v.id AND vl.tenant_id = v.tenant_id AND vl.reference_type = 'CUSTOMER' AND vl.reference_id = $${params.length})`);
  }
  if (filters.supplierId) {
    params.push(filters.supplierId);
    where.push(`EXISTS (SELECT 1 FROM voucher_lines vl WHERE vl.voucher_id = v.id AND vl.tenant_id = v.tenant_id AND vl.reference_type = 'SUPPLIER' AND vl.reference_id = $${params.length})`);
  }

  const result = await client.query(
    `SELECT v.*,
            creator.name AS created_by_name,
            COALESCE(line_totals.total_debit, 0) AS total_debit,
            COALESCE(line_totals.total_credit, 0) AS total_credit,
            COALESCE(att.attachment_count, 0) AS attachment_count
     FROM vouchers v
     LEFT JOIN users creator ON creator.id = v.created_by
     LEFT JOIN (
       SELECT voucher_id,
              SUM(CASE WHEN side = 'DEBIT' THEN amount ELSE 0 END) AS total_debit,
              SUM(CASE WHEN side = 'CREDIT' THEN amount ELSE 0 END) AS total_credit
       FROM voucher_lines
       WHERE tenant_id = $1
       GROUP BY voucher_id
     ) line_totals ON line_totals.voucher_id = v.id
     LEFT JOIN (
       SELECT voucher_id, COUNT(*) AS attachment_count
       FROM voucher_attachments
       WHERE tenant_id = $1 AND deleted_at IS NULL
       GROUP BY voucher_id
     ) att ON att.voucher_id = v.id
     WHERE ${where.join(' AND ')}
     ORDER BY v.voucher_date DESC, v.created_at DESC`,
    params,
  );
  return result.rows.map(mapVoucher);
}

export async function setVoucherState(client, tenantId, id, fields) {
  const columns = [];
  const params = [id, tenantId];
  const map = {
    status: 'status',
    submittedBy: 'submitted_by',
    submittedAt: 'submitted_at',
    approvedBy: 'approved_by',
    approvedAt: 'approved_at',
    postedBy: 'posted_by',
    postedAt: 'posted_at',
    lockedAt: 'locked_at',
    reversedBy: 'reversed_by',
    reversedAt: 'reversed_at',
    journalEntryId: 'journal_entry_id',
    reversalJournalEntryId: 'reversal_journal_entry_id',
    reversalOfVoucherId: 'reversal_of_voucher_id',
  };
  for (const [key, column] of Object.entries(map)) {
    if (!(key in fields)) continue;
    params.push(fields[key]);
    columns.push(`${column} = $${params.length}`);
  }
  columns.push(`updated_at = NOW()`);
  const result = await client.query(
    `UPDATE vouchers SET ${columns.join(', ')} WHERE id = $1 AND tenant_id = $2 RETURNING *`,
    params,
  );
  return result.rowCount ? mapVoucher(result.rows[0]) : null;
}

export async function softDeleteVoucher(client, tenantId, id, deletedById, reason) {
  await client.query(
    `UPDATE vouchers
     SET deleted_at = NOW(), deleted_by_id = $3, delete_reason = $4, updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2`,
    [id, tenantId, deletedById, reason || ''],
  );
}

export async function insertVoucherAttachment(client, item) {
  const result = await client.query(
    `INSERT INTO voucher_attachments (
      id, tenant_id, voucher_id, title, original_filename, stored_filename,
      storage_path, mime_type, file_size, uploaded_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING *`,
    [
      item.id,
      item.tenantId,
      item.voucherId,
      item.title,
      item.originalFilename,
      item.storedFilename,
      item.storagePath,
      item.mimeType,
      item.fileSize,
      item.uploadedBy,
    ],
  );
  return mapVoucherAttachment(result.rows[0]);
}

export async function listVoucherAttachments(client, tenantId, voucherId) {
  const result = await client.query(
    `SELECT va.*, u.name AS uploaded_by_name
     FROM voucher_attachments va
     LEFT JOIN users u ON u.id = va.uploaded_by
     WHERE va.tenant_id = $1 AND va.voucher_id = $2 AND va.deleted_at IS NULL
     ORDER BY va.created_at DESC`,
    [tenantId, voucherId],
  );
  return result.rows.map(mapVoucherAttachment);
}

export async function findVoucherAttachmentById(client, tenantId, voucherId, attachmentId) {
  const result = await client.query(
    `SELECT va.*, u.name AS uploaded_by_name
     FROM voucher_attachments va
     LEFT JOIN users u ON u.id = va.uploaded_by
     WHERE va.tenant_id = $1 AND va.voucher_id = $2 AND va.id = $3
     LIMIT 1`,
    [tenantId, voucherId, attachmentId],
  );
  return result.rowCount ? mapVoucherAttachment(result.rows[0]) : null;
}

export async function softDeleteVoucherAttachment(client, tenantId, voucherId, attachmentId, deletedById, reason) {
  await client.query(
    `UPDATE voucher_attachments
     SET deleted_at = NOW(), deleted_by_id = $4, delete_reason = $5
     WHERE tenant_id = $1 AND voucher_id = $2 AND id = $3`,
    [tenantId, voucherId, attachmentId, deletedById, reason || ''],
  );
}

export async function listJournalRegister(client, filters) {
  const params = [filters.tenantId];
  const where = [`v.tenant_id = $1`, `v.deleted_at IS NULL`, `v.journal_entry_id IS NOT NULL`];
  if (filters.voucherType) {
    params.push(filters.voucherType);
    where.push(`v.voucher_type = $${params.length}`);
  }
  if (filters.dateFrom) {
    params.push(filters.dateFrom);
    where.push(`v.voucher_date >= $${params.length}::date`);
  }
  if (filters.dateTo) {
    params.push(filters.dateTo);
    where.push(`v.voucher_date <= $${params.length}::date`);
  }
  const result = await client.query(
    `SELECT v.voucher_number, v.voucher_type, v.status, v.voucher_date, v.reference_number, v.narration,
            v.journal_entry_id, je.source_type, je.memo,
            COALESCE(SUM(CASE WHEN vl.side = 'DEBIT' THEN vl.amount ELSE 0 END),0) AS total_debit,
            COALESCE(SUM(CASE WHEN vl.side = 'CREDIT' THEN vl.amount ELSE 0 END),0) AS total_credit
     FROM vouchers v
     JOIN journal_entries je ON je.id = v.journal_entry_id
     LEFT JOIN voucher_lines vl ON vl.voucher_id = v.id AND vl.tenant_id = v.tenant_id
     WHERE ${where.join(' AND ')}
     GROUP BY v.id, je.id
     ORDER BY v.voucher_date DESC, v.created_at DESC`,
    params,
  );
  return result.rows.map((row) => ({
    voucherNumber: row.voucher_number,
    voucherType: row.voucher_type,
    status: row.status,
    voucherDate: row.voucher_date,
    referenceNumber: row.reference_number || '',
    narration: row.narration || '',
    journalEntryId: row.journal_entry_id,
    sourceType: row.source_type,
    memo: row.memo || '',
    totalDebit: Number(row.total_debit || 0),
    totalCredit: Number(row.total_credit || 0),
  }));
}
