import { AsyncLocalStorage } from "node:async_hooks";
import { NextResponse } from "next/server";
import { signedInUser } from "./supabase";

// Every API request runs inside the signed-in user's scope: the state, the photos and paintings,
// and the usage log all read the user from here, so no code path can touch another user's data.

const scope = new AsyncLocalStorage<{ userId: string }>();

export function currentUserId() {
  const s = scope.getStore();
  if (!s) throw new Error("no user in scope");
  return s.userId;
}

type Handler<C> = (req: Request, ctx: C) => Promise<Response>;

export function withUser<C>(handler: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    const user = await signedInUser();
    if (!user) return NextResponse.json({ error: "sign in first" }, { status: 401 });
    return scope.run({ userId: user.id }, () => handler(req, ctx));
  };
}

// For scripts and background work that already know the user.
export const runAs = <T>(userId: string, fn: () => Promise<T>) => scope.run({ userId }, fn);
