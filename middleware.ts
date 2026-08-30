import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/firebase/session.edge";

// Cheap first-pass gate only.
//
// Middleware runs on the Edge runtime, where firebase-admin (and therefore
// real signature verification) cannot run. So this checks *presence* of the
// session cookie to avoid rendering the app shell for obvious anonymous
// traffic, and nothing more. Authorisation is enforced where it actually
// counts, on the Node runtime:
//   - app/page.tsx          verifySessionCookie(checkRevoked) before rendering
//   - every /api/* handler  requireSessionUser() before touching data
// A forged cookie gets past this check and is rejected there.

// /api/health must stay reachable without a session: Cloud Run startup and
// liveness probes send no cookies. It returns booleans only, never a secret.
const PUBLIC_PREFIXES = ["/login", "/auth", "/api/auth", "/api/health"];

function isPublicPath(path: string): boolean {
  return PUBLIC_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );
}

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (isPublicPath(path)) return NextResponse.next();

  if (!request.cookies.get(SESSION_COOKIE)?.value) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
