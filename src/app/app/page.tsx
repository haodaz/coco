"use client";

import AskPanel from "@/components/AskPanel";
import Shell from "@/components/Shell";
import { call } from "@/lib/api";

// Home is the pet itself: its character, and a conversation with it.
export default function Home() {
  return (
    <Shell>
      {({ pet, refresh }) => (
        <AskPanel
          pet={pet}
          onBringToLife={async () => {
            await call(`/api/pets/${pet.id}/character`, { method: "POST" });
            await refresh();
          }}
        />
      )}
    </Shell>
  );
}
