export const sessionCookie = "tailor_session";
export const sessionMaxAgeSeconds = 60 * 60 * 24 * 30;

export function isSessionCookieValue(value?: string | null) {
  return Boolean(value && /^[0-9a-f]{64}$/i.test(value));
}
