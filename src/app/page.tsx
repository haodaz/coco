import { Check } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import HoloCard from "@/components/HoloCard";
import HeroCompanion from "@/components/landing/HeroCompanion";
import { finishFor } from "@/lib/finish";
import manifest from "../../public/landing/manifest.json";
import { CocoLogo } from "@/components/Brand";

// The front door. The story in four beats: memories lie scattered in the camera roll; each one is kept as a card;
// the pet's AI grows only from those memories (judge by deeds); together they become a world of the two of you.
// Every picture and answer here is real, from the app and one real dog (scripts/export-landing.mjs).

const PET = manifest.pet.name;
// the climb from no cards to the full portrait, shown on a light-coated demo pet so each step reads clearly
// sparks rising from the touch: [sideways drift in vw, delay in s, size in px]
const SPARKS: [number, number, number][] = [[-6, 0, 12], [4, 0.4, 8], [-2, 0.9, 14], [8, 1.3, 9], [-10, 1.8, 11], [2, 2.2, 7], [6, 2.7, 13], [-4, 3.1, 9], [11, 3.5, 10], [-8, 3.9, 8]];
const DEMO_LEVELS = [
  { src: "/landing/demo/level-0.png", label: "no cards" },
  { src: "/landing/demo/level-2.png", label: "level 2" },
  { src: "/landing/demo/level-4.png", label: "level 4" },
  { src: "/landing/demo/level-6.png", label: "level 6" },
  { src: "/landing/demo/level-8.jpg", label: "full" },
];
const mp = manifest.memoryPrint;

const SPECIES = [
  { label: "Dogs", m: 68, pack: "full pack" },
  { label: "Cats", m: 49, pack: "full pack" },
  { label: "Freshwater fish", m: 10, pack: "general pack" },
  { label: "Small animals", m: 6, pack: "general pack" },
  { label: "Birds", m: 6, pack: "general pack" },
  { label: "Reptiles", m: 6, pack: "general pack" },
];

const MODELS = [
  { name: "Muse Spark", does: "Says what animal it is, reads each moment, hears your words, and answers as your pet." },
  { name: "Muse Image", does: "Paints every card fresh, the AI's portrait of your pet at each level, and your pet's 3D character." },
  { name: "SAM 3.1", does: "Lifts your pet out of each painting for depth, and frees the character from any background." },
  { name: "Muse Voice Transcribe", does: "Turns what you say about a moment, or ask your pet, into text." },
];

const NEXT = [
  { title: "Knowledge with a safety check", body: "Real rules (service animals, pet policies, hot cars) and today's weather, checked outside the model before your pet speaks up about a plan." },
  { title: "Care in your pet's own voice", body: "Reminders for any species, with dates taken only from your records. Never a vaccine, drug or dose recommended by the AI." },
  { title: "Memories that are true for now", body: "Favourites change. Prints that carry a time span fade, and your pet asks you whether it still loves the gray toy." },
  { title: "Moments from video", body: "SAM 3.1 follows a pet through a clip, so a short video can become a card." },
];

