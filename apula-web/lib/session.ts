export const SESSION_COOKIE_NAME = "apula_session";
export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

export type SessionPayload = {
  uid: string;
  role: string;
  expiresAt: number;
};

export const createSessionPayload = (uid: string, role: string): SessionPayload => ({
  uid,
  role,
  expiresAt: Date.now() + SESSION_DURATION_MS,
});

export const isSessionValid = (session: Partial<SessionPayload> | null | undefined): session is SessionPayload => {
  if (!session) return false;
  if (typeof session.uid !== "string" || !session.uid.trim()) return false;
  if (typeof session.role !== "string" || !session.role.trim()) return false;
  if (typeof session.expiresAt !== "number") return false;
  return session.expiresAt > Date.now();
};

const getSecureFlag = () => {
  if (typeof window === "undefined") return "";
  return window.location.protocol === "https:" ? "; Secure" : "";
};

export const setSessionCookie = (session: SessionPayload) => {
  const value = encodeURIComponent(JSON.stringify(session));
  const expires = new Date(session.expiresAt).toUTCString();

  document.cookie = `${SESSION_COOKIE_NAME}=${value}; Path=/; Expires=${expires}; SameSite=Lax${getSecureFlag()}`;
};

export const clearSessionCookie = () => {
  document.cookie = `${SESSION_COOKIE_NAME}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${getSecureFlag()}`;
};

export const getSessionFromDocumentCookie = (): SessionPayload | null => {
  if (typeof document === "undefined") return null;

  const cookies = document.cookie.split(";");
  const target = cookies.find((cookie) => cookie.trim().startsWith(`${SESSION_COOKIE_NAME}=`));
  if (!target) return null;

  const rawValue = target.split("=").slice(1).join("=");
  if (!rawValue) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(rawValue));
    return isSessionValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
};
