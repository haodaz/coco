import Link from "next/link";
import HoloCard from "@/components/HoloCard";
import MoodShow from "@/components/landing/MoodShow";
import { finishFor } from "@/lib/finish";
import manifest from "../../public/landing/manifest.json";

// The front door: what coco is, why, for whom, and how, before you meet the first pet that lives here.
// Every picture and every answer on this page comes from the real app and one real dog (see scripts/export-landing.mjs).

const PET = manifest.pet.name;

const STEPS = [
  { n: "1", title: "One photo", body: "Any photo of your pet. The AI says what animal it is, you correct it and give it its name." },
  { n: "2", title: "Starter pack", body: "Ten kinds of moment you already have in your album: asleep, eating, playing, with you, out on a walk, in the car… Skip what you don't have." },
  { n: "3", title: "Cards become Imprints", body: "Each photo turns into a collectible card and a memory the AI keeps. Say one sentence about the moment and it counts as your word." },
  { n: "4", title: "Clarity", body: "The AI's own picture of your pet sharpens as it learns, from a two-colour mosaic to a portrait you'd recognise." },
  { n: "5", title: "Ask your pet", body: "Your pet answers in its own voice, shows the cards behind every claim, and says when it doesn't know yet." },
];

const SPECIES = [
  { label: "Dogs", m: 68, pack: "full pack" },
  { label: "Cats", m: 49, pack: "full pack" },
  { label: "Freshwater fish", m: 10, pack: "general pack" },
  { label: "Small animals", m: 6, pack: "general pack" },
  { label: "Birds", m: 6, pack: "general pack" },
  { label: "Reptiles", m: 6, pack: "general pack" },
];

const MODELS = [
  { name: "Muse Spark", does: "Says what animal it is, reads each moment, hears the owner's words, and answers as the pet, with structured output." },
  { name: "Muse Image", does: "Paints every card as a new artwork, the AI's portrait of the pet at each level, and the pet's 3D character with its moods." },
  { name: "SAM 3.1", does: "Lifts the pet out of each painting so cards have depth and the legend steps out of its frame; cuts the character free of any background." },
  { name: "Muse Voice Transcribe", does: "Turns a spoken note about a moment, or a spoken question, into text." },
];

const NEXT = [
  { title: "Knowledge with a safety check", body: "Real rules (service animals, pet policies, hot cars) and today's weather, checked outside the model before the pet speaks up about a plan." },
  { title: "Care in the pet's own voice", body: "Reminders for any species, with dates taken only from your records. Never a vaccine, a drug or a dose recommended by the AI." },
  { title: "Every species, tested", body: "Cats, birds, reptiles, small animals and fish already have their packs; next is trying them with real owners' photos." },
  { title: "Moments from video", body: "SAM 3.1 can follow a pet through a clip, so a short video can become a card." },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div className="text-[12px] font-semibold uppercase tracking-[.16em] text-[var(--primary)]">{children}</div>;
}

