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

export class BackupService {
  constructor(databaseManager, { auditService }) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
  }

  async createBackupFile(format = "sql") {
    if (format === "json") {
      const jsonFilename = `arinda-database-backup-${formatTimestamp()}.json`;
      const jsonTempPath = path.join(os.tmpdir(), `${randomUUID()}.json`);
      await this.createJsonBackup(jsonTempPath);
      return { filename: jsonFilename, tempPath: jsonTempPath };
    }

    const sqlFilename = `arinda-database-backup-${formatTimestamp()}.sql`;
    const sqlTempPath = path.join(os.tmpdir(), `${randomUUID()}.sql`);
    await this.createSqlBackup(sqlTempPath);
    return { filename: sqlFilename, tempPath: sqlTempPath };
  }

  async removeBackupFile(tempPath) {
    await fs.unlink(tempPath).catch(() => {});
  }

  async createJsonBackup(tempPath) {
    const pool = this.databaseManager.getPool();
    const { rows: tableRows } = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const tables = {};
    for (const tableRow of tableRows) {
      const tableName = tableRow.table_name;
      const { rows } = await pool.query(`SELECT * FROM ${quoteIdentifier(tableName)}`);
      tables[tableName] = rows;
    }

    const payload = {
      format: "json",
      generatedAt: new Date().toISOString(),
      database: decodeURIComponent(new URL(this.databaseManager.getActiveDatabaseUrl()).pathname.replace(/^\//, "")),
      tables,
    };

    await fs.writeFile(tempPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  }

  async createSqlBackup(tempPath) {
    const pool = this.databaseManager.getPool();
    const { rows: tableRows } = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const lines = [
      "-- Arinda database backup (SQL)",
      `-- Generated at ${new Date().toISOString()}`,
      "SET session_replication_role = replica;",
      "",
    ];

    for (const tableRow of tableRows) {
      const tableName = tableRow.table_name;
      const { rows, fields } = await pool.query(`SELECT * FROM ${quoteIdentifier(tableName)}`);
      const quotedTable = quoteIdentifier(tableName);

      lines.push(`-- Table: ${tableName}`);
      lines.push(`DELETE FROM ${quotedTable};`);

      if (rows.length > 0) {
        const columns = fields.map((field) => field.name);
        const columnList = columns.map(quoteIdentifier).join(", ");
        for (const row of rows) {
          const values = columns.map((column) => formatSqlValue(row[column])).join(", ");
          lines.push(`INSERT INTO ${quotedTable} (${columnList}) VALUES (${values});`);
        }
      }

      lines.push("");
    }

    lines.push("SET session_replication_role = DEFAULT;");

    await fs.writeFile(tempPath, `${lines.join("\n")}\n`, "utf8");
  }

  async recordDownload(client, user, filename, format) {
    if (!this.auditService) {
      return;
    }

    await this.auditService.record(client, {
      userId: user.id,
      actionType: "download",
      entityType: "database_backup",
      entityId: null,
      description: `${user.name} downloaded database backup`,
      metadata: { filename, format },
    });
  }
}
