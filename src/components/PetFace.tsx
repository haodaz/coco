import type { Pet } from "@/lib/types";

// The pet's own face in a round frame: the head of its character (idle, first frame) or, before it has one,
// its first photo. With `pop`, the ears and top of the head break out over the frame's top edge.
// the pet's character, first idle frame (or null before it has one)
export const petArt = (pet: Pet) => {
  const f = pet.character?.moods.idle?.[0];
  return f ? (f.startsWith("/") ? f : `/api/art/${f}?v=${encodeURIComponent(pet.character?.at ?? "")}`) : null;
};

export default function PetFace({ pet, className = "", ring = "", pop = false }: { pet: Pet; className?: string; ring?: string; pop?: boolean }) {
  const face = pet.character?.moods.idle?.[0];
  const src = face ? (face.startsWith("/") ? face : `/api/art/${face}?v=${encodeURIComponent(pet.character?.at ?? "")}`) : `/api/photos/${pet.avatarPhotoId}`;
  // the character is a full sitting body; this framing shows the head and shoulders
  const head = { width: "234%", bottom: "-148%" } as const;
  return (
    <span className={`relative block ${className}`}>
      <span className={`absolute inset-0 overflow-hidden rounded-full bg-[radial-gradient(circle_at_50%_30%,#fff,#ebe5fb)] ${ring}`}>
        {face ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" draggable={false} className="absolute left-1/2 max-w-none -translate-x-1/2" style={head} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" draggable={false} className="h-full w-full object-cover" />
        )}
      </span>
      {face && pop && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" draggable={false} className="pointer-events-none absolute left-1/2 max-w-none -translate-x-1/2" style={{ ...head, clipPath: "inset(0 0 62% 0)" }} />
      )}
    </span>
  );
}
