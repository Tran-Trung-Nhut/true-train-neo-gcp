import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/firebase/session.edge";

// Presence check only: firebase-admin cannot run on the Edge runtime, so real
// verification happens in app/page.tsx and every API route. A forged cookie
// passes here and is rejected there.
//
// /api/health stays public because Cloud Run probes send no cookies.
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
