import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginAction } from "@/app/auth/actions";
import AuthForm from "@/app/auth/AuthForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/app");

  return <AuthForm mode="login" action={loginAction} />;
}