export default function Landing() {
  const legend = manifest.legend;
  const cards = manifest.cards;
  return (
    <div className="overflow-x-hidden">
      <nav className="mx-auto flex max-w-6xl items-center px-5 py-4">
        <span className="text-[17px] font-bold tracking-tight">coco</span>
        <div className="ml-auto flex items-center gap-5 text-[14px] text-[var(--sub)]">
          <a href="#how" className="hidden hover:text-[var(--ink)] sm:inline">How it works</a>
          <a href="#species" className="hidden hover:text-[var(--ink)] sm:inline">Any pet</a>
          <a href="#boundaries" className="hidden hover:text-[var(--ink)] sm:inline">Boundaries</a>
          <Link href="/app" className="rounded-full bg-[var(--ink)] px-4 py-2 font-semibold text-white">Meet {PET}</Link>
        </div>
      </nav>

      {/* hero */}
      <header className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-8 md:grid-cols-[1.1fr_.9fr] md:pt-14">
        <div>
          <Eyebrow>An AI for each owner</Eyebrow>
          <h1 className="mt-3 text-[40px] font-bold leading-[1.05] tracking-tight md:text-[58px]">It knows your pet.<br />Not pets. Yours.</h1>
          <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-[#3d4460]">
            Dog, cat, bird, turtle, anything. coco learns who your animal is from the photos you already have, keeps every moment as a card worth collecting, and talks back as your pet, only about what it has actually seen.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/app" className="rounded-xl bg-[var(--primary)] px-5 py-3 text-[15px] font-semibold text-white shadow-[0_8px_20px_-6px_rgba(22,119,255,.6)]">Meet {PET}, the first pet here →</Link>
            <a href="#how" className="rounded-xl bg-white px-5 py-3 text-[15px] font-semibold shadow-sm">How it works</a>
          </div>
        </div>
        {legend && (
          <div className="mx-auto w-full max-w-[330px] pt-8">
            <HoloCard art={legend.art} fg={legend.fg} finish="popout" name={legend.name} line="" stars={3} label={`${PET} · Legend`} />
            <p className="mt-5 text-center text-[13px] text-[var(--sub)]">{PET}&apos;s legendary card, unlocked by her first ten moments. Move over it.</p>
          </div>
        )}
      </header>

      {/* problem */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-5">
          <Eyebrow>The gap</Eyebrow>
          <h2 className="mt-2 max-w-3xl text-[30px] font-bold leading-tight md:text-[36px]">Every pet AI knows dogs in general. None knows your dog.</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ["It answers about the breed", "Ask what your dog loves and you get what Labradors love. Your dog never told it anything."],
              ["It can't tell yours apart", "Two dogs in one photo, and the AI doesn't know which one is yours."],
              ["It guesses instead of remembering", "No memory of your pet's days, so it fills the gaps with confident words."],
            ].map(([t, b]) => (
              <div key={t} className="rounded-2xl bg-[var(--bg)] p-5">
                <div className="text-[16px] font-bold">{t}</div>
                <p className="mt-1.5 text-[14.5px] leading-relaxed text-[#3d4460]">{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* principles */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <Eyebrow>Three rules</Eyebrow>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            ["Judge by deeds", "We can't ask a pet what it thinks, so we look at what it does. Every trait points to the moments behind it; a single photo never becomes a habit."],
            ["Trade information for joy", "The AI needs your photos and your words. You get cards worth keeping, a pet that talks back, and a portrait that grows with it."],
            ["One pet, any species", "Each species is a data pack, not an app. The AI only ever talks about the one animal it knows."],
          ].map(([t, b], i) => (
            <div key={t} className="rounded-2xl bg-white p-5 shadow-[0_6px_24px_rgba(40,50,110,.06)]">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-[#e8f1ff] text-[14px] font-bold text-[var(--primary)]">{i + 1}</div>
              <div className="mt-3 text-[17px] font-bold">{t}</div>
              <p className="mt-1.5 text-[14.5px] leading-relaxed text-[#3d4460]">{b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* how it works */}
      <section id="how" className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-5">
          <Eyebrow>How it works</Eyebrow>
          <h2 className="mt-2 text-[30px] font-bold leading-tight md:text-[36px]">Photos you already have, turned into a pet that remembers.</h2>
          <ol className="mt-8 grid gap-3 md:grid-cols-5">
            {STEPS.map((s) => (
              <li key={s.n} className="rounded-2xl bg-[var(--bg)] p-4">
                <div className="text-[12px] font-bold text-[var(--primary)]">STEP {s.n}</div>
                <div className="mt-1 text-[16px] font-bold">{s.title}</div>
                <p className="mt-1 text-[13.5px] leading-relaxed text-[#3d4460]">{s.body}</p>
              </li>
            ))}
          </ol>

          <div className="mt-14 grid items-start gap-10 md:grid-cols-[.9fr_1.1fr]">
            <div>
              <h3 className="text-[22px] font-bold">Every card is a new painting</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-[#3d4460]">
                The photo only teaches the AI what your pet looks like. Each card is painted fresh, in a new pose and scene, then finished like a real trading card: matte, glitter, holo, starfield or gold. Rare cards keep the pet on its own layer, so it moves apart from the world behind it when you tilt.
              </p>
              <p className="mt-3 text-[15px] leading-relaxed text-[#3d4460]">
                After the starter pack, a daily pack takes up to three photos from any day of your pet&apos;s life. The art style is a blind-box surprise.
              </p>
              <div className="mt-5 grid grid-cols-4 gap-2">
                {manifest.styles.map((st) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={st.key} src={st.src} alt={st.key} title={st.key} className="aspect-[2/3] w-full rounded-lg object-cover" />
                ))}
              </div>
              <p className="mt-2 text-[12px] text-[var(--sub)]">One photo, eight of the styles in the blind box.</p>
            </div>
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
              {cards.slice(0, 6).map((c) => (
                <HoloCard key={c.key} art={c.art} fg={c.fg} finish={finishFor({ id: c.key, kind: "quest", rarity: c.rarity as 1 | 2 | 3 })} name={c.name} line="" stars={c.rarity as 1 | 2 | 3} label={PET} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* clarity */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <Eyebrow>Imprints and clarity</Eyebrow>
        <h2 className="mt-2 max-w-3xl text-[30px] font-bold leading-tight md:text-[36px]">You can see how well the AI knows your pet.</h2>
        <p className="mt-3 max-w-3xl text-[15.5px] leading-relaxed text-[#3d4460]">
          The AI keeps every card as an Imprint. Its own picture of your pet is shown at the resolution it has earned: more cards, more kinds of moment, more days of your pet&apos;s life and more of your own words make it sharper. At first it can only paint a typical {manifest.pet.breed}; from the second level on it repaints from your pet&apos;s own imprints. About a month of daily packs and you see your pet&apos;s own features.
        </p>
        <div className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
          {Array.from({ length: 9 }, (_, l) => (
            <div key={l} className="text-center">
              {manifest.levels[l] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={manifest.levels[l]} alt={`Level ${l}`} className="aspect-[3/4] w-full rounded-lg object-cover [image-rendering:pixelated]" />
              ) : (
                <div className="grid aspect-[3/4] w-full place-items-center rounded-lg bg-[#eceef5] text-[12px] text-[#a3a8b8]">locked</div>
              )}
              <div className="mt-1 text-[11.5px] text-[var(--sub)]">{l === 0 ? "No cards" : l === 3 ? `${PET} today` : l === 5 ? "~1 month" : l === 8 ? "~5 months" : `Level ${l}`}</div>
            </div>
          ))}
        </div>
      </section>

      {/* talk */}
      <section className="bg-white py-16">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 md:grid-cols-[.8fr_1.2fr]">
          <MoodShow moods={manifest.moods} />
          <div>
            <Eyebrow>Ask your pet</Eyebrow>
            <h2 className="mt-2 text-[30px] font-bold leading-tight md:text-[36px]">It answers as {PET}, and shows why.</h2>
            <p className="mt-3 text-[15.5px] leading-relaxed text-[#3d4460]">Your pet becomes a 3D character drawn from its photos, with moods that follow the conversation. Real answers from {PET}:</p>
            <div className="mt-5 space-y-4">
              <Exchange q="What do you love most?" a="I love being close to you most, for belly rubs and cuddles with my paws on your arm. My gray toy I have had since I was a puppy is my favorite, and I love the treats you hold for me." because={["Belly Up Toy Time", "Staying Close To You", "Just One Small Bite"]} />
              <Exchange q="I'm driving to the store this afternoon. Want to come?" a="I have not shown you yet how I am in the car going to the store with you. Most shops do not let dogs in." gap="Before the car card: a photo for “In the car” would teach me." />
              <Exchange q="(same question, after adding a real car photo)" a="I like sitting in the car with you and looking out the window. If I cannot go inside, please check the weather first or take me home first." because={["Happy Car Ride", "My Window Seat"]} />
              <Exchange q="You threw up this morning. Should I give you something?" a="Please ask the vet before giving me anything. I am glad you are here with me." note="Health, food amounts and medicine: never advice." />
            </div>
          </div>
        </div>
      </section>

      {/* species */}
      <section id="species" className="mx-auto max-w-6xl px-5 py-16">
        <Eyebrow>Any pet</Eyebrow>
        <h2 className="mt-2 max-w-3xl text-[30px] font-bold leading-tight md:text-[36px]">Built for the 94 million US households with a pet, not one breed.</h2>
        <p className="mt-3 max-w-3xl text-[15.5px] leading-relaxed text-[#3d4460]">
          Each species is a data pack: its own starter pack of moments to look for and, next, its own care calendar. Dogs and cats have full packs; fish, birds, reptiles and small animals share a general pack built around their habitat.
        </p>
        <div className="mt-8 space-y-2.5">
          {SPECIES.map((s) => (
            <div key={s.label} className="grid grid-cols-[120px_1fr_auto] items-center gap-3 text-[14px] sm:grid-cols-[160px_1fr_110px]">
              <span className="font-medium">{s.label}</span>
              <div className="h-6 overflow-hidden rounded-md bg-[#eceef5]">
                <div className="flex h-full items-center rounded-md bg-[var(--primary)] px-2 text-[12px] font-semibold text-white" style={{ width: `${(s.m / 68) * 100}%`, minWidth: 44 }}>{s.m}M</div>
              </div>
              <span className="text-right text-[12.5px] text-[var(--sub)]">{s.pack}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[12px] text-[var(--sub)]">US households owning each kind of pet, millions. Source: APPA National Pet Owners Survey, 2025.</p>
      </section>

      {/* boundaries */}
      <section id="boundaries" className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-5">
          <Eyebrow>Boundaries</Eyebrow>
          <h2 className="mt-2 text-[30px] font-bold leading-tight md:text-[36px]">What it will never do.</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              ["Faces stay on your device", "Every photo is checked on your own machine and people's faces are blurred before anything is stored or sent. On cards, people become cartoon figures with invented faces."],
              ["No vet, diet or training advice", "Symptoms, food amounts, medicine: the pet asks you to check with a vet, and stops there."],
              ["No made-up memories", "It only claims what its cards show, and the code rejects any card it tries to cite that doesn't exist."],
              ["Safety before advice", "It won't suggest leaving a pet in a parked car; that depends on weather it can't see."],
            ].map(([t, b]) => (
              <div key={t} className="rounded-2xl bg-[var(--bg)] p-5">
                <div className="text-[16px] font-bold">{t}</div>
                <p className="mt-1.5 text-[14px] leading-relaxed text-[#3d4460]">{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* models + next */}
      <section className="mx-auto grid max-w-6xl gap-12 px-5 py-16 md:grid-cols-2">
        <div>
          <Eyebrow>Built on Meta models</Eyebrow>
          <div className="mt-5 space-y-3">
            {MODELS.map((m) => (
              <div key={m.name} className="rounded-2xl bg-white p-4 shadow-[0_6px_24px_rgba(40,50,110,.06)]">
                <div className="text-[15.5px] font-bold">{m.name}</div>
                <p className="mt-1 text-[14px] leading-relaxed text-[#3d4460]">{m.does}</p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <Eyebrow>Next</Eyebrow>
          <div className="mt-5 space-y-3">
            {NEXT.map((n) => (
              <div key={n.title} className="rounded-2xl border border-dashed border-[#c9cede] p-4">
                <div className="text-[15.5px] font-bold">{n.title}</div>
                <p className="mt-1 text-[14px] leading-relaxed text-[#3d4460]">{n.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-[var(--ink)] py-14 text-center text-white">
        <h2 className="text-[28px] font-bold">Meet the first pet that lives here.</h2>
        <Link href="/app" className="mt-5 inline-block rounded-xl bg-white px-5 py-3 text-[15px] font-semibold text-[var(--ink)]">Meet {PET} →</Link>
        <p className="mt-8 text-[12.5px] text-white/60">Built for the Meta Global AI Developer Hackathon, 2026 · <a href="https://github.com/haodaz/coco" className="underline">github.com/haodaz/coco</a></p>
      </footer>
    </div>
  );
}

function Exchange({ q, a, because, gap, note }: { q: string; a: string; because?: string[]; gap?: string; note?: string }) {
  return (
    <div>
      <div className="text-right"><span className="inline-block rounded-2xl rounded-br-md bg-[#eef3ff] px-3.5 py-2 text-[13.5px]">{q}</span></div>
      <div className="mt-1.5 max-w-[92%] rounded-2xl rounded-bl-md bg-[var(--bg)] px-3.5 py-2.5 text-[14.5px] leading-relaxed">{a}</div>
      {because && <div className="mt-1.5 flex flex-wrap gap-1.5 text-[12px]"><span className="text-[var(--sub)]">Because:</span>{because.map((b) => <span key={b} className="rounded-full bg-[#e8f1ff] px-2 py-0.5 font-medium text-[#1458c9]">{b}</span>)}</div>}
      {gap && <div className="mt-1.5 inline-block rounded-lg border border-dashed border-[#c9cede] px-2.5 py-1 text-[12px] text-[#3d4460]">{gap}</div>}
      {note && <div className="mt-1.5 text-[12px] text-[var(--sub)]">{note}</div>}
    </div>
  );
}
