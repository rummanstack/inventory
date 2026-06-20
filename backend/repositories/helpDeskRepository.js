function normalizeNotes(notes) {
  if (!Array.isArray(notes)) {
    return [];
  }

  return notes.map((note) => ({
    id: note.id,
    body: note.body,
    authorId: note.created_by ?? note.authorId ?? null,
    authorName: note.author_name ?? note.authorName ?? "",
    createdAt: note.created_at ?? note.createdAt ?? null,
  }));
}

export function mapHelpDeskTicket(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    ticketNumber: row.ticket_number,
    subject: row.subject,
    category: row.category,
    priority: row.priority,
    status: row.status,
    channel: row.channel,
    customerName: row.customer_name || "",
    customerPhone: row.customer_phone || "",
    referenceNumber: row.reference_number || "",
    description: row.description || "",
    assigneeId: row.assignee_id || "",
    assigneeName: row.assignee_name || "",
    createdById: row.created_by || "",
    createdByName: row.created_by_name || "",
    updatedById: row.updated_by || "",
    updatedByName: row.updated_by_name || "",
    escalatedAt: row.escalated_at || null,
    closedAt: row.closed_at || null,
    lastNoteAt: row.last_note_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    notes: normalizeNotes(row.notes),
  };
}

function buildFilters({ tenantId, search, status, priority, category, tab }, params) {
  params.push(tenantId);
  const conditions = ["t.tenant_id = $1"];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(
      t.ticket_number ILIKE $${params.length}
      OR t.subject ILIKE $${params.length}
      OR t.customer_name ILIKE $${params.length}
      OR t.customer_phone ILIKE $${params.length}
      OR t.reference_number ILIKE $${params.length}
      OR t.description ILIKE $${params.length}
      OR t.assignee_name ILIKE $${params.length}
    )`);
  }

  if (status) {
    params.push(status);
    conditions.push(`t.status = $${params.length}`);
  }

  if (priority) {
    params.push(priority);
    conditions.push(`t.priority = $${params.length}`);
  }

  if (category) {
    params.push(category);
    conditions.push(`t.category = $${params.length}`);
  }

  if (tab === "escalations") {
    conditions.push("t.status NOT IN ('RESOLVED', 'CLOSED')");
    conditions.push("(t.priority = 'URGENT' OR (t.priority = 'HIGH' AND t.created_at <= NOW() - INTERVAL '2 days') OR t.status = 'WAITING_CUSTOMER')");
  } else if (tab === "tickets") {
    conditions.push("t.status <> 'CLOSED'");
  }

  return `WHERE ${conditions.join(" AND ")}`;
}

export async function listHelpDeskTickets(client, filters = {}) {
  const params = [];
  const where = buildFilters(filters, params);
  const result = await client.query(
    `SELECT
      t.*,
      COALESCE(
        jsonb_agg(
          DISTINCT jsonb_build_object(
            'id', n.id,
            'body', n.body,
            'authorId', n.created_by,
            'authorName', n.author_name,
            'createdAt', n.created_at
          )
        ) FILTER (WHERE n.id IS NOT NULL),
        '[]'::jsonb
      ) AS notes
     FROM help_desk_tickets t
     LEFT JOIN help_desk_ticket_notes n ON n.ticket_id = t.id
     ${where}
     GROUP BY t.id
     ORDER BY t.updated_at DESC, t.created_at DESC`,
    params,
  );

  return result.rows.map(mapHelpDeskTicket);
}

export function findHelpDeskTicketById(client, ticketId, tenantId) {
  return client.query("SELECT * FROM help_desk_tickets WHERE id = $1 AND tenant_id = $2 LIMIT 1", [ticketId, tenantId]);
}

export function findHelpDeskTicketForUpdate(client, ticketId, tenantId) {
  return client.query("SELECT * FROM help_desk_tickets WHERE id = $1 AND tenant_id = $2 LIMIT 1 FOR UPDATE", [
    ticketId,
    tenantId,
  ]);
}

export async function findHelpDeskTicketDetailsById(client, ticketId, tenantId) {
  const result = await client.query(
    `SELECT
      t.*,
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', n.id,
            'body', n.body,
            'authorId', n.created_by,
            'authorName', n.author_name,
            'createdAt', n.created_at
          ) ORDER BY n.created_at ASC
        ) FILTER (WHERE n.id IS NOT NULL),
        '[]'::jsonb
      ) AS notes
     FROM help_desk_tickets t
     LEFT JOIN help_desk_ticket_notes n ON n.ticket_id = t.id
     WHERE t.id = $1 AND t.tenant_id = $2
     GROUP BY t.id
     LIMIT 1`,
    [ticketId, tenantId],
  );

  return result.rows[0] || null;
}

export function insertHelpDeskTicket(client, ticket) {
  return client.query(
    `INSERT INTO help_desk_tickets (
      id, tenant_id, ticket_number, subject, category, priority, status, channel,
      customer_name, customer_phone, reference_number, description,
      assignee_id, assignee_name, created_by, created_by_name,
      updated_by, updated_by_name, escalated_at, closed_at, last_note_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8,
      $9, $10, $11, $12,
      $13, $14, $15, $16,
      $17, $18, $19, $20, $21
    )
    RETURNING *`,
    [
      ticket.id,
      ticket.tenantId,
      ticket.ticketNumber,
      ticket.subject,
      ticket.category,
      ticket.priority,
      ticket.status,
      ticket.channel,
      ticket.customerName,
      ticket.customerPhone,
      ticket.referenceNumber,
      ticket.description,
      ticket.assigneeId,
      ticket.assigneeName,
      ticket.createdById,
      ticket.createdByName,
      ticket.updatedById,
      ticket.updatedByName,
      ticket.escalatedAt,
      ticket.closedAt,
      ticket.lastNoteAt,
    ],
  );
}

export function updateHelpDeskTicket(client, ticket) {
  return client.query(
    `UPDATE help_desk_tickets
     SET subject = $3,
         category = $4,
         priority = $5,
         status = $6,
         channel = $7,
         customer_name = $8,
         customer_phone = $9,
         reference_number = $10,
         description = $11,
         assignee_id = $12,
         assignee_name = $13,
         updated_by = $14,
         updated_by_name = $15,
         escalated_at = $16,
         closed_at = $17,
         last_note_at = $18,
         updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2
     RETURNING *`,
    [
      ticket.id,
      ticket.tenantId,
      ticket.subject,
      ticket.category,
      ticket.priority,
      ticket.status,
      ticket.channel,
      ticket.customerName,
      ticket.customerPhone,
      ticket.referenceNumber,
      ticket.description,
      ticket.assigneeId,
      ticket.assigneeName,
      ticket.updatedById,
      ticket.updatedByName,
      ticket.escalatedAt,
      ticket.closedAt,
      ticket.lastNoteAt,
    ],
  );
}

export function insertHelpDeskTicketNote(client, note) {
  return client.query(
    `INSERT INTO help_desk_ticket_notes (id, tenant_id, ticket_id, body, created_by, author_name)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [note.id, note.tenantId, note.ticketId, note.body, note.createdById, note.authorName],
  );
}

