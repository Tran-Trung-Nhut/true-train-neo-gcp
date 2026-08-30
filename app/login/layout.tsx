import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/firebase/session";

// Server-side companion to the client login page: a fully verified session
// should never see the sign-in form again. Only redirects when the session is
// genuinely valid, so a stale cookie cannot bounce the user in a loop.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (user) redirect("/");
  return <>{children}</>;
}
