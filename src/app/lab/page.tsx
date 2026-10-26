import HoloCard, { type Finish } from "@/components/HoloCard";

// Card finish lab: the same pet in every finish, so we can feel which ones are worth keeping.
// Move the pointer over a card; left alone, each card sways on its own.

const A = (k: string) => `/api/art/art_lab-${k}.jpg`;
const F = (k: string) => `/api/art/art_lab-${k}-fg.png?v=2`;

const CARDS: { art: string; finish: Finish; depth: boolean; name: string; line: string; stars: 1 | 2 | 3; note: string }[] = [
  { art: "storybook", finish: "matte", depth: false, name: "Apple Courier", line: "I carry it gently. Mostly.", stars: 1, note: "Matte · card stock, paper grain" },
  { art: "pixel", finish: "foil", depth: false, name: "Meadow Sprint", line: "Faster than the ball. Almost.", stars: 2, note: "Foil · glitter catches the light" },
  { art: "ukiyoe", finish: "holo", depth: true, name: "Plum Blossom Rest", line: "I watch the river for you.", stars: 2, note: "Holo · rainbow bands + depth" },
  { art: "sleep", finish: "cosmos", depth: true, name: "Cool Floor Nap", line: "I stay close while I rest.", stars: 2, note: "Cosmos · stars drift over the art" },
  { art: "tarot", finish: "gold", depth: true, name: "The Moon Keeper", line: "I keep watch at night.", stars: 3, note: "Gold · gilded frame, light sweep" },
  { art: "tcg", finish: "popout", depth: true, name: "Guardian of the Cliff", line: "Nothing passes without a sniff.", stars: 3, note: "Pop-out · she steps out of the frame" },
  { art: "vinyl", finish: "holo", depth: true, name: "Little Coco", line: "Collect me. Then pet me.", stars: 3, note: "Holo · blind-box figure" },
];

export default function Lab() {
  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-10">
      <div className="text-[12px] font-semibold uppercase tracking-[.16em] text-[var(--sub)]">Card lab</div>
      <h1 className="mt-1 text-[30px] font-bold tracking-tight">Finishes</h1>
      <p className="mt-2 max-w-xl text-[14.5px] text-[var(--sub)]">Same pet, different finishes. Move over a card to tilt it. Cards with depth keep the pet and the background on separate layers.</p>
      <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:grid-cols-4">
        {CARDS.map((c) => (
          <figure key={c.art + c.finish}>
            <HoloCard art={A(c.art)} fg={c.depth ? F(c.art) : null} finish={c.finish} name={c.name} line={c.line} stars={c.stars} label="Coco · No. 01" />
            <figcaption className="mt-4 text-center text-[12.5px] text-[var(--sub)]">{c.note}</figcaption>
          </figure>
        ))}
      </div>
    </main>
  );
}
