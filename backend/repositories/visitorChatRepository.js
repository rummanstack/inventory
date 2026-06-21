export function mapVisitorChat(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    visitorName: row.visitor_name || "",
    visitorPhone: row.visitor_phone || "",
    status: row.status,
    lastMessageAt: row.last_message_at || null,
    unreadForAdmin: Boolean(row.unread_for_admin),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapVisitorChatMessage(row) {
  return {
    id: row.id,
    visitorChatId: row.visitor_chat_id,
    senderRole: row.sender_role,
    senderUserId: row.sender_user_id || null,
    body: row.body,
    createdAt: row.created_at,
  };
}

export function findVisitorChatByToken(client, visitorToken) {
  return client.query("SELECT * FROM visitor_chats WHERE visitor_token = $1", [visitorToken]);
}

export function findVisitorChatById(client, chatId) {
  return client.query("SELECT * FROM visitor_chats WHERE id = $1", [chatId]);
}

export function findVisitorChatForUpdateByToken(client, visitorToken) {
  return client.query("SELECT * FROM visitor_chats WHERE visitor_token = $1 FOR UPDATE", [visitorToken]);
}

export function findVisitorChatForUpdateById(client, chatId) {
  return client.query("SELECT * FROM visitor_chats WHERE id = $1 FOR UPDATE", [chatId]);
}

export async function insertVisitorChatIfMissing(client, chat) {
  await client.query(
    `INSERT INTO visitor_chats (id, visitor_token, status, last_message_at, unread_for_admin)
     VALUES ($1, $2, 'OPEN', NULL, TRUE)
     ON CONFLICT (visitor_token) DO NOTHING`,
    [chat.id, chat.visitorToken],
  );
  const result = await findVisitorChatForUpdateByToken(client, chat.visitorToken);
  return result.rows[0];
}

export function updateVisitorChatState(client, chatId, updates) {
  return client.query(
    `UPDATE visitor_chats
     SET status = COALESCE($2, status),
         last_message_at = COALESCE($3, last_message_at),
         unread_for_admin = COALESCE($4, unread_for_admin),
         visitor_name = COALESCE($5, visitor_name),
         visitor_phone = COALESCE($6, visitor_phone),
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      chatId,
      updates.status ?? null,
      updates.lastMessageAt ?? null,
      updates.unreadForAdmin ?? null,
      updates.visitorName ?? null,
      updates.visitorPhone ?? null,
    ],
  );
}

export function insertVisitorChatMessage(client, message) {
  return client.query(
    `INSERT INTO visitor_chat_messages (visitor_chat_id, sender_role, sender_user_id, body)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [message.visitorChatId, message.senderRole, message.senderUserId || null, message.body],
  );
}

export async function listVisitorChatMessagesAfter(client, chatId, afterId = 0, limit = 200) {
  const result = await client.query(
    `SELECT * FROM visitor_chat_messages
     WHERE visitor_chat_id = $1 AND id > $2
     ORDER BY id ASC
     LIMIT $3`,
    [chatId, afterId, limit],
  );
  return result.rows.map(mapVisitorChatMessage);
}

export async function listVisitorChats(client, { status } = {}) {
  const params = [];
  const conditions = [];

  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const result = await client.query(
    `SELECT * FROM visitor_chats ${where} ORDER BY updated_at DESC LIMIT 200`,
    params,
  );
  return result.rows.map(mapVisitorChat);
}

export async function countUnreadVisitorChats(client) {
  const result = await client.query("SELECT COUNT(*)::INTEGER AS count FROM visitor_chats WHERE unread_for_admin = TRUE");
  return result.rows[0].count;
}
