export function mapContactMessage(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
  };
}

export function insertContactMessage(client, contactMessage) {
  return client.query(
    `INSERT INTO contact_messages (id, name, phone, message)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [contactMessage.id, contactMessage.name, contactMessage.phone, contactMessage.message],
  );
}

export function listContactMessages(client) {
  return client.query(
    `SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT 200`,
  );
}
