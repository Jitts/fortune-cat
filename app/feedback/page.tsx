import { redirect } from "next/navigation";

// Feature requests is now the third tab of /settings — this route just
// forwards old links/bookmarks there instead of 404ing.
export default function FeedbackPage() {
  redirect("/settings?tab=feedback");
}
