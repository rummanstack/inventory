function maskDatabaseUrl(connectionString) {
  try {
    const url = new URL(connectionString);
    return `${url.host}${url.pathname}`;
  } catch {
    return "unknown";
  }
}

export class SystemService {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
  }

  async getHealth(env) {
    const pool = this.databaseManager.getPool();
    const client = await pool.connect();

    let counts;
    try {
      const [tenants, users, activeSessions] = await Promise.all([
        client.query(`SELECT COUNT(*)::INTEGER AS count FROM tenants`),
        client.query(`SELECT COUNT(*)::INTEGER AS count FROM users`),
        client.query(`SELECT COUNT(*)::INTEGER AS count FROM user_sessions WHERE expires_at > NOW()`),
      ]);

      counts = {
        tenants: tenants.rows[0].count,
        users: users.rows[0].count,
        activeSessions: activeSessions.rows[0].count,
      };
    } finally {
      client.release();
    }

    return {
      database: {
        label: env.DATABASE_LABEL,
        host: maskDatabaseUrl(this.databaseManager.getActiveDatabaseUrl()),
        usingFallback: this.databaseManager.isUsingFallbackDatabase(),
      },
      pool: {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
      },
      server: {
        uptimeSeconds: Math.floor(process.uptime()),
        nodeVersion: process.version,
        nodeEnv: env.NODE_ENV,
      },
      counts,
    };
  }
}
