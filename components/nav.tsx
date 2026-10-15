import { getCurrentUser } from "@/lib/auth/user";
import { NavShell } from "./nav-shell";
export async function Nav() {
  const user = await getCurrentUser();
  return <NavShell displayName={user?.profile.display_name ?? null} />;
}
