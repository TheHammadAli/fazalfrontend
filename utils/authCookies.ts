import { deleteCookie, getCookie, setCookie } from "cookies-next";

const COOKIE_PATH = "/";

export const ACCESS_TOKEN_MAX_AGE = 60 * 60 * 24 * 30;
export const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 30;
const REMEMBER_ME_COOKIE = "rememberMe";

const baseOptions = {
  path: COOKIE_PATH,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

// `persist=false` (Sign in's "Remember me" left unchecked) omits maxAge
// entirely, which makes it a session cookie — gone as soon as the browser
// closes — instead of the usual 30-day one.
export function setAccessTokenCookie(token: string, persist = true) {
  setCookie("token", token, {
    ...baseOptions,
    ...(persist ? { maxAge: ACCESS_TOKEN_MAX_AGE } : {}),
  });
}

export function setRefreshTokenCookie(token: string, persist = true) {
  setCookie("refreshToken", token, {
    ...baseOptions,
    ...(persist ? { maxAge: REFRESH_TOKEN_MAX_AGE } : {}),
  });
}

// Remembers the "Remember me" choice itself, with matching persistence, so a
// later silent token refresh (baseApi's 401 retry) knows whether to keep
// re-issuing session cookies or persistent ones — without this, a refresh
// happening later in the same browser session would silently upgrade a
// "don't remember me" login back to a 30-day persistent one.
export function setRememberMeCookie(remember: boolean) {
  setCookie(REMEMBER_ME_COOKIE, remember ? "true" : "false", {
    ...baseOptions,
    ...(remember ? { maxAge: ACCESS_TOKEN_MAX_AGE } : {}),
  });
}

// Defaults to true (persist) when absent — matches this app's behavior
// before "Remember me" existed, and covers flows that never set the cookie
// (Google OAuth callback, signup auto-login).
export function getRememberMe(): boolean {
  const value = getCookie(REMEMBER_ME_COOKIE);
  return value !== "false";
}

export function setAuthTokens(
  tokens: {
    accessToken: string;
    refreshToken?: string;
  },
  persist = true,
) {
  setAccessTokenCookie(tokens.accessToken, persist);
  // Always keep refresh cookie in sync when access is updated.
  if (tokens.refreshToken) {
    setRefreshTokenCookie(tokens.refreshToken, persist);
  }
  setRememberMeCookie(persist);
}

export function setUserIdCookie(userId: string) {
  setCookie("userId", userId, {
    ...baseOptions,
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });
}

export function setProfileCompletedCookie(completed: boolean) {
  setCookie("profileCompleted", completed ? "true" : "false", {
    ...baseOptions,
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });
}

export function clearAuthCookies() {
  const opts = { path: COOKIE_PATH };
  deleteCookie("token", opts);
  deleteCookie("refreshToken", opts);
  deleteCookie("userId", opts);
  deleteCookie("profileCompleted", opts);
  deleteCookie("isGuest", opts);
  deleteCookie("isAdmin", opts);
  deleteCookie(REMEMBER_ME_COOKIE, opts);
}

/** Reads accessToken + refreshToken from refresh/login response.
 * Prefer `data.accessToken` / `data.refreshToken` — not `data.user.refreshToken`
 * (user may still hold a rotated/stale refresh token).
 */
export function extractAuthTokens(data: unknown): {
  accessToken: string;
  refreshToken?: string;
} | null {
  if (!data || typeof data !== "object") return null;

  const root = data as Record<string, unknown>;
  const nested =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : null;

  const readString = (
    source: Record<string, unknown> | null,
    ...keys: string[]
  ) => {
    if (!source) return undefined;
    for (const key of keys) {
      const value = source[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
    return undefined;
  };

  const accessToken =
    readString(nested, "accessToken", "access_token") ||
    readString(root, "accessToken", "access_token");

  // Only from data / root — never from data.user
  const refreshToken =
    readString(nested, "refreshToken", "refresh_token") ||
    readString(root, "refreshToken", "refresh_token");

  if (!accessToken) return null;
  return refreshToken ? { accessToken, refreshToken } : { accessToken };
}
