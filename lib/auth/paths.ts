// Open-redirect guard. Only same-origin relative paths are ever honoured for a
// post-sign-in redirect: no absolute URLs, no protocol-relative "//evil.com",
// no backslash tricks.
export function safeNextPath(value: unknown, fallback = "/"): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 512) {
    return fallback;
  }
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (/[\x00-\x1f]/.test(value)) return fallback;
  return value;
}
