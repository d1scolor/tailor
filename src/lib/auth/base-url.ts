import { isIP } from "node:net";

export type BaseUrlPolicy =
  | {
      ok: true;
      origin: string;
      secureCookies: boolean;
      privateHttp: boolean;
    }
  | {
      ok: false;
      reason: "missing" | "invalid" | "unsupported_protocol" | "public_http";
    };

let warnedAboutPrivateHttp = false;

export function getBaseUrlPolicy(fallbackOrigin?: string): BaseUrlPolicy {
  const configured = process.env.BASE_URL?.trim();
  if (!configured) {
    if (process.env.NODE_ENV === "production" || !fallbackOrigin) {
      return { ok: false, reason: "missing" };
    }
    return parseBaseUrl(fallbackOrigin, false);
  }
  return parseBaseUrl(configured, true);
}

export function sessionCookiesAreSecure() {
  const policy = getBaseUrlPolicy();
  if (!policy.ok) return process.env.NODE_ENV === "production";
  if (policy.privateHttp && !warnedAboutPrivateHttp) {
    warnedAboutPrivateHttp = true;
    console.warn(
      `Tailor is using HTTP at ${policy.origin}. Credentials and session cookies are not encrypted unless the network or VPN provides encryption.`
    );
  }
  return policy.secureCookies;
}

export function isPrivateNetworkHostname(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (normalized === "localhost") return true;

  const version = isIP(normalized);
  if (version === 4) {
    const [first, second] = normalized.split(".").map(Number);
    return (
      first === 10 ||
      first === 127 ||
      (first === 100 && second >= 64 && second <= 127) ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168)
    );
  }
  if (version === 6) {
    if (normalized === "::1") return true;
    const firstGroup = Number.parseInt(normalized.split(":")[0] ?? "", 16);
    return (
      (firstGroup & 0xfe00) === 0xfc00 ||
      (firstGroup & 0xffc0) === 0xfe80
    );
  }
  return false;
}

function parseBaseUrl(value: string, enforcePrivateHttp: boolean): BaseUrlPolicy {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, reason: "invalid" };
  }
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    return { ok: false, reason: "invalid" };
  }
  if (url.protocol === "https:") {
    return { ok: true, origin: url.origin, secureCookies: true, privateHttp: false };
  }
  if (url.protocol !== "http:") {
    return { ok: false, reason: "unsupported_protocol" };
  }
  if (enforcePrivateHttp && !isPrivateNetworkHostname(url.hostname)) {
    return { ok: false, reason: "public_http" };
  }
  return { ok: true, origin: url.origin, secureCookies: false, privateHttp: true };
}
