import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// Supabase is used when its keys are set; without them the app keeps everything in local files (one local user),
// so a fresh clone still runs.

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const HOSTED = !!(URL && ANON && SERVICE);

let admin: SupabaseClient | null = null;
// Server only: full access, always used with the signed-in user's id as the scope.
export function adminClient() {
  if (!HOSTED) throw new Error("Supabase is not configured");
  admin ??= createClient(URL!, SERVICE!, { auth: { persistSession: false, autoRefreshToken: false } });
  return admin;
}

// The signed-in user's session, read from cookies.
export async function sessionClient() {
  const store = await cookies();
  return createServerClient(URL!, ANON!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // called from a place that can't set cookies; the proxy refreshes the session instead
        }
      },
    },
  });
}

export async function signedInUser(): Promise<{ id: string; email: string | null } | null> {
  if (!HOSTED) return { id: "local", email: null };
  const { data } = await (await sessionClient()).auth.getUser();
  return data.user ? { id: data.user.id, email: data.user.email ?? null } : null;
}
