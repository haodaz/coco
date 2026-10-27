"use client";

import { createBrowserClient } from "@supabase/ssr";

// The browser's Supabase client, only for signing in and out; all data goes through our own API.
export const browserClient = () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
