import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const sourceRoot = path.resolve('src');
const extensions = new Set(['.js', '.jsx']);
const ignoredDirectories = new Set(['locales']);
const allowedText = /^(?:StockLedger|SR|DSR|SKU|IMEI|PDF|CSV|Excel|Enter|esc|Ctrl(?:\+\S+)?|Alt\+\S+|[A-Z]{1,5}|[^\s]+@[^\s]+|01X+|product\.update|e\.g\..+|John Doe|[\d\s#%+./:|—–-]+)$/;
const findings = [];

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(target));
    else if (extensions.has(path.extname(entry.name))) files.push(target);
  }
  return files;
}

function lineNumber(source, index) { return source.slice(0, index).split('\n').length; }
function report(file, source, index, kind, value) {
  const text = value.replace(/\s+/g, ' ').trim();
  if (!text || allowedText.test(text)) return;
  findings.push(`${path.relative(process.cwd(), file)}:${lineNumber(source, index)} [${kind}] ${text}`);
}

function auditFile(file, source) {
  const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  if (path.extname(file) === '.jsx') {
    for (const match of withoutComments.matchAll(/<[A-Za-z][^>]*>([^<>{}\n]*[A-Za-z][^<>{}\n]*)<\//g)) report(file, withoutComments, match.index, 'JSX text', match[1]);
    for (const match of withoutComments.matchAll(/<[^>]*\b(placeholder|title|aria-label|alt)\s*=\s*(["'])([^"'{}]*[A-Za-z][^"'{}]*)\2[^>]*>/g)) report(file, withoutComments, match.index, match[1], match[3]);
  }
  for (const match of withoutComments.matchAll(/\b(?:alert|setError)\(\s*(["'])([A-Za-z][^"']+)\1\s*\)/g)) report(file, withoutComments, match.index, 'direct message', match[2]);
  for (const match of withoutComments.matchAll(/\bpushToast\(\s*["'](?:success|error|info)["']\s*,\s*(["'])([A-Za-z][^"']+)\1/g)) report(file, withoutComments, match.index, 'toast', match[2]);
}

const files = await collectFiles(sourceRoot);
for (const file of files) auditFile(file, await readFile(file, 'utf8'));
if (findings.length) {
  console.error(`Hardcoded user-facing copy found (${findings.length}):\n${findings.join('\n')}`);
  process.exitCode = 1;
} else console.log(`Hardcoded-copy audit passed (${files.length} source files checked).`);