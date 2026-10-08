import { supabase } from "@/integrations/supabase/client";

type OAuthProvider = "google" | "github" | "apple" | "azure";

export async function signInWithOAuth(provider: OAuthProvider, redirectTo: string) {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo },
  });
  return { error: error ?? undefined };
}
