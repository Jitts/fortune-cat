import { redirect } from "next/navigation";

// Account & privacy is now the second tab of /settings — this route just
// forwards old links/bookmarks there instead of 404ing.
export default function AccountPage() {
  redirect("/settings?tab=account");
}
