"use client";

// Calls our API and, when it says no (a daily limit, signed out, a failed model call), tells the person why.
export async function call<T = Record<string, unknown>>(url: string, init?: RequestInit): Promise<T | null> {
  const r = await fetch(url, init);
  if (r.status === 401) {
    location.assign(`/login?next=${encodeURIComponent(location.pathname)}`);
    return null;
  }
  const body = await r.json().catch(() => ({}));
  if (!r.ok) {
    alert(body.error ?? "Something went wrong. Please try again.");
    return null;
  }
  return body as T;
}
