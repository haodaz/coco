# coco — design notes

An AI for each owner that knows their one pet — dog, cat, bird or something more exotic. Every pet gets a stable profile and long-term memory, and the AI only talks about that animal. First user: Coco, a Labrador born 2022-05-03.

Hackathon: Meta Global AI Developer Hackathon, Indie track, "Build for Your World". Building Oct 26 – Nov 4, 2026 (submit by Nov 4, 9 PM ET). Public repo, 3-minute video.

## Principle: trade for information in ways that are good for the owner (Elodie, 2026-10-26)

- Every piece of information pays back at once: a photo lights up a card, not a form that pays off at the end.
- Ask only when the answer makes the portrait or the cards better.
- Corrections are rewarded: an owner fix becomes a confirmed trait and can make the next card rare.
- Take as little as possible: no faces stored, places summarised as "usual places", privacy is never the price.

## Core idea: a digital twin with a soul, built from traces (Elodie, 2026-10-26)

Digital twins of people collect thoughts and personality; twins of institutions personify data. Pet twins today only copy how the animal looks. Nobody models the soul.

We cannot ask a pet what it thinks, so we judge by deeds, not by guessing the heart (论迹不论心): from what the pet does, infer who the pet is, then let the twin make the choices, show the preferences and, if it could talk, say what this particular animal would say. Every trait points to its evidence.

### Three layers

1. **Trace ledger (what it did).** Every observation with source and time.
   - Photos: SAM 3.1 isolates the pet; Muse Spark reads where it is (sofa, window, park), what it is doing (sleeping, playing, guarding, eating), who is with it (owner, baby, other animals), what is around it (a toy, a bowl). Capture time gives routines.
   - Owner's voice and text notes ("thunder today, she stayed glued to me", "stole a sock again").
   - Occasional small questions to the owner ("is the blue ball in these photos her favourite?").
2. **Traits (who it is).** Each trait is a statement with evidence, count, first and last seen, and confidence:
   likes (food, toys, spots) · habits (sleep times and places, walk routes) · skills and tricks · relationships (owner, baby, other animals) · reactions to situations (thunder, vet, car rides, strangers) · places.
   Example: "Loves the window sofa — 14 photos, mostly around 3 PM, last on Oct 20." Thin evidence is marked "maybe"; new evidence that contradicts a trait triggers a question to the owner; traits not seen for a long time fade (decaying memory).
3. **The twin (what it would do).**
   - "What would Coco do?" — given a situation (a courier at the door, a ball vs a treat), predict the reaction and show why.
   - "If Coco could talk" — a first-person line or diary for the day's card, only about things that left traces; anything imagined is marked as such.
   - Always an interpretation, never mind-reading: every answer has a "why I think so" with the evidence.

### Imprints: every card is a memory the AI keeps (Elodie, 2026-10-26)

Like a deck you build up and slot cards into: each card is an **Imprint**, one moment of this pet that the AI keeps as memory. (In animal behaviour, imprinting is how a young animal learns who its own are; here the AI learns who its pet is.) The AI's context is its imprints. The more it holds, the clearer the pet becomes.

**What the AI starts with (before any imprint).** The profile (species, breed, sex, age) and general knowledge: the species pack, breed traits, basic care. Its first answers are about "a black Labrador", not yet about Coco.

