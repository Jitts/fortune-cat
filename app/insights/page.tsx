import { redirect } from "next/navigation";

// Analytics is now embedded in the Fortunes tab, below "This month's
// insights" — this route just forwards old links/bookmarks there.
export default function InsightsPage() {
  redirect("/app?tab=fortunes");
}
