import { getBaseUrlPolicy } from "./base-url";

type RequestLike = {
  method: string;
  headers: Headers;
  nextUrl: { origin: string };
};

export function isCrossOriginMutation(request: RequestLike) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return false;
  if (request.headers.get("sec-fetch-site") === "cross-site") return true;
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const policy = getBaseUrlPolicy(request.nextUrl.origin);
    if (!policy.ok) return true;
    return policy.origin !== new URL(origin).origin;
  } catch {
    return true;
  }
}
