"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import AskPanel from "@/components/AskPanel";
import Shell from "@/components/Shell";
import { call } from "@/lib/api";

// Talk with the pet. ?thread= reopens a conversation; ?q= starts one with a question handed over from elsewhere.
function Chat() {
  const params = useSearchParams();
  const router = useRouter();
  const thread = params.get("thread");
  return (
    <Shell>
      {({ pet, state, refresh, openCard }) => (
        <AskPanel
          key={thread ? "t" : "new"}
          pet={pet}
          state={state}
          threadId={thread}
          firstQuestion={params.get("q")}
          onThread={(id) => router.replace(`/app/chat?thread=${id}`)}
          openCard={openCard}
          onBringToLife={async () => {
            await call(`/api/pets/${pet.id}/character`, { method: "POST" });
            await refresh();
          }}
        />
      )}
    </Shell>
  );
}

export default function ChatPage() {
  return (
    <Suspense>
      <Chat />
    </Suspense>
  );
}