export function updateHelpDeskTicketState(client, ticketId, tenantId, updates) {
  return client.query(
    `UPDATE help_desk_tickets
     SET status = COALESCE($3, status),
         priority = COALESCE($4, priority),
         assignee_id = COALESCE($5, assignee_id),
         assignee_name = COALESCE($6, assignee_name),
         escalated_at = COALESCE($7, escalated_at),
         closed_at = COALESCE($8, closed_at),
         last_note_at = COALESCE($9, last_note_at),
         updated_by = $10,
         updated_by_name = $11,
         updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2
     RETURNING *`,
    [
      ticketId,
      tenantId,
      updates.status ?? null,
      updates.priority ?? null,
      updates.assigneeId ?? null,
      updates.assigneeName ?? null,
      updates.escalatedAt ?? null,
      updates.closedAt ?? null,
      updates.lastNoteAt ?? null,
      updates.updatedById ?? null,
      updates.updatedByName ?? null,
    ],
  );
}

export async function countHelpDeskTicketNumberCounter(client, tenantId, year) {
  const result = await client.query(
    `INSERT INTO help_desk_ticket_counters (tenant_id, year, last_value)
     VALUES ($1, $2, 1)
     ON CONFLICT (tenant_id, year)
     DO UPDATE SET last_value = help_desk_ticket_counters.last_value + 1
     RETURNING last_value`,
    [tenantId, year],
  );
  return Number(result.rows[0].last_value || 0);
}
