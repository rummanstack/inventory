export function mapDocument(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    documentType: row.document_type,
    url: row.url,
    uploadedById: row.uploaded_by,
    createdAt: row.created_at,
  };
}

export async function insertDocument(client, document) {
  const result = await client.query(
    `INSERT INTO documents (id, tenant_id, entity_type, entity_id, document_type, url, uploaded_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [document.id, document.tenantId, document.entityType, document.entityId, document.documentType, document.url, document.uploadedById],
  );
  return mapDocument(result.rows[0]);
}

export async function listDocumentsForEntity(client, tenantId, entityType, entityId) {
  const result = await client.query(
    `SELECT * FROM documents
     WHERE tenant_id = $1 AND entity_type = $2 AND entity_id = $3 AND deleted_at IS NULL
     ORDER BY created_at DESC`,
    [tenantId, entityType, entityId],
  );
  return result.rows.map(mapDocument);
}

export async function findDocumentById(client, documentId, tenantId) {
  return client.query(
    `SELECT * FROM documents WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL LIMIT 1`,
    [documentId, tenantId],
  );
}

export async function softDeleteDocument(client, documentId, tenantId) {
  const result = await client.query(
    `UPDATE documents SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL RETURNING *`,
    [documentId, tenantId],
  );
  return result.rowCount > 0 ? mapDocument(result.rows[0]) : null;
}
