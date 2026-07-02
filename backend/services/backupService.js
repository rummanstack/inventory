import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";
import { randomUUID } from "node:crypto";

function formatTimestamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-").replace("T", "_").replace("Z", "");
}

function quoteIdentifier(identifier) {
  return `"${String(identifier).replace(/"/g, '""')}"`;
}

function formatSqlValue(value) {
  if (value === null || value === undefined) {
    return "NULL";
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "NULL";
  }

  if (typeof value === "boolean") {
    return value ? "TRUE" : "FALSE";
  }

  if (value instanceof Date) {
    return `'${value.toISOString()}'`;
  }

  if (typeof value === "object") {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  }

  return `'${String(value).replace(/'/g, "''")}'`;
}

// Tables that are pure auth/session secrets - never useful in a data backup, never safe to export.
const EXCLUDED_TABLES = new Set(["user_sessions", "password_reset_tokens"]);

// Sensitive columns that must never leave the database via a backup, even on otherwise-included tables.
const SENSITIVE_COLUMNS = {
  users: new Set(["password_hash"]),
};

export class BackupService {
  constructor(databaseManager, { auditService }) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
  }

  async createBackupFile(format = "sql", { tenantId = null } = {}) {
    if (format === "json") {
      const jsonFilename = `arinda-database-backup-${formatTimestamp()}.json`;
      const jsonTempPath = path.join(os.tmpdir(), `${randomUUID()}.json`);
      await this.createJsonBackup(jsonTempPath, tenantId);
      return { filename: jsonFilename, tempPath: jsonTempPath };
    }

    const sqlFilename = `arinda-database-backup-${formatTimestamp()}.sql`;
    const sqlTempPath = path.join(os.tmpdir(), `${randomUUID()}.sql`);
    await this.createSqlBackup(sqlTempPath, tenantId);
    return { filename: sqlFilename, tempPath: sqlTempPath };
  }

  async removeBackupFile(tempPath) {
    await fs.unlink(tempPath).catch(() => {});
  }

  // Resolves, per table, the safe column list and whether it can be scoped to one tenant.
  // A tenant-scoped export only includes tables that actually carry a tenant_id column -
  // anything else (platform-only config, or a table we can't attribute to one tenant) is skipped.
  async resolveExportableTables(pool, tenantId) {
    const { rows: tableRows } = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const tables = [];
    for (const { table_name: tableName } of tableRows) {
      if (EXCLUDED_TABLES.has(tableName)) {
        continue;
      }

      const { rows: columnRows } = await pool.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1
         ORDER BY ordinal_position`,
        [tableName],
      );

      const sensitive = SENSITIVE_COLUMNS[tableName] || new Set();
      const columns = columnRows.map((row) => row.column_name).filter((column) => !sensitive.has(column));
      const hasTenantId = columns.includes("tenant_id");

      if (tenantId && !hasTenantId) {
        continue;
      }

      tables.push({ tableName, columns, hasTenantId });
    }

    return tables;
  }

  buildTableQuery(tableName, columns, tenantId, hasTenantId) {
    const columnList = columns.map(quoteIdentifier).join(", ");
    const quotedTable = quoteIdentifier(tableName);

    if (tenantId && hasTenantId) {
      return { text: `SELECT ${columnList} FROM ${quotedTable} WHERE tenant_id = $1`, values: [tenantId] };
    }

    return { text: `SELECT ${columnList} FROM ${quotedTable}`, values: [] };
  }

  async createJsonBackup(tempPath, tenantId = null) {
    const pool = this.databaseManager.getPool();
    const exportTables = await this.resolveExportableTables(pool, tenantId);

    const tables = {};
    for (const { tableName, columns, hasTenantId } of exportTables) {
      const { rows } = await pool.query(this.buildTableQuery(tableName, columns, tenantId, hasTenantId));
      tables[tableName] = rows;
    }

    const payload = {
      format: "json",
      scope: tenantId ? "tenant" : "platform",
      tenantId,
      generatedAt: new Date().toISOString(),
      database: decodeURIComponent(new URL(this.databaseManager.getActiveDatabaseUrl()).pathname.replace(/^\//, "")),
      tables,
    };

    await fs.writeFile(tempPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  }

  async createSqlBackup(tempPath, tenantId = null) {
    const pool = this.databaseManager.getPool();
    const exportTables = await this.resolveExportableTables(pool, tenantId);

    const lines = [
      "-- Arinda database backup (SQL)",
      `-- Scope: ${tenantId ? `tenant ${tenantId}` : "full platform"}`,
      `-- Generated at ${new Date().toISOString()}`,
    ];

    if (!tenantId) {
      lines.push("SET session_replication_role = replica;");
    }
    lines.push("");

    for (const { tableName, columns, hasTenantId } of exportTables) {
      const quotedTable = quoteIdentifier(tableName);
      const columnList = columns.map(quoteIdentifier).join(", ");
      const { rows } = await pool.query(this.buildTableQuery(tableName, columns, tenantId, hasTenantId));

      lines.push(`-- Table: ${tableName}`);

      if (!tenantId) {
        lines.push(`DELETE FROM ${quotedTable};`);
      }

      for (const row of rows) {
        const values = columns.map((column) => formatSqlValue(row[column])).join(", ");
        lines.push(`INSERT INTO ${quotedTable} (${columnList}) VALUES (${values});`);
      }

      lines.push("");
    }

    if (!tenantId) {
      lines.push("SET session_replication_role = DEFAULT;");
    }

    await fs.writeFile(tempPath, `${lines.join("\n")}\n`, "utf8");
  }

  async recordDownload(client, user, { filename, format, tenantId, scope }) {
    if (!this.auditService) {
      return;
    }

    await this.auditService.record(client, {
      tenantId: tenantId || null,
      userId: user.id,
      actionType: "download",
      entityType: "database_backup",
      entityId: null,
      description: `${user.name} downloaded a ${scope} database backup`,
      metadata: { filename, format, scope, tenantId: tenantId || null },
    });
  }
}
