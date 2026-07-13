// Dealer smoke tests run against an already-initialized database.
// Avoid replaying the full schema bootstrap on remote/pooler DB URLs.
process.env.SKIP_DATABASE_INIT = '1';
process.env.DISABLE_RATE_LIMITS = '1';
