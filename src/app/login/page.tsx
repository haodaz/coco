"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Scene from "@/components/Scene";
import { browserClient } from "@/lib/supabase-browser";

// Sign in with a link sent by email (no password to remember), or with a password if the account has one.
function SignIn() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/app";
  const failed = params.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [withPassword, setWithPassword] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    if (withPassword) {
      const { error } = await browserClient().auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        setState("error");
        setMessage(error.message);
      } else location.assign(next.startsWith("/") && !next.startsWith("//") ? next : "/app");
      return;
    }
    const { error } = await browserClient().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) {
      setState("error");
      setMessage(error.message);
    } else setState("sent");
  }

  return (
    <main className="ws block min-h-screen">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-5 py-10 md:grid-cols-[minmax(0,420px)_1fr]">
      <div className="order-2 md:order-1">
      <Link href="/" className="serif text-[26px] font-bold tracking-tight">coco</Link>
      <div className="mt-10 text-[11px] font-bold uppercase tracking-[.2em] text-[var(--gold)]">Memory Prints</div>
      <h1 className="serif mt-2 text-[38px] font-bold leading-[1.08] tracking-tight">Every moment with your pet, kept.</h1>
      <p className="serif mt-2 text-[17px] italic text-[var(--ink2)]">Sign in to open today&apos;s pack.</p>
      {state === "sent" ? (
        <p className="mt-7 text-[15px] leading-relaxed text-[var(--ink2)]">
          We sent a sign-in link to <b className="text-[var(--ink)]">{email}</b>. Open it on this device. It works once and expires in an hour.
        </p>
      ) : (
        <form onSubmit={send}>
          <label className="mt-7 block text-[13px] text-[var(--ink2)]">
            Email
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
          {withPassword && (
            <label className="mt-3 block text-[13px] text-[var(--ink2)]">
              Password
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white px-3.5 py-3 text-[15px] outline-none focus:border-[var(--gold)]"
              />
            </label>
          )}
          <button disabled={state === "sending"} className="mt-4 w-full rounded-xl bg-[var(--ink)] px-5 py-3 text-[15px] font-semibold text-white disabled:opacity-60">
            {state === "sending" ? (withPassword ? "Signing in…" : "Sending…") : withPassword ? "Sign in" : "Email me a sign-in link"}
          </button>
          <button type="button" onClick={() => { setWithPassword(!withPassword); setState("idle"); setMessage(""); }} className="mt-3 w-full text-center text-[13px] font-medium text-[var(--gold)]">
            {withPassword ? "Email me a link instead" : "Use a password instead"}
          </button>
          {(state === "error" || failed) && <p className="mt-3 text-[13px] text-[#cf1322]">{message || "That link didn't work. Ask for a new one."}</p>}
          <p className="mt-6 text-[12px] leading-relaxed text-[var(--ink3)]">Your pet&apos;s photos and memories belong to your account and are never shown to other users; people&apos;s faces are blurred on your device before anything is uploaded. To keep the site safe, the coco team may review what is shared and take down anything that doesn&apos;t belong.</p>
        </form>
      )}
      </div>
      <div className="order-1 md:order-2">
        <Scene name="signin" className="mx-auto max-w-[620px]" />
        <p className="mt-2 text-center text-[13px] text-[var(--ink3)]">Dogs, cats, birds, turtles, rabbits: one AI for each pet, grown only from its real moments.</p>
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
