// Central theme helper: read CSS variables and set theme at runtime
const cache = new Map();

function normalizeVarName(varName) {
  if (!varName) return varName;
  return varName.startsWith('--') ? varName : `--${varName}`;
}

export function getCssVar(varName, fallback = '') {
  const name = normalizeVarName(varName);
  if (cache.has(name)) return cache.get(name);
  try {
    if (typeof window !== 'undefined' && window.getComputedStyle && document && document.documentElement) {
      const val = getComputedStyle(document.documentElement).getPropertyValue(name);
      if (val) {
        const trimmed = val.trim();
        cache.set(name, trimmed);
        return trimmed;
      }
    }
  } catch (e) {
    // swallow – fall back to provided value
  }
  return fallback;
}

function setTheme(vars = {}) {
  if (typeof document === 'undefined' || !document.documentElement) return;
  Object.entries(vars).forEach(([key, value]) => {
    const name = normalizeVarName(key);
    document.documentElement.style.setProperty(name, value);
    cache.set(name, value);
  });
}

export function clearCssVarCache() {
  cache.clear();
}