**What one imprint holds.**
- The card (photo, painting, name, the pet's line).
- **The owner's words.** After a card turns over, the owner can say or type a sentence about the moment: "she always does this when the doorbell rings", "first night home, she was eight weeks old". One sentence carries what no photo shows: before and after, who, why, how often. Voice goes through Muse Voice Transcribe.
- Traces taken from both photo and words, each marked with where it came from (photo, owner). The owner's words count as stronger evidence than the model's reading of a photo.
- When the photo was taken, so imprints spread across real days of the pet's life.

**Training the AI to know what a card is worth.** The owner's sentence is also feedback: what the model saw versus what the owner says actually matters in this moment. Over time the AI learns which details carry meaning for this pet (the sock, not the floor).

**Clarity: you can see how well the AI knows your pet.** The AI's picture of the pet is shown at the resolution it has earned.
- No imprints: a two-colour mosaic, a few blocks. Only "a black dog".
- A first set of cards: a coarse 8-bit portrait; the shape of a dog.
- About a month of imprints: a pixel portrait where you can see this dog's own features.
- After that, the pixels keep getting finer, up to the full painting.

Packs: the photo quest is the **starter pack** (10 cards at once). After that, a **daily booster pack** of up to 3 cards. Pacing: a full starter pack with notes reaches the outline of the pet; about 10 days of boosters, a coarse portrait; about a month, its own features; then two, three and five months for the finest levels.

Clarity is earned, not timed: it grows with the number of imprints, how many different kinds of moment they cover (sleep, food, play, walks, people…), how many different days they come from, and whether the owner added words. Honest by construction: the portrait itself is the AI's idea of the pet. At low clarity it is painted from the profile alone (a generic black Lab). Each time clarity rises, it is repainted from the imprints and traits, then shown at the new resolution. So the picture literally becomes Coco as the AI learns her.

**Slotting cards unlocks what the twin can do.** Each kind of imprint opens one sense of the twin: sleep cards → it knows her spots and routine; walk cards → it can talk about walks; car cards → it can speak up about trips ("leave me in the passenger seat"); people and animals → it knows how she meets others. A sense with no imprints stays dark, and the twin says it does not know yet instead of making it up. Every answer names the imprints it rests on.

### Knowledge: smarter than a dog, still true to this dog (Elodie, 2026-10-26)

The soul comes from the pet's own traces; the knowledge comes from real rules. The twin speaks up for the pet, with both.

Example, when the owner says "going to the store this afternoon":
> "Don't take me in — I'm not a service dog and they don't allow pets. Leave me in the car; I like waiting in the passenger seat."

- "I like the passenger seat" ← **traces** (photos in the car, owner notes)
- "I'm not a service dog, not allowed" ← **knowledge**: this pet's credential status + the place's pet policy + the rules
- "Leave me in the car" ← **advice** combining both, then a **safety check outside the model** before it is said:
  - mild weather, short stop: "It's 15°C, I'm fine in the passenger seat — crack a window."
  - hot or cold: "It's 30°C, the car turns into an oven. Drop me home first, or go to the shop next door that lets dogs in."
  - every line has a "why": quoted rule, today's weather, the trait's evidence.

Same knowledge, different pet, different answer. A service dog's twin says: "I can come in with you — I'm your service dog, bring my vest. An emotional-support animal alone would not get in." This is the per-pet value in one line.

Knowledge sources: official rules quoted and checked against the page (ADA service-animal definition, DOT air travel, FHA housing, state hot-car laws), the destination's pet policy, today's weather. The twin speaks up when the owner mentions a plan.

### Care in the pet's own voice, for any species (Elodie, 2026-10-26)

"I don't want to go to the vet, but my vaccine runs out soon — please sort it out."
= **temperament** (from traces: dislikes the vet) + **what is due** (from records and the species care calendar) + **said in its voice**.

Three things change per species:

1. **Care calendar** (knowledge pack):

| Species | Recurring care (examples) | In its voice |
|---|---|---|
| Dog | rabies and core vaccines expiring, deworming, nails, licence renewal | "I'm not a fan of the vet, but my rabies shot expires Nov 20 — take me?" |
| Cat | vaccines, deworming, litter, shedding season | "Shedding season again. Brush me this week?" |
| Bird | nail trims, UV bulb replacement, yearly check | "My UV light is almost six months old — time for a new one." |
| Fish | water changes, filter media, water tests | "Ten days since the last water change. It feels stuffy in here." |
| Turtle | UVB bulb every ~6 months, pre-brumation prep, water quality | "It's getting cold. Should we talk about this winter's brumation?" |
| Snake | feeding interval, shedding, temperature and humidity | "I'm about to shed — skip feeding for a few days and bump the humidity." |

2. **Trace vocabulary**: what is worth noticing differs (a dog's sleep spots and walk routes; a fish's feeding response and favourite plant; a snake's shed cycle and hide; a turtle's basking times). Muse Spark looks at photos through the species' lens.
3. **Voice**: personality comes from traces, not species stereotypes (a clingy cat talks clingy).

**Rule: reminders must have a source.**
- Due dates come from the pet's own records (e.g. a vet certificate read by Muse Spark: "rabies valid to 2026-11-20"); dates are computed in code, never guessed by the model.
- General intervals ("UVB bulbs are usually replaced every six months") come from the species pack, with the source and "confirm with your vet".
- The AI never recommends a vaccine, a drug or a dose. It remembers, counts days, and reminds in the pet's voice.

### Where the pet speaks up (scope)

The twin speaks for itself across the pet's whole life; care reminders are one case.

| Situation | What it says (example) | Based on |
|---|---|---|
| Going out, entering places | "They don't allow me in. I'll wait in the passenger seat." | credential status, venue policy, weather, safety check |
| Trips | "I get carsick — stop every two hours. This hotel takes dogs, $50 extra." | traces (carsick), airline and hotel rules |
| Moving, renting | "The new place allows two pets under 25 kg — I fit. Check the pet clause." | weight records, landlord rules, housing law |
| Seasons and holidays | "Fireworks on July 4th — I hide under the bed. Close the curtains early." | traces (loud noises), calendar |
| Owner away, sitter takes over | auto-written handover: meals, sleep spot, triggers, what calms it | all traces and records |
| Before a vet visit | a visit summary: recent weight, last vaccines, changes the owner noted — records only, no diagnosis | records |
| Supplies | "Food lasts five more days. Same bag as last time?" | usage records (inventory, not nutrition advice) |
| Spending | "You spent $230 on me this month — grooming was the extra." | expense records |
| Paperwork | "My licence expires in December; the microchip still has your old phone number." | document records |
| Lost pet | instant poster: recognisable features + "won't always come to its name, always comes to the treat bag" | appearance, traces |
| New family member | new baby or pet: "Let me sniff the baby's blanket first." | traces (reaction to new things), what the owner chose to record |
| Anniversaries | birthday, adoption day, "1,000 days with you", with a special card | records, daily cards |

Mechanism: a trigger (a due date, the weather, a plan the owner mentions, a record nearing expiry) → the twin combines its traces with the relevant knowledge → checks outside the model (dates, safety, quoted rules) → says it in the pet's voice, with "why". An agent that acts, not a chatbot that waits.

### Species as data

Each species is a knowledge pack: care calendar, trace vocabulary, safety rules. Adding a species is adding data, not code.

MVP: dogs and cats in full (most owners, and Coco); then birds (parrots), reptiles (turtles, snakes, lizards), small mammals (rabbits, hamsters, guinea pigs), fish (care calendar mainly).
Demo: Coco is the main story; a few seconds with someone else's turtle or parrot show one photo → species recognised → a different knowledge pack and voice.

### Boundaries

- Behaviour only, no emotional or psychological diagnosis ("stays close to me during thunder", never "has anxiety").
- Locations are summarised as "usual places", never shown as addresses.

### What the 9-day build shows

Upload 20–50 photos → traces mined automatically → trait cards with evidence → "What would Coco do?" → the daily card carries a line in Coco's voice. A multi-step agent (mine, generalise, ask on contradictions, predict), using SAM 3.1, Muse Spark vision, Voice Transcribe and Muse Image.

## Boundaries (from the anti-project list)

- No medical advice, no nutrition coaching, no mental-health framing. The AI keeps records, shows what changed, and says "worth asking your vet" with the record ready. It never diagnoses or prescribes.
- Not a basic RAG chatbot and not a simple image analyzer: the core is a per-pet agent with memory, records, a photo timeline and multi-step tasks.

## Onboarding: one photo, then a photo quest, then the first portrait (Elodie, 2026-10-26)

**Step 1 — one photo, recognise it.** SAM 3.1 cuts the pet out (avatar; people are not kept; several animals → the owner taps one). Muse Spark returns species, breed candidates with confidence, coat and visible marks — appearance only, no health judgement. The owner corrects and adds name, birthday, sex, credential status.

**Step 2 — the photo quest (about 10 photos, list depends on species).** Every slot says what to shoot and why; important categories get more slots. Dog example:

| Slot | What to shoot | What it tells us |
|---|---|---|
| 1–2 | Sleeping, ideally two different places | favourite spots, routine |
| 3 | Eating or getting a treat | how it eats, preferences |
| 4 | Favourite toy, or playing | what it plays with |
| 5–6 | With you | relationship, how close it stays |
| 7 | Out on a walk | usual places, mood outside |
| 8 | In the car or a carrier | travel habits |
| 9 | With other people or animals | social side |
| 10 | Its strangest habit | what is only this pet |

Cats swap in window perch, hiding spot, grooming; turtles and snakes swap in enclosure, basking, feeding, hide, handling.

Reality check (Elodie, 2026-10-26): animals do not pose on request, especially big dogs. So the quest asks for photos the owner **already has** ("any photo of her sleeping"), every slot can be skipped or filled later, and a batch upload from the album is sorted into slots automatically. Never "go take this photo now".

**Step 3 — the first portrait.**
- A basic analysis card: appearance plus the 3–5 most certain traits, each with thumbnail evidence and a confidence level.
- A report in three parts: what we know, what we're not sure about, what we'd like to ask you ("a blue ball shows up in four photos — her favourite?").

**Then: correct, add photos, the portrait sharpens.**
- An owner correction becomes an owner-confirmed trait and wins over inference.
- The system proposes the next photo quest from the gaps ("never seen her in the car — have one?").
- A "soul completeness" meter by category (habits 80%, social 40%) invites more photos.
- Later, bulk upload (a whole album) is sorted into slots automatically.
- Photos with the owner are used for the relationship only; faces are not stored, only the pet cutout.

Demo flow: one photo → ten-photo quest → portrait appears → owner fixes one trait → adds one photo → portrait changes.

### The quest is a card set (rewards, Elodie 2026-10-26)

The ten slots are ten face-down cards, each with its own back pattern by category (sleep: moon and stars; eating: bowl and bone; play: ball trails; with you: overlapping paw-hearts; walk: a path of prints; car: window and wind; social: linked circles; strangest habit: a hidden card with question marks). Each upload flips one card.

Card anatomy:
- Top: card name chosen from the scene ("Window Guardian", "Snow Sprinter"), rarity stars, category icon.
- Art: Muse Image re-creation in a style tied to the category (night watercolour for sleep, picture book for walks, holo for play…), with the pet from the SAM cutout so it never drifts.
- A line in the pet's voice ("The 3 PM sun is mine.").
- Observation: the trace read from this photo ("likes the window sofa").
- Footer: original photo thumbnail and capture date; the back of the card shows the original photo.

Reward rhythm:
1. Every card is a small surprise (style and name unknown until flipped).
2. Complete the ten: the first soul portrait unlocks with a full-art legendary holo card combining the most typical traits ("Coco, guardian of the window, devotee of the treat bag").
3. Season two: gaps in the portrait become a new set ("Travel", "Holidays").
4. The nightly blind-box cards keep the album growing for life.
5. Rarity has reasons: owner-confirmed traits, rare scenes (first snow), special days.

Collectible quality: frames, textures and text are drawn in code (crisp, no garbled text); the model only paints the art. Each card can be shared on its own (X → Most Viral).

## Meta tooling (planned)

| Model | Use |
|---|---|
| SAM 3.1 | Cut the pet out of every photo; avatar; same-pet check; timeline |
| Muse Spark 1.3 | Species and breed from the photo; turn notes, documents and voice into records; the agent's reasoning and tool calls; structured output |
| Muse Voice Transcribe | One-handed voice notes ("Coco only walked 15 minutes today") |
| Muse Image | Memory cards / timeline covers |
| Muse Spark Open / Muse Glimmer (Baseten, Modal, Fireworks) | Background memory consolidation; open-weight path |

API: `https://api.meta.ai/v1`, Bearer `MODEL_API_KEY` (in `.env.local`, git-ignored). No paid calls until the $150 hackathon credits show under Billing → Free credits.

## Daily card: one collectible card per day (idea from Elodie, 2026-10-26)

Every evening the day becomes a card, like a trading card or a blind-box figure, and no two days look the same.

1. **Material**: the day's photo, with the pet cut out by **SAM 3.1**, plus the day's records ("40-minute walk", "first snow", "new park").
2. **Art**: **Muse Image** re-draws the scene in a style that changes every day (holo, watercolour, pixel, ukiyo-e, picture book…), chosen from the date and what happened.
3. **Still the same animal**: the SAM cutout is the anchor; the model re-draws background, style and effects around it, or uses the cutout as a reference image. To test on the API.
4. **Card face**: name, date, a "move of the day" ("Snow Sprint"), small stats taken only from the owner's records (walk minutes, new friends). Nothing inferred about health.
5. **Rarity**: birthdays, firsts and new places give rare or holo cards; ordinary days give common cards.
6. **Blind box**: the card arrives face down; tap to flip; it goes into the album, which is also the timeline.

Why it matters: it is the emotional core (a lifelong album of one animal), it uses SAM 3.1 + Muse Image together (Best Creative Build), and cards are made to be shared (Most Viral).
Cost: one image per day; measure Muse Image pricing once credits arrive.

## Open questions

- Product name (team name "coco" for now).
- Stack: Next.js + Vercel as in earlier projects, unless the kickoff suggests otherwise.
