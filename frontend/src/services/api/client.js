const ACTIVE_TENANT_STORAGE_KEY = "activeTenantId";

export function getActiveTenantId() {
  return localStorage.getItem(ACTIVE_TENANT_STORAGE_KEY) || "";
}

export function setActiveTenantId(tenantId) {
  if (tenantId) {
    localStorage.setItem(ACTIVE_TENANT_STORAGE_KEY, tenantId);
  } else {
    localStorage.removeItem(ACTIVE_TENANT_STORAGE_KEY);
  }
}

export function buildQueryString(params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export async function apiRequest(path, options = {}) {
  const activeTenantId = getActiveTenantId();
  const response = await fetch(`/api${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(activeTenantId ? { "X-Active-Tenant-Id": activeTenantId } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(data?.message || "Request failed.");
    error.status = response.status;
    throw error;
  }
  return data;
}

export async function downloadRequest(path, options = {}) {
  const activeTenantId = getActiveTenantId();
  const response = await fetch(`/api${path}`, {
    credentials: "include",
    headers: {
      ...(activeTenantId ? { "X-Active-Tenant-Id": activeTenantId } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const error = new Error(data?.message || "Request failed.");
    error.status = response.status;
    throw error;
  }

  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") || "";
  const match = disposition.match(/filename="?([^";]+)"?/i);

  return {
    blob,
    filename: match?.[1] || "arinda-database-backup.sql",
  };
}
