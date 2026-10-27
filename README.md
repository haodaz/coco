# coco

**cocoverse — a little universe for you and your pet.** co- means together, as in *companion*, the one you share your bread with: coco is the two of you, you and them; verse, as in universe, is everything you share. Say it fast and it sounds like *converse*: here, your pet talks back.

An AI for each owner that knows their one pet. Dog, cat, bird, turtle, anything. It learns who *this* animal is from the photos you already have, keeps every moment as a collectible card, and talks back as your pet, only about what it has actually seen.

Built for the **Meta Global AI Developer Hackathon** (Indie track, *Build for Your World*), Oct 26 – Nov 4, 2026. All code in this repository was written during the hackathon (see the commit history). First user: Coco, a black Labrador.

---

## The idea in one loop

```
photos you already have ──► cards (Imprints) ──► the AI's memory of your pet
        ▲                                                │
        │                                                ▼
  "a car photo would teach me"  ◄── Ask your pet ◄── clarity: its picture of your pet sharpens
```

1. **Start with one photo.** The AI says what animal it is (species, breed guesses, coat, marks). You correct it and name your pet.
2. **Starter pack: 10 cards.** Each card asks for a kind of moment you probably already have in your album (sleeping, eating, playing, with you, out on a walk, in the car, with others, its strangest habit). Animals don't pose on request, so you pick existing photos and skip what you don't have.
3. **Every photo becomes a card.** Muse Spark reads the moment; Muse Image paints a *new* artwork of your pet in a new pose and scene (never a filter on the photo); SAM 3.1 cuts the pet out so rare cards have real depth when you tilt them.
4. **Every card is an Imprint, a memory the AI keeps.** Say or type one sentence about the moment ("she always does this when the doorbell rings") and it becomes evidence marked as yours, stronger than anything the model guessed.
5. **Clarity.** The AI's own picture of your pet is shown at the resolution it has earned: a two-colour mosaic at first, a recognisable pixel portrait after about a month, the full painting after a few months. The picture is repainted from your pet's imprints at each level, so it literally becomes your pet as the AI learns.
6. **Daily booster pack.** Up to 3 photos a day, any day of your pet's life. Each art style is a blind-box surprise (9 styles, 3 tiers).
7. **Soul portrait.** A full starter pack unlocks a legendary card: the pet reads back through all its imprints, says who it is (citing the cards), and steps out of the card's frame.
8. **Ask your pet.** Your pet, as a 3D character with moods (happy, confused, thinking, close, busy), answers in its own voice, in your language. Every claim about itself points to the cards it rests on. General breed knowledge is labelled as such. If it has no memory of something, it says so and tells you which photo would teach it.

## Meta models used

| Model | Where | What it does |
|---|---|---|
| **Muse Spark 1.3** | [`src/lib/meta.ts`](src/lib/meta.ts) | Identifies the animal; reads each photo into traces, a card name and a line in the pet's voice; reads the owner's notes; answers as the pet (structured output, image input) |
| **Muse Image 1.0** | `paintCard`, `paintLikeness`, [`src/lib/character.ts`](src/lib/character.ts) | Card art (a new painting per moment), the AI's portrait of the pet at each clarity level, the 3D character and its mood frames |
| **SAM 3.1** | `petLayer` in `src/lib/meta.ts` | Cuts the pet (with what it wears or holds) out of each painting for card depth, and out of every character frame so the character has no background |
| **Muse Spark Open** (open weights, on Baseten) | `chat` in `src/lib/meta.ts` | Answers sitters and runs the twin-to-twin playdates; either Muse Spark takes over if the other fails |
| **Muse Voice Transcribe 1.0** | `transcribe` in `src/lib/meta.ts` | Spoken notes about a card, spoken questions to the pet |

Every live call's token use is logged to `data/usage.jsonl`.

## Boundaries

- **Faces never leave your machine.** Every uploaded photo is checked on-device with Apple's Vision framework ([`tools/faces.swift`](tools/faces.swift)) and every human face is blurred before the photo is stored or sent to any model. Only the blurred copy is kept. Cards draw people as cartoon figures with invented faces.
- **No health, food-amount, medicine or training advice.** Asked about symptoms, the pet says to ask a vet, and nothing else.
- **Judge by deeds.** The pet only claims what its imprints show. A single photo can't show a habit, so card lines never say "always"; habits come from the owner's own words.
- **Evidence is checked in code.** The model can only cite cards that exist.

## Run it

Requirements: **macOS** (the face check uses Apple's Vision framework and the Swift compiler that ships with the Xcode Command Line Tools), **Node 20+**, and a Meta Model API key from [dev.meta.ai](https://dev.meta.ai).

```bash
npm install
cp .env.example .env.local
```

Put your key in `.env.local` as `MODEL_API_KEY`. Set `META_LIVE=1` to call the real API.

```bash
npm run dev
```

Open http://localhost:3000 for the landing page, or http://localhost:3000/app to start with your own pet.

- **Practice mode** (default, `META_LIVE` not 1): sample answers, nothing is sent anywhere, nothing is billed. Good for clicking through the flow.
- **Live mode**: a card takes about 20–40 s (reading, painting, depth). Bringing the character to life takes about two minutes the first time (one design, five moods, a few frames each).
- The face detector is compiled automatically on the first upload (about 10 s).
- Data stays local: `data/state.json` and `data/uploads/` (git-ignored). Delete `data/` to start over.

## Where things are

| Path | What |
|---|---|
| `src/app/page.tsx` | Landing page: the idea, the rules, how it works, species coverage, boundaries (pictures and answers are real, exported by `scripts/export-landing.mjs`) |
| `src/app/app/page.tsx` | The app: your pet as a character, and the conversation |
| `src/app/app/cards/` | The soul portrait, today's pack, the collection, the starter pack |
| `src/app/app/memory/` | Clarity, what the pet can talk about, the road from mosaic to portrait |
| `src/app/lab/` | Card finish lab (tilt, light, depth, six finishes). It uses local test art and shows empty frames on a fresh clone |
| `src/lib/meta.ts` | Every call to the Meta Model API |
| `src/lib/memory.ts` | Imprints and clarity: points, levels, senses |
| `src/lib/likeness.ts` | The AI's portrait of the pet, repainted per level and pixelated to match |
| `src/lib/ask.ts` | Builds the pet's context from its imprints and checks the evidence |
| `src/lib/character.ts` | The 3D character: design, moods, frames, cutout, ground line |
| `src/lib/faces.ts`, `tools/faces.swift` | On-device face blur |
| `src/lib/species.ts` | Species as data: each species' starter pack (dogs and cats in full; birds, reptiles, small mammals, fish and others share a general pack) |
| `src/components/HoloCard.tsx` | The card: tilt, pointer light, textures, depth layers |
| `docs/DESIGN.md` | Design notes and the reasoning behind them |
| `scripts/` | Small probes used while building (API formats, styles, frames) |

## Stack

Next.js 16, React 19, Tailwind CSS 4, TypeScript, sharp, `@meta-sam/parser` (Meta's SAM output parser), exifr, heic-convert.

## Built by

Elodie Hao Liu, with Claude Code as pair programmer.
