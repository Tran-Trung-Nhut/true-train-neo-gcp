import { redirect } from "next/navigation";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { getSessionUser } from "@/lib/firebase/session";
import AppRoot from "@/components/AppRoot";

// Real authorisation gate. The Edge middleware only checked that a cookie
// exists; this verifies its signature and revocation state with the Admin SDK
// before any application shell is rendered.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function Page() {
  if (!isFirebaseConfigured()) {
    redirect("/login");
  }

  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  return <AppRoot email={user.email} displayName={user.displayName} />;
}
