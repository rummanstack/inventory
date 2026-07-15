import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, '..');

// Must match `build.outDir` in vite.config.js. Vite writes the production
// build directly here, not into frontend/dist -- keep every build script
// importing this single constant so the two can never drift apart again.
export const distRoot = path.resolve(frontendRoot, '../backend/public/dist');
