"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { browserClient } from "@/lib/supabase-browser";
import { CocoLogo } from "@/components/Brand";
import { useT } from "@/lib/ui";

// The reset link lands here (through /auth/callback, which signs the owner in): choose a new password.
export default function NewPassword() {
  const { t } = useT();
  const [ready, setReady] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");
  const [message, setMessage] = useState("");
  useEffect(() => {
    browserClient().auth.getUser().then(({ data }) => setReady(!!data.user));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setState("error");
      return setMessage(t("Use at least 8 characters."));
    }
    setState("saving");
    const { error } = await browserClient().auth.updateUser({ password });
    if (error) {
      setState("error");
      return setMessage(error.message);
    }
    location.assign("/app");
  }

  return (
    <main className="ws block min-h-screen">
      <div className="mx-auto max-w-[420px] px-5 py-16">
        <Link href="/"><CocoLogo size={24} /></Link>
        <h1 className="serif mt-10 text-[34px] font-bold leading-[1.1] tracking-tight">{t("Choose a new password")}</h1>
        {ready === false ? (
          <p className="mt-5 text-[15px] text-[var(--ink2)]">
            {t("This link has expired or was already used.")} <Link href="/login" className="font-semibold text-[var(--gold)]">{t("Ask for a new one")}</Link>{t(".")}
          </p>
        ) : (
          <form onSubmit={save}>
            <label className="mt-7 block text-[13px] text-[var(--ink2)]">
              {t("New password")}
              <input type="password" required autoFocus minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("At least 8 characters")} className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white px-3.5 py-3 text-[15px] outline-none focus:border-[var(--gold)]" />
            </label>
            <button disabled={state === "saving" || ready === null} className="mt-4 w-full rounded-xl bg-[var(--ink)] px-5 py-3 text-[15px] font-semibold text-white disabled:opacity-60">{state === "saving" ? t("Saving…") : t("Save and go in")}</button>
            {state === "error" && <p className="mt-3 text-[13px] text-[#cf1322]">{message}</p>}
          </form>
        )}
      </div>
    </main>
  );
}
