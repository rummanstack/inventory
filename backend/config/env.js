const PORT = Number(process.env.PORT || 3001);
const NODE_ENV = process.env.NODE_ENV || 'development';
const SESSION_DAYS = Number(process.env.SESSION_DAYS || 7);
const AI_DAILY_LIMIT = Number(process.env.AI_DAILY_LIMIT || 100);
const AI_MIN_SECONDS_BETWEEN_REQUESTS = Number(process.env.AI_MIN_SECONDS_BETWEEN_REQUESTS || 5);

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
  AI_DAILY_LIMIT: Number.isFinite(AI_DAILY_LIMIT) && AI_DAILY_LIMIT > 0 ? AI_DAILY_LIMIT : 100,
  AI_MIN_SECONDS_BETWEEN_REQUESTS: Number.isFinite(AI_MIN_SECONDS_BETWEEN_REQUESTS) && AI_MIN_SECONDS_BETWEEN_REQUESTS >= 0 ? AI_MIN_SECONDS_BETWEEN_REQUESTS : 5,
  AI_PROVIDER: process.env.AI_PROVIDER || 'gemini',
  DATABASE_URL,
  DATABASE_LABEL,
  DEFAULT_SYSTEM_DEVELOPER_EMAIL: process.env.DEFAULT_SYSTEM_DEVELOPER_EMAIL || 'developer@arinda.local',
  DEFAULT_SYSTEM_DEVELOPER_NAME: process.env.DEFAULT_SYSTEM_DEVELOPER_NAME || 'System Developer',
  DEFAULT_SYSTEM_DEVELOPER_PASSWORD: process.env.DEFAULT_SYSTEM_DEVELOPER_PASSWORD || 'Developer@12345',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
  NODE_ENV,
  PORT,
  SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME || 'arinda_session',
  SESSION_DAYS,
};
