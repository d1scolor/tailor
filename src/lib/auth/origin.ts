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
    const allowedOrigins = new Set([
      process.env.BASE_URL ? new URL(process.env.BASE_URL).origin : request.nextUrl.origin
    ]);
    return !allowedOrigins.has(new URL(origin).origin);
  } catch {
    return true;
  }
}
