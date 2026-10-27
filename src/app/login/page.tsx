"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { browserClient } from "@/lib/supabase-browser";

// Sign in with a link sent by email: no password to remember.
function SignIn() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/app";
  const failed = params.get("error");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
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
    <main className="mx-auto max-w-sm px-5 pt-20">
      <Link href="/" className="text-[17px] font-bold tracking-tight">coco</Link>
      <h1 className="mt-8 text-[28px] font-bold leading-tight tracking-tight">Sign in to meet your pet</h1>
      {state === "sent" ? (
        <p className="mt-4 text-[15px] leading-relaxed text-[#3d4460]">
          We sent a sign-in link to <b className="text-[var(--ink)]">{email}</b>. Open it on this device. It works once and expires in an hour.
        </p>
      ) : (
        <form onSubmit={send} className="mt-6">
          <label className="text-[13px] text-[var(--sub)]">
            Email
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white px-3.5 py-3 text-[15px] outline-none focus:border-[var(--primary)]"
            />
          </label>
          <button disabled={state === "sending"} className="mt-4 w-full rounded-xl bg-[var(--primary)] px-5 py-3 text-[15px] font-semibold text-white disabled:opacity-60">
            {state === "sending" ? "Sending…" : "Email me a sign-in link"}
          </button>
          {(state === "error" || failed) && <p className="mt-3 text-[13px] text-[#cf1322]">{message || "That link didn't work. Ask for a new one."}</p>}
          <p className="mt-5 text-[12.5px] leading-relaxed text-[var(--sub)]">No password. Your pet&apos;s photos and memories are private to your account; people&apos;s faces are blurred on your device before anything is uploaded.</p>
        </form>
      )}
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
