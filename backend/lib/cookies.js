export function readCookie(req, name) {
  const header = req.headers.cookie || "";
  const cookies = header
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean);

  for (const cookie of cookies) {
    const separatorIndex = cookie.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const cookieName = decodeURIComponent(cookie.slice(0, separatorIndex));
    if (cookieName === name) {
      return decodeURIComponent(cookie.slice(separatorIndex + 1));
    }
  }

  return "";
}