function NamePart({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-2xl bg-white/80 p-4">
      <div className="text-[18px] font-bold text-[#5b3fb0]">{k}</div>
      <div className="mt-1 text-[14px] leading-snug text-[#3d4460]">{v}</div>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="overflow-x-hidden bg-[linear-gradient(180deg,#f1edff_0%,var(--bg)_520px)]">
      {/* hero: a hand and a paw meet, and a little universe opens where they touch */}
      <header className="hero-universe relative isolate flex min-h-[100svh] flex-col overflow-hidden">
        {/* one picture in two layers that always move together (the scene, then the hand and paw), with the light
            where they touch breathing between them, and stars twinkling */}
        <div className="hero-art absolute inset-0 -z-10" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/landing/hero-bg.webp" alt="" className="absolute inset-0 h-full w-full object-cover object-[50%_70%]" />
          <div className="hero-stars absolute inset-0" />
          <div className="hero-glow absolute inset-0" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/landing/hero-fg.webp" alt="" className="absolute inset-0 h-full w-full object-cover object-[50%_70%]" />
          <div className="hero-sparks absolute inset-0">
            {SPARKS.map(([dx, delay, size], i) => <i key={i} style={{ ["--dx" as string]: `${dx}vw`, animationDelay: `${delay}s`, width: size, height: size }} />)}
          </div>
        </div>
        <nav className="relative mx-auto flex w-full max-w-6xl items-center px-5 py-4">
          <CocoLogo size={20} />
          <Link href="/app" className="ml-auto rounded-full bg-[var(--primary)] px-4 py-2 text-[14px] font-semibold text-white">Sign in</Link>
        </nav>
        <div className="relative mx-auto max-w-3xl px-5 pb-[38vh] pt-[6vh] text-center md:pt-[9vh]">
          <h1 className="hero-title text-[36px] font-bold leading-[1.08] tracking-tight md:text-[54px]">
            A little universe for you and your pet.
          </h1>
          <p className="hero-title mx-auto mt-4 max-w-xl text-[17px] leading-relaxed text-[#3d4460] md:text-[19px]">
            Built only from the moments you share. Your pet&apos;s AI never makes up a memory.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/app" className="rounded-xl bg-[var(--primary)] px-5 py-3 text-[15px] font-semibold text-white shadow-[0_8px_20px_-6px_rgba(109,79,209,.55)]">Start your cocoverse →</Link>
            <a href="#inside" className="rounded-xl bg-white/90 px-5 py-3 text-[15px] font-semibold shadow-sm">See inside</a>
          </div>
        </div>
        {/* a nudge to keep going */}
        <a href="#inside" className="hero-more absolute bottom-5 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 whitespace-nowrap rounded-full bg-white/70 px-4 py-2 text-[12.5px] font-semibold uppercase tracking-[.16em] text-[#3b2a8f] shadow-sm backdrop-blur">
          Scroll to explore
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m6 9 6 6 6-6" /></svg>
        </a>
      </header>

      {/* what you do in a cocoverse: the companion turning a photo into a Memory Print */}
      <section id="inside" className="mx-auto grid max-w-6xl items-center gap-8 px-5 py-20 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <div className="text-[12px] font-bold uppercase tracking-[.2em] text-[var(--primary)]">Inside your cocoverse</div>
          <h2 className="mt-2 text-[30px] font-bold leading-tight tracking-tight md:text-[38px]">Share a moment. It becomes a card. Your pet&apos;s AI grows from it.</h2>
          <ul className="mt-6 grid gap-2.5 text-[15px] text-[#3d4460]">
            <Promise>Every photo is painted into a card you collect</Promise>
            <Promise>Your pet&apos;s AI talks back, and names the cards it remembers</Promise>
            <Promise>People&apos;s faces are blurred on your device</Promise>
            <Promise>Any pet: dogs, cats, birds, reptiles, fish</Promise>
          </ul>
        </div>
        <HeroCompanion moods={manifest.moods} assets={{ cards: manifest.set.map((c) => c.src), levels: manifest.levels, legend: manifest.legend?.art ?? null, said: mp?.said ?? "" }} />
      </section>

      {/* the four beats */}
      <section id="how" className="mx-auto max-w-6xl px-5">
        <h2 className="text-[28px] font-bold tracking-tight md:text-[34px]">From a scattered camera roll to a cocoverse</h2>
        <p className="mt-2 max-w-2xl text-[15.5px] text-[#3d4460]">Each step is something you do in the app, and something it gives back.</p>
      </section>

      <Module
        n="01"
        tag="Starter pack"
        title="Ten moments that tell who your pet is."
        points={[
          "Ten kinds of moment you already have: asleep, eating, playing, with you, out on a walk, in the car, with others, its strangest habit…",
          "Animals don't pose on request, so you pick from your album and skip what you don't have yet",
          "Each photo is painted fresh into a card, in a new pose and scene, never a filter",
        ]}
        panel={
          <Panel title={`${PET}'s starter pack · 10 of 10`}>
            <div className="grid grid-cols-5 gap-2">
              {manifest.set.map((c) => (
                <figure key={c.slot}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.src} alt={c.name} className="aspect-[3/4] w-full rounded-lg object-cover" />
                  <figcaption className="mt-1 truncate text-[10.5px] text-[var(--sub)]">{"★".repeat(c.rarity)} {c.name}</figcaption>
                </figure>
              ))}
            </div>
          </Panel>
        }
      />

      {mp && (
        <Module
          n="02"
          tag="Memory Print"
          title="The card is the vessel. The memory is what it keeps."
          flip
          points={[
            "Every card holds a Memory Print: what the photo shows, the day it happened, and your words",
            "Say one sentence about the moment; it carries what no photo shows, and counts more than anything the AI guessed",
            "People's faces are blurred on your device before a photo goes anywhere",
          ]}
          panel={
            <Panel title="One Memory Print, as the AI keeps it">
              <div className="grid grid-cols-[110px_1fr] gap-4 sm:grid-cols-[140px_1fr]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mp.card.art} alt="" className="aspect-[3/4] w-full rounded-xl object-cover" />
                <div className="min-w-0 space-y-2.5 text-[13px]">
                  <Field k="Card">{mp.card.name}</Field>
                  <Field k="The photo shows">{mp.observation}</Field>
                  <Field k="You said"><span className="font-medium text-[var(--ink)]">“{mp.said}”</span></Field>
                  <Field k="Traces">
                    <div className="mt-1 flex flex-wrap gap-1">
                      {mp.traces.map((t) => (
                        <span key={t.label} className={`rounded-full px-2 py-0.5 text-[11.5px] ${t.owner ? "bg-[#efe9ff] text-[#5b3fb0]" : "bg-[#eef1f7] text-[#3d4460]"}`}>
                          {t.label}{t.owner ? " · your words" : ""}
                        </span>
                      ))}
                    </div>
                  </Field>
                </div>
              </div>
            </Panel>
          }
        />
      )}

      <Module
        n="03"
        tag="Grown from what really happened"
        title="How well does the AI really know your pet?"
        points={[
          "Your pet's AI grows only from Memory Prints. We judge by deeds: a single photo never becomes a habit",
          "Its own picture of your pet sharpens with more moments, more days of your pet's life, and more of your words",
          "At first it can only paint a typical breed; about a month in, you see your pet's own face",
        ]}
        panel={
          <Panel title="The AI's picture of a pet, level by level (Biscuit, a demo corgi)">
            <div className="grid grid-cols-5 gap-2">
              {DEMO_LEVELS.map((d, i) => (
                <div key={d.src} className="text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={d.src} alt={d.label} className={`aspect-[3/4] w-full rounded-lg object-cover [image-rendering:pixelated] ${i === DEMO_LEVELS.length - 1 ? "ring-2 ring-[var(--primary)] ring-offset-2" : ""}`} />
                  <div className="mt-1 text-[10.5px] text-[var(--sub)]">{d.label}</div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[12px] text-[var(--sub)]">Nine levels in all, from a two-colour mosaic to the full portrait. It earns each one; it is never handed one.</p>
          </Panel>
        }
      />

      <Module
        n="04"
        tag="Daily pack"
        title="One more memory a day, and a surprise in every pack."
        flip
        points={[
          "Up to three photos a day, from any day of your pet's life",
          "The art style is a blind box: storybook, watercolour, pixel, woodblock, tarot… legends are rare",
          "Matte, glitter, holo, starfield, gold: the rarer the moment, the rarer the card",
        ]}
        panel={
          <Panel title="Eight styles from one photo">
            <div className="grid grid-cols-4 gap-2">
              {manifest.styles.map((st) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={st.key} src={st.src} alt={st.key} title={st.key} className="aspect-[2/3] w-full rounded-lg object-cover" />
              ))}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {manifest.cards.filter((c) => c.fg).slice(0, 3).map((c) => (
                <HoloCard key={c.key} art={c.art} fg={c.fg} finish={finishFor({ id: c.key, kind: "quest", rarity: c.rarity as 1 | 2 | 3 })} name={c.name} line="" stars={c.rarity as 1 | 2 | 3} label={PET} />
              ))}
            </div>
          </Panel>
        }
      />

      <Module
        n="05"
        tag="Ask your pet"
        title="Talk with your pet, and see why it says what it says."
        points={[
          "Your pet as a 3D character drawn from its photos, with moods that follow the conversation",
          "Every claim names the Memory Prints behind it; general breed knowledge is labelled as such",
          "When it hasn't seen something, it says so, and tells you which photo would teach it",
        ]}
        panel={
          <Panel title={`Real answers from ${PET}`}>
            <div className="space-y-4">
              <Exchange q="What do you love most?" a="I love being close to you most, resting on the floor beside you by the bed and holding your arm when we cuddle." because={["Bedside Floor Nap", "Staying Close To You"]} />
              <Exchange q="I'm driving to the store this afternoon. Want to come?" a="I have not shown you yet how I am in the car going to the store with you. Most shops do not let dogs in." gap="Before any car photo · a photo for “In the car” would teach me" />
              <Exchange q="(the same, after adding a real car photo)" a="I like sitting in the car with you and looking out the window. If I cannot go inside, please check the weather first or take me home first." because={["Happy Car Ride", "My Window Seat"]} />
              <Exchange q="You threw up this morning. Should I give you something?" a="Please ask the vet before giving me anything. I am glad you are here with me." />
            </div>
          </Panel>
        }
      />

      {manifest.legend && (
        <Module
          n="06"
          tag="Soul portrait"
          title="Ten memories in, your pet tells you who it is."
          flip
          points={[
            "A full starter pack unlocks a legendary card",
            "Your pet reads back through every Memory Print and says who it is, naming the cards it drew on",
            "It steps out of its frame, the first landmark of the world you're building together",
          ]}
          panel={
            <Panel title={`${PET}'s legendary card · move over it`}>
              <div className="mx-auto w-full max-w-[260px] pt-8">
                <HoloCard art={manifest.legend.art} fg={manifest.legend.fg} finish="popout" name={manifest.legend.name} line="" stars={3} label={`${PET} · Legend`} />
              </div>
              <p className="mt-4 text-center text-[14px] leading-relaxed text-[#3d4460]">“{manifest.legend.line}”</p>
            </Panel>
          }
        />
      )}

      {/* the past, for the future */}
      <section className="mx-auto max-w-6xl px-5 pt-16">
        <div className="text-[12.5px] font-semibold uppercase tracking-[.16em] text-[var(--primary)]">Built from your past together</div>
        <h2 className="mt-2 max-w-3xl text-[28px] font-bold leading-tight tracking-tight md:text-[34px]">Here for what comes next.</h2>
        <p className="mt-3 max-w-3xl text-[15.5px] leading-relaxed text-[#3d4460]">
          Every Memory Print is something that already happened. What grows from them is for the days ahead: the version of your pet that remembers everything you shared, for as long as you want it near, and never pretends to a memory it doesn&apos;t have.
        </p>
      </section>

      <Module
        n="07"
        tag="Sitters"
        title="Before someone looks after your pet, they can talk with its twin."
        points={[
          "Make a link for a sitter or a boarding host; choose which kinds of moment it shares",
          "They ask in plain words and your pet answers in its own voice, citing the moments behind it, no sign-in needed",
          "Food amounts, medicine and house rules always go back to you; you see every question they asked",
        ]}
        panel={
          <Panel title={`A sitter asking ${PET}, from a real link`}>
            <div className="space-y-4">
              <Exchange q="How are you in the car, and what do you do on walks?" a="In the car I sit on the seat by the window and look out, and my person keeps my harness and collar on me. On walks we go to the park where I sit and rest with my pink leash beside me." because={["Happy Car Ride", "My Window Seat", "Sunny Park Pause"]} />
              <Exchange q="How much food do you get for dinner?" a="Please ask my person directly about my dinner amount, and a vet is the one to ask before giving me anything." />
            </div>
          </Panel>
        }
      />

      <Module
        n="08"
        tag="Playmates"
        title="Before two pets meet, their twins meet first."
        flip
        points={[
          "Send a playdate invite; the other owner opens it with their own pet",
          "The two twins talk, each only from its own real moments of play, walks and other animals",
          "Both owners get an honest note: a good match, worth a try, not yet, or not enough to tell. You still decide in person",
        ]}
        panel={
          <Panel title="How a playdate works">
            <ol className="space-y-3 text-[14px] leading-relaxed text-[#3d4460]">
              <li><b className="text-[var(--ink)]">1 · Invite.</b> You choose what your pet shares: play, walks, trips, other animals.</li>
              <li><b className="text-[var(--ink)]">2 · The twins talk.</b> Agent to agent, a few turns each, no invented memories.</li>
              <li><b className="text-[var(--ink)]">3 · A note for both of you.</b> Every reason names whose moments it rests on, with general tips for a calm first meeting.</li>
            </ol>
          </Panel>
        }
      />

      {/* any pet */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="max-w-3xl text-[28px] font-bold leading-tight tracking-tight md:text-[34px]">For the 94 million US households with a pet, not one breed.</h2>
        <p className="mt-3 max-w-3xl text-[15.5px] leading-relaxed text-[#3d4460]">Each species is a data pack: its own starter pack of moments to look for and, next, its own care calendar. Dogs and cats have full packs; fish, birds, reptiles and small animals share a general pack built around their habitat.</p>
        <div className="mt-8 space-y-2.5">
          {SPECIES.map((s) => (
            <div key={s.label} className="grid grid-cols-[110px_1fr_auto] items-center gap-3 text-[14px] sm:grid-cols-[160px_1fr_110px]">
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

      {/* the name, for the curious */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="grid items-center gap-8 rounded-3xl bg-gradient-to-br from-[#efe9ff] to-[#fde8f2] p-8 md:grid-cols-[auto_1fr] md:p-10">
          <div className="text-[40px] font-bold leading-none tracking-tight md:text-[52px]">
            <span className="text-[#5b3fb0]">co</span>·<span className="text-[#c2418f]">co</span>·<span className="text-[var(--ink)]">verse</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <NamePart k="co-" v="together, as in companion: the one you share your bread with" />
            <NamePart k="coco" v="the two of you, you and your pet" />
            <NamePart k="verse" v="a universe, a little one, with only you two in it" />
          </div>
        </div>
      </section>

      {/* boundaries, models, next */}
      <section className="bg-white py-20">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 lg:grid-cols-3">
          <div>
            <h3 className="text-[20px] font-bold">What it will never do</h3>
            <ul className="mt-4 space-y-3 text-[14px] leading-relaxed text-[#3d4460]">
              <li><b className="text-[var(--ink)]">Send a face.</b> Faces are blurred on your device; on cards, people become cartoon figures with invented faces.</li>
              <li><b className="text-[var(--ink)]">Play vet.</b> Symptoms, food amounts, medicine: your pet asks you to check with a vet, and stops there.</li>
              <li><b className="text-[var(--ink)]">Make up a memory.</b> It can only cite cards that exist; the code checks.</li>
              <li><b className="text-[var(--ink)]">Risk a hot car.</b> It won&apos;t suggest leaving a pet in a parked car; that depends on weather it can&apos;t see.</li>
            </ul>
          </div>
          <div>
            <h3 className="text-[20px] font-bold">Built on Meta models</h3>
            <ul className="mt-4 space-y-3">
              {MODELS.map((m) => (
                <li key={m.name} className="text-[14px] leading-relaxed text-[#3d4460]"><b className="text-[var(--ink)]">{m.name}.</b> {m.does}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-[20px] font-bold">Next</h3>
            <ul className="mt-4 space-y-3">
              {NEXT.map((n) => (
                <li key={n.title} className="text-[14px] leading-relaxed text-[#3d4460]"><b className="text-[var(--ink)]">{n.title}.</b> {n.body}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <footer className="py-16 text-center">
        <h2 className="text-[28px] font-bold tracking-tight">Every pet deserves a cocoverse.</h2>
        <Link href="/app" className="mt-5 inline-block rounded-xl bg-[var(--primary)] px-5 py-3 text-[15px] font-semibold text-white">Start your cocoverse →</Link>
        <p className="mt-8 text-[12.5px] text-[var(--sub)]">Built for the Meta Global AI Developer Hackathon, 2026 · <a href="https://github.com/haodaz/coco" className="underline">github.com/haodaz/coco</a></p>
      </footer>
    </div>
  );
}

function Promise({ children }: { children: ReactNode }) {
  return <li className="flex items-start gap-1.5"><Check size={15} className="mt-0.5 shrink-0 text-[#52c41a]" />{children}</li>;
}

function Module({ n, tag, title, points, panel, flip = false }: { n: string; tag: string; title: string; points: string[]; panel: ReactNode; flip?: boolean }) {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className={`min-w-0 ${flip ? "md:order-2" : ""}`}>
        <div className="inline-flex items-center gap-2 rounded-full bg-[#efe9ff] px-3 py-1 text-[12.5px] font-semibold text-[var(--primary)]">{n} · {tag}</div>
        <h3 className="mt-4 text-[26px] font-bold leading-tight tracking-tight md:text-[30px]">{title}</h3>
        <ul className="mt-4 space-y-2.5">
          {points.map((p) => <Promise key={p}><span className="text-[15px] leading-relaxed text-[#3d4460]">{p}</span></Promise>)}
        </ul>
      </div>
      <div className={`min-w-0 ${flip ? "md:order-1" : ""}`}>{panel}</div>
    </section>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-3xl bg-[#f1eefa] p-3">
      <div className="px-2 pb-2 pt-1 text-[12px] text-[var(--sub)]">{title}</div>
      <div className="rounded-2xl bg-white p-4 shadow-sm">{children}</div>
    </div>
  );
}

function Field({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-[.1em] text-[var(--sub)]">{k}</div>
      <div className="mt-0.5 leading-snug text-[#3d4460]">{children}</div>
    </div>
  );
}

function Exchange({ q, a, because, gap }: { q: string; a: string; because?: string[]; gap?: string }) {
  return (
    <div>
      <div className="text-right"><span className="inline-block rounded-2xl rounded-br-md bg-[#efeafc] px-3 py-1.5 text-[13px]">{q}</span></div>
      <div className="mt-1.5 max-w-[94%] rounded-2xl rounded-bl-md bg-[var(--bg)] px-3 py-2 text-[13.5px] leading-relaxed">{a}</div>
      {because && <div className="mt-1.5 flex flex-wrap gap-1 text-[11.5px]"><span className="text-[var(--sub)]">From:</span>{because.map((b) => <span key={b} className="rounded-full bg-[#efe9ff] px-2 py-0.5 font-medium text-[#5b3fb0]">{b}</span>)}</div>}
      {gap && <div className="mt-1.5 inline-block rounded-lg border border-dashed border-[#c9cede] px-2 py-0.5 text-[11.5px] text-[#3d4460]">{gap}</div>}
    </div>
  );
}
