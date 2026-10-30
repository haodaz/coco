# cocoverse

**A little universe for you and your pet.** Live at [cocoverse.app](https://www.cocoverse.app).

Your pet will never tell you who they are. So cocoverse builds your pet's AI twin the only honest way: from what they actually do. Every photo you share becomes a collectible card, a **Memory Print**; the twin grows only from those cards, answers in your pet's voice, names the cards each answer rests on, and says plainly when it has no memory of something. It never makes a memory up.

Built for the **Meta Global AI Developer Hackathon** (Indie track, *Build for Your World*), Oct 26 – Nov 4, 2026. Everything in this repository was written during the hackathon; the commit history is the log. First user: Coco, a black Labrador. Biscuit (a corgi) and Mochi (a tabby cat) are demo pets whose photos were made with Muse Image.

*co-* means together, as in *companion*, the one you share your bread with: coco is the two of you. *verse*, as in universe, is everything you share, and a little one: only the two of you are in it.

---

## What happens in a cocoverse

**Start with one photo.** You answer three easy questions (name, kind of animal, girl or boy), then pick one photo. Muse Spark says what it sees (breed guesses, coat, marks, size); you correct anything and confirm. People's faces are blurred in your browser before the photo is uploaded.

**Starter Kit: ten moments you already have.** Each slot asks for a kind of photo that is probably in your album (sleeping, eating, playing, with you, out on a walk, its strangest habit…). Animals don't pose on request, so you pick what you have and skip the rest. Each photo turns a card over right away. Finishing the kit unlocks the **soul portrait**: the pet reads back through all its cards, says who it is, and gets a legendary card that steps out of its frame.

**Every card is one real moment.** Muse Spark reads the photo into short notes (traces), a card name and a line in the pet's voice. Muse Image paints a *new* picture of your pet in that moment, in one of nine blind-box styles (three rarity tiers). On rare cards, SAM 3.1 cuts the pet out of the painting, so it moves in front of the scene when you tilt the card. Then you can tell the story the photo can't show; your words are kept as evidence marked as yours, and they outrank anything the model guessed.

**Memory Points and packs.** Sharing a moment earns M pt (three free a day, plus today's tasks). Three M pt open a Daily Booster: your shared memories, already painted in the background, turn over one by one, and sometimes a **move card** falls out (a new way the character moves). Cards fill **series** that follow who your pet is: favourite things, food, games, friends, places, the seasons, the hours of a day.

**Talk with your pet.** A 3D character of your pet (one design, moods, walking) answers as itself, in your language. Every claim about itself points to the cards it comes from ("I remember this from…"). General breed knowledge is labelled as such. Asked about something it has never been shown, it says so and suggests the photo that would teach it.

**Memory.** How well the AI knows your pet: a portrait that sharpens from a two-colour mosaic to the full painting as evidence grows, the moves it has learned, and a **memory graph** of what it knows (the pet, related to how it is, things, beings and places), every link resting on real cards. General knowledge sits outside the graph, dashed.

**Around us.** Your town, never your address: today's weather and air, whether a parked car is safe right now (AVMA numbers with today's temperature), and the local rules with their source and date (state laws on animals in parked cars, ADA service animals, FDA food code). When you ask your pet along to the shop, it checks these first, and shows what it checked.

**Friends.** Two kinds of link, each sharing only the kinds of moment you choose, switchable off any time:
- **For a sitter**: whoever looks after your pet can ask its twin about routines and habits, no sign-in needed. Food amounts, medicine and house rules always go back to you.
- **Find a playmate**: before two pets meet, their twins meet first. Each speaks only from its own cards; both owners get one honest note (good match / worth a try / not yet / not enough to tell), every reason tied to a card.

**Everywhere.** Phone and desktop layouts; eleven interface languages, with the AI writing in yours.

## Three layers, every link with its proof

| Layer | What it is | How it is treated |
|---|---|---|
| **General knowledge** | species and breed, the weather and rules where you live | used with care, always labelled, never taken for a memory |
| **Your pet's own moments** | read from each photo: how it is, the things, people, animals and places in its life | the only source of "memories"; each one points back to its photo |
| **Your words** | what no photo shows | outrank anything the AI guessed |

The evidence rule is enforced in code, not just in prompts: an answer can only cite cards that exist, a playdate reason only counts if it points to a real card of that pet, and a single photo never becomes a habit (card lines never say "always"; habits come from the owner's words). See [`src/lib/ask.ts`](src/lib/ask.ts) and [`src/app/api/p/[token]/meet/route.ts`](src/app/api/p/%5Btoken%5D/meet/route.ts).

## Meta models

| Model | Where | What it does |
|---|---|---|
| **Muse Spark 1.3** | [`src/lib/meta.ts`](src/lib/meta.ts) | Identifies the animal from one photo; reads each photo into traces, a card name and a line in the pet's voice; reads the owner's words; answers as the pet with cited cards, a gap when it has none, and the action to open; writes the soul portrait; builds the memory graph |
| **Muse Image 1.0** | `paintCard`, `paintLikeness`, [`src/lib/character.ts`](src/lib/character.ts) | A new painting for every card (nine styles), the AI's portrait of the pet at each clarity level, the 3D character, its moods and walk frames, the clean scene behind rare cards |
| **SAM 3.1** | `petLayer`, `depthLayers` in `src/lib/meta.ts` | Cuts the pet, with what it wears and holds, out of each painting for card depth, and out of every character frame |
| **Muse Spark Open** (open weights, on Baseten) | `sparkJson` in `src/lib/meta.ts` | Answers sitters, runs the twin-to-twin playdates and builds the memory graph (the text-only features); the page says so when it did; either Spark takes over if the other fails |
| **Muse Voice Transcribe 1.0** | `transcribe` in `src/lib/meta.ts` | Spoken questions to the pet and spoken stories about a card |

Every live call's token use is logged (`data/usage.jsonl` locally, a `usage_log` table hosted) and shown on the admin page. [`modal/sam.py`](modal/sam.py) runs SAM 3 (open weights) on Modal as a self-hosted alternative for the cut-outs; it is tested but not wired in.

## Boundaries

- **Faces never leave your device.** Every photo is checked in the browser with MediaPipe BlazeFace before upload and every human face is blurred; an object check keeps pets' faces sharp when the detector mistakes them for people. Only the blurred copy exists anywhere. (In local development on macOS, Apple's Vision framework does the same check server-side.)
- **Your town, never your street.** Place is kept at town level; links share only the kinds of moment you choose.
- **No health, food-amount, medicine or training advice.** Asked about symptoms, the pet says to ask a vet, and stops.
- **Judge by deeds.** The pet claims only what its cards show; the owner's words are the one thing that can add a habit.
- **No invented memories.** A gap is answered with "I don't have a memory of that yet" and a way to teach it.

## Run it

Requirements: Node 20+ and a Meta Model API key from [dev.meta.ai](https://dev.meta.ai). macOS is needed only for the optional server-side face check in local development.

```bash
npm install
cp .env.example .env.local   # put your key in MODEL_API_KEY; set META_LIVE=1 to call the real API
npm run dev
```

Open http://localhost:3000 for the landing page or http://localhost:3000/app to start with your own pet.

- **Practice mode** (`META_LIVE` not 1): sample answers, nothing is sent anywhere.
- **Live mode**: a card takes 20–40 s (reading, painting, cut-out). The character takes about two minutes the first time.
- **Local mode**: with no Supabase keys, everything stays in `data/` (git-ignored). Delete `data/` to start over.
- **Hosted mode**: Supabase keys in `.env.local` give sign-in, one state row per account (with version locking), private media storage and the usage log. `ADMIN_EMAILS` lifts the daily limits for those accounts.
- `BASETEN_API_KEY` turns on Muse Spark Open for sitters and playdates.

## Where things are

| Path | What |
|---|---|
| `src/app/page.tsx` | Landing: the hero (Muse Image art, layers cut with SAM), what you do, the three layers, the name |
| `src/app/app/` | The app: `page.tsx` home, `pack/` today, `cards/` collection, `chat/` talk, `memory/`, `place/` around us, `friends/`, `admin/` |
| `src/app/s/[token]`, `src/app/p/[token]` | A sitter's page and a playdate invite, no sign-in |
| `src/app/api/` | Routes: `pets` (identify, confirm, character, legend, graph), `quest` and `share` (a photo becomes a card), `pack`, `ask`, `cards`, `place`, `shares`, `s`/`p` (links), `admin` |
| `src/lib/meta.ts` | Every call to the Meta Model API, and the prompts |
| `src/lib/ask.ts`, `src/lib/memory.ts` | The pet's context from its cards, the evidence check, clarity levels and senses |
| `src/lib/painter.ts`, `src/lib/points.ts` | Painting in the background, the pool a pack opens from, Memory Points |
| `src/lib/character.ts`, `src/lib/moves.ts` | The 3D character, moods, the walk, move cards |
| `src/lib/place.ts`, `src/lib/rules.ts` | Open-Meteo weather and air, Overpass pet places, the sourced rules |
| `src/lib/shares.ts` | Links and what they may show |
| `src/lib/prepare.ts` | In-browser photo preparation: HEIC, EXIF date, face blur |
| `src/lib/i18n.ts`, `src/lib/ui.tsx`, `src/lib/zh.ts` | Languages |
| `src/components/HoloCard.tsx` | The card: tilt, light, finishes, depth layers |
| `src/components/MemoryGraph.tsx` | The memory graph |
| `docs/CONCEPT.md`, `docs/DESIGN.md` | The idea and the design notes |
| `docs/video/` | How the videos were recorded and cut |
| `modal/sam.py` | SAM 3 on Modal |
| `scripts/` | Probes and tools used while building |

## Stack

Next.js 16, React 19, Tailwind CSS 4, TypeScript, Supabase, sharp, `@meta-sam/parser`, MediaPipe Tasks Vision, exifr, heic2any. Deployed on Vercel.

## Built by

Elodie Hao Liu, with Claude Code as pair programmer.
