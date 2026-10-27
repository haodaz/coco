"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Scene from "@/components/Scene";
import { browserClient } from "@/lib/supabase-browser";
import { CocoLogo } from "@/components/Brand";
import { useT } from "@/lib/ui";

// Sign in or create an account with email and password; a sign-in link by email and a password reset as the other ways in.
type Mode = "signin" | "signup" | "link" | "forgot";

function SignIn() {
  const { t } = useT();
  const params = useSearchParams();
  const next = params.get("next") ?? "/app";
  const failed = params.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<Mode>("signin");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState("");
  const back = (path: string) => `${location.origin}/auth/callback?next=${encodeURIComponent(path)}`;
  const go = (m: Mode) => {
    setMode(m);
    setState("idle");
    setMessage("");
  };
  const fail = (m: string) => {
    setState("error");
    setMessage(m);
  };

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const auth = browserClient().auth;
    const addr = email.trim();
    if (mode === "signin") {
      const { error } = await auth.signInWithPassword({ email: addr, password });
      if (error) return fail(error.message === "Invalid login credentials" ? t("That email and password don't match. Try again, or reset your password.") : error.message);
      return location.assign(next.startsWith("/") && !next.startsWith("//") ? next : "/app");
    }
    if (mode === "signup") {
      if (password.length < 8) return fail(t("Use at least 8 characters for your password."));
      const { data, error } = await auth.signUp({ email: addr, password, options: { emailRedirectTo: back(next) } });
      if (error) return fail(error.message);
      // an email that already has an account comes back with no identities
      if (data.user && !data.user.identities?.length) return fail(t("This email already has an account. Sign in, or reset your password."));
      if (data.session) return location.assign("/app"); // when email confirmation is off
      setSent(t("We sent a confirmation link to {email}. Open it to finish creating your account.", { email: addr }));
      return setState("sent");
    }
    if (mode === "forgot") {
      const { error } = await auth.resetPasswordForEmail(addr, { redirectTo: back("/login/new-password") });
      if (error) return fail(error.message);
      setSent(t("If {email} has an account, a link to set a new password is on its way.", { email: addr }));
      return setState("sent");
    }
    const { error } = await auth.signInWithOtp({ email: addr, options: { emailRedirectTo: back(next) } });
    if (error) return fail(error.message);
    setSent(t("We sent a sign-in link to {email}. Open it on this device. It works once and expires in an hour.", { email: addr }));
    setState("sent");
  }

  const label = t({ signin: "Sign in", signup: "Create account", link: "Email me a sign-in link", forgot: "Send me a reset link" }[mode]);
  const busy = t({ signin: "Signing in…", signup: "Creating…", link: "Sending…", forgot: "Sending…" }[mode]);
  const tab = (m: Mode, text: string) => (
    <button type="button" onClick={() => go(m)} className={`flex-1 rounded-lg py-2 text-[14px] font-semibold ${mode === m ? "bg-white text-[var(--ink)] shadow-[0_1px_3px_rgba(35,32,27,.12)]" : "text-[var(--ink2)]"}`}>{text}</button>
  );

  return (
    <main className="ws block min-h-screen">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-6 px-5 py-8 pt-[max(32px,env(safe-area-inset-top))] md:gap-10 md:py-10 md:grid-cols-[minmax(0,420px)_1fr]">
      <div>
      <Link href="/"><CocoLogo size={24} /></Link>
      <div className="mt-6 text-[11px] font-bold uppercase tracking-[.2em] text-[var(--gold)] md:mt-10">cocoverse</div>
      <h1 className="serif mt-2 text-[38px] font-bold leading-[1.08] tracking-tight">{t("Step into your cocoverse.")}</h1>
      <p className="serif mt-2 text-[17px] italic text-[var(--ink2)]">{mode === "signup" ? t("Make an account, then start with one photo.") : t("Sign in to open today’s pack.")}</p>
      {state === "sent" ? (
        <div className="mt-7">
          <p className="text-[15px] leading-relaxed text-[var(--ink2)]">{sent}</p>
          <button onClick={() => go("signin")} className="mt-4 text-[13px] font-medium text-[var(--gold)]">{t("Back to sign in")}</button>
        </div>
      ) : (
        <form onSubmit={send}>
          {(mode === "signin" || mode === "signup") && (
            <div className="mt-7 flex gap-1 rounded-xl bg-[#ece9f6] p-1">
              {tab("signin", t("Sign in"))}
              {tab("signup", t("Create account"))}
            </div>
          )}
          {mode === "forgot" && <p className="mt-7 text-[14px] text-[var(--ink2)]">{t("Enter your email and we'll send a link to set a new password.")}</p>}
          <label className={`${mode === "link" ? "mt-7" : "mt-4"} block text-[13px] text-[var(--ink2)]`}>
            {t("Email")}
            <input
              type="email"
              required
              autoFocus
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white px-3.5 py-3 text-[15px] outline-none focus:border-[var(--gold)]"
            />
          </label>
          {(mode === "signin" || mode === "signup") && (
            <label className="mt-3 block text-[13px] text-[var(--ink2)]">
              <span className="flex items-center">
                {t("Password")}
                {mode === "signin" && <button type="button" onClick={() => go("forgot")} className="ml-auto text-[12.5px] font-medium text-[var(--gold)]">{t("Forgot password?")}</button>}
              </span>
              <input
                type="password"
                required
                minLength={mode === "signup" ? 8 : undefined}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? t("At least 8 characters") : ""}
                className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white px-3.5 py-3 text-[15px] outline-none focus:border-[var(--gold)]"
              />
            </label>
          )}
          <button disabled={state === "sending"} className="mt-4 w-full rounded-xl bg-[var(--ink)] px-5 py-3 text-[15px] font-semibold text-white disabled:opacity-60">
            {state === "sending" ? busy : label}
          </button>
          <button type="button" onClick={() => go(mode === "link" || mode === "forgot" ? "signin" : "link")} className="mt-3 w-full text-center text-[13px] font-medium text-[var(--gold)]">
            {mode === "link" || mode === "forgot" ? t("Use a password instead") : t("Email me a sign-in link instead")}
          </button>
          {(state === "error" || failed) && <p className="mt-3 text-[13px] text-[#cf1322]">{message || t("That link didn't work or has expired. Ask for a new one.")}</p>}
          <p className="mt-6 text-[12px] leading-relaxed text-[var(--ink3)]">{t("Your pet's photos and memories belong to your account and are never shown to other users; people's faces are blurred on your device before anything is uploaded. To keep the site safe, the coco team may review what is shared and take down anything that doesn't belong.")}</p>
        </form>
      )}
      </div>
      {/* phones: the form comes first, the little scene sits under it */}
      <div>
        <Scene name="signin" className="mx-auto max-w-[340px] md:max-w-[620px]" />
        <p className="mt-2 text-center text-[13px] text-[var(--ink3)]">{t("Dogs, cats, birds, turtles, rabbits: one AI for each pet, grown only from its real moments.")}</p>
      </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <SignIn />
    </Suspense>
  );
}
