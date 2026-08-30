const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function isLocalHost(host?: string | null): boolean {
  if (!host) return false;
  const hostname = host.replace(/^\[/, "").replace(/\]$/, "").split(":")[0];
  return LOCAL_HOSTS.has(hostname);
}

export function getDevAuthEmail(): string {
  if (process.env.NODE_ENV === "production") return "";
  return process.env.DEV_AUTH_EMAIL?.trim().toLocaleLowerCase("en-US") ?? "";
}

export function isDevAuthEmailRequired(host?: string | null): boolean {
  return process.env.NODE_ENV !== "production" && isLocalHost(host) && !!getDevAuthEmail();
}

export function isAllowedDevEmail(email?: string | null): boolean {
  const devEmail = getDevAuthEmail();
  if (!devEmail) return true;
  return email?.trim().toLocaleLowerCase("en-US") === devEmail;
}
