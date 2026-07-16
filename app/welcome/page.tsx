import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/profile";
import WelcomeForm from "./WelcomeForm";

export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Already set up (or the table isn't there yet) — nothing to onboard.
  const profile = await getUserProfile(supabase);
  if (!profile.needsOnboarding) redirect("/app");

  return <WelcomeForm />;
}
