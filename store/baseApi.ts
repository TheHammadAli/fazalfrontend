import {
  fetchBaseQuery,
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
  createApi,
} from "@reduxjs/toolkit/query/react";
import { Mutex } from "async-mutex";
import { BASE_URL } from "@/assets/content/constants";
import { getRefreshToken, getToken } from "@/utils/getToken";
import { refreshAuthTokens } from "@/utils/refreshAuthTokens";
import { logout, setToken } from "./reducers/authReducer";
import { getCookie } from "cookies-next";
import { isGuestSession } from "@/utils/isGuestSession";
import { i18n } from "@/i18n.config";

/** Login/signup failures must not trigger refresh/logout redirects. */
const PUBLIC_AUTH_ENDPOINTS = new Set([
  "sendOtp",
  "verifyOtp",
  "verifyEmail",
  "signup",
  "signin",
  "forgotPassword",
  "resetPassword",
]);

const refreshMutex = new Mutex();
let isRedirectingToSignIn = false;

const resolveLanguage = () => {
  if (typeof window !== "undefined") {
    const firstSegment = window.location.pathname.split("/")[1];
    if (i18n.locales.includes(firstSegment as (typeof i18n.locales)[number])) {
      return firstSegment;
    }
  }
  return getCookie("lang")?.toString() || i18n.defaultLocale;
};

const rawBaseQuery = fetchBaseQuery({
  baseUrl: BASE_URL,
  prepareHeaders: (headers, { endpoint }) => {
    headers.set("accept-language", resolveLanguage());
    const excludeToken = [...PUBLIC_AUTH_ENDPOINTS, "getLocations"];
    const token = getToken();
    if (token && !excludeToken.includes(endpoint)) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

const redirectToSignIn = () => {
  if (typeof window === "undefined" || isRedirectingToSignIn) return;
  isRedirectingToSignIn = true;
  window.location.href = `/${resolveLanguage()}/signin`;
};

/**
 * Flow:
 * 1) API returns 401 Unauthorized
 * 2) Call /auth/refreshToken with { token: refreshToken from cookie }
 * 3) Save new accessToken → retry original request
 * 4) If refresh fails → logout + signin (once)
 */
export const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions: object) => {
  await refreshMutex.waitForUnlock();

  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status !== 401) return result;
  if (PUBLIC_AUTH_ENDPOINTS.has(api.endpoint)) return result;
  if (isGuestSession()) return result;

  if (!refreshMutex.isLocked()) {
    const release = await refreshMutex.acquire();
    try {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        api.dispatch(logout());
        redirectToSignIn();
        return result;
      }

      const tokens = await refreshAuthTokens(refreshToken);
      if (tokens?.accessToken && tokens.refreshToken) {
        api.dispatch(
          setToken({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
          }),
        );
        result = await rawBaseQuery(args, api, extraOptions);
      } else {
        // Refresh token itself is expired/invalid — nothing left to try.
        api.dispatch(logout());
        redirectToSignIn();
      }
    } finally {
      release();
    }
  } else {
    // Another request already refreshed — retry once with new token.
    await refreshMutex.waitForUnlock();
    if (getToken()) {
      result = await rawBaseQuery(args, api, extraOptions);
    }
  }

  return result;
};

export const baseApi = createApi({
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    "profile",
    "PRODUCT",
    "NOTIFICATIONS",
    "SHOP_DETAIL",
    "SERVICES",
    "SERVICES_REQUESTS",
    "Chat",
    "REVIEW",
    "BROADCAST",
    "ORDERS",
    "CATEGORIES",
    "SETTINGS",
    "FAVOURITES",
    "REPORTS",
    "BROADCAST_OFFER",
    "PRODUCT_OFFER",
    "FEED",
  ],
  endpoints: () => ({}),
});

export default baseApi;
