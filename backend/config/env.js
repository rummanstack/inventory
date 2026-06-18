const PORT = Number(process.env.PORT || 3001);
const NODE_ENV = process.env.NODE_ENV || 'development';
const SESSION_DAYS = Number(process.env.SESSION_DAYS || 7);

const isDevRun = process.env.npm_lifecycle_event === 'dev' || process.env.npm_lifecycle_event === 'test';
const DATABASE_URL = (isDevRun && process.env.DEV_DATABASE_URL) || process.env.DATABASE_URL;
const DATABASE_LABEL = isDevRun && process.env.DEV_DATABASE_URL ? 'dev' : 'live';

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is required. Add it to your .env file.');
}

if (!Number.isFinite(SESSION_DAYS) || SESSION_DAYS <= 0) {
  throw new Error('SESSION_DAYS must be a positive number.');
}

export const env = {
  DATABASE_URL,
  DATABASE_LABEL,
  DEFAULT_SUPER_ADMIN_EMAIL: process.env.DEFAULT_SUPER_ADMIN_EMAIL || 'admin@arinda.local',
  DEFAULT_SUPER_ADMIN_NAME: process.env.DEFAULT_SUPER_ADMIN_NAME || 'Super Admin',
  DEFAULT_SUPER_ADMIN_PASSWORD: process.env.DEFAULT_SUPER_ADMIN_PASSWORD || 'Admin@12345',
  DEFAULT_SYSTEM_DEVELOPER_EMAIL: process.env.DEFAULT_SYSTEM_DEVELOPER_EMAIL || 'developer@arinda.local',
  DEFAULT_SYSTEM_DEVELOPER_NAME: process.env.DEFAULT_SYSTEM_DEVELOPER_NAME || 'System Developer',
  DEFAULT_SYSTEM_DEVELOPER_PASSWORD: process.env.DEFAULT_SYSTEM_DEVELOPER_PASSWORD || 'Developer@12345',
  DEFAULT_TENANT_NAME: process.env.DEFAULT_TENANT_NAME || 'Arinda Enterprise',
  DEFAULT_TENANT_SLUG: process.env.DEFAULT_TENANT_SLUG || 'arinda',
  NODE_ENV,
  PORT,
  SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME || 'arinda_session',
  SESSION_DAYS,
};
