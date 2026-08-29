import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { i18n } from "@/i18n.config";
import {
  isGuestAllowedPathname,
  isGuestRestrictedPathname,
} from "@/utils/guestAccess";

/**
 * Next.js 16+: `proxy.ts` replaces deprecated `middleware.ts`.
 * Runs on Node.js (not Edge), so local @/ imports are safe on Vercel.
 */
export function proxy(request: NextRequest) {
  const {
    nextUrl: { search },
  } = request;
  const urlSearchParams = new URLSearchParams(search);
  const params = Object.fromEntries(urlSearchParams.entries());
  const token = request.cookies.get("token")?.value || "";
  // Access cookie can expire while refresh cookie is still valid — allow the
  // app to load so the client can call /auth/refreshToken.
  const refreshToken = request.cookies.get("refreshToken")?.value || "";
  const hasSession = Boolean(token) || Boolean(refreshToken);
  const isGuest = request.cookies.get("isGuest")?.value === "true";
  const completeProfile =
    request.cookies.get("profileCompleted")?.value === "true";
  const urlParams = "?" + new URLSearchParams(params);
  let pathname = request.nextUrl.pathname;
  const locale = request.cookies.get("lang")?.value || "en";
  const iconFile = pathname.match(
    /\/(favicon\.(?:ico|png)|icon\.(?:svg|png|ico))$/i,
  );
  if (iconFile) {
    const dest =
      iconFile[1].toLowerCase() === "favicon.ico"
        ? "/favicon.ico"
        : "/favicon.png";
    return NextResponse.rewrite(new URL(dest, request.url));
  }
  const pathnameIsMissingLocale = i18n.locales.every(
    (loc) => !pathname.startsWith(`/${loc}/`) && pathname !== `/${loc}`,
  );

  const publicRoutes: string[] = [`/${locale}/google/auth/success`];

  const authRoutes: string[] = [
    `/${locale}/send-otp`,
    `/${locale}/signin`,
    `/${locale}/signup`,
    `/${locale}/verify-otp`,
    `/${locale}/signup-instructor`,
    `/${locale}/forget-password`,
    `/${locale}/verify-email`,
    `/${locale}/reset-password`,
    `/${locale}/set-password`,
  ];
  const publicInfoRoutes: string[] = [
    `/${locale}/contact-us`,
    `/${locale}/terms-conditions`,
    `/${locale}/privacy-policy`,
    // Linked from the Play Store listing as the account deletion URL, so it has
    // to open for someone who is not signed in — including a store reviewer.
    `/${locale}/delete-account`,
  ];

  function checkPathStartsWith(path: string) {
    return authRoutes.some((p: string) => path.startsWith(p));
  }
  function isPublicInfoRoute(path: string) {
    return publicInfoRoutes.some((p: string) => path.startsWith(p));
  }

  if (pathnameIsMissingLocale) {
    pathname = `/${locale}${
      pathname.startsWith("/") ? "" : "/"
    }${pathname}${urlParams}`;
    return NextResponse.redirect(new URL(pathname, request.url));
  }
  if (
    publicRoutes.some((p: string) => {
      return pathname.startsWith(p);
    })
  ) {
    return NextResponse.next();
  }

  if (
    (hasSession || isGuest) &&
    (pathname === "/" || pathname === `/${locale}`)
  ) {
    return NextResponse.redirect(new URL(`/${locale}/home`, request.url));
  }

  if (isGuest && !hasSession && pathname.startsWith(`/${locale}/complete-info`)) {
    return NextResponse.redirect(new URL(`/${locale}/home`, request.url));
  }

  if (
    isGuest &&
    !hasSession &&
    isGuestRestrictedPathname(pathname) &&
    !isGuestAllowedPathname(pathname)
  ) {
    return NextResponse.redirect(new URL(`/${locale}/home`, request.url));
  }

  if (hasSession && checkPathStartsWith(pathname)) {
    return NextResponse.redirect(new URL(`/${locale}`, request.url));
  }

  // Only enforce complete-info when we already have an access token.
  // Refresh-only sessions restore the access token on the client first.
  if (token && !completeProfile) {
    if (pathname !== `/${locale}/complete-info`) {
      return NextResponse.redirect(
        new URL(`/${locale}/complete-info`, request.url),
      );
    }
  }
  if (token && completeProfile && pathname === `/${locale}/complete-info`) {
    return NextResponse.redirect(new URL(`/${locale}/home`, request.url));
  }

  if (
    !hasSession &&
    !isGuest &&
    !checkPathStartsWith(pathname) &&
    !isPublicInfoRoute(pathname)
  ) {
    return NextResponse.redirect(new URL(`/${locale}/signin`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|favicon.png|icon.svg|icon.png|firebase-messaging-sw.js|notifications/).*)",
  ],
};
