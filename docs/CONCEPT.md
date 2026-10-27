# coco — the concept on one page

*As of 2026-10-27. The longer reasoning lives in [DESIGN.md](DESIGN.md).*

## In one line

**A co-world for you and your pet, built from the moments you share.**
Every real moment becomes a Memory Print, kept in a card worth collecting. Your pet's AI grows only from those prints: the more you keep, the more it becomes your pet.

## The name

co- means together, as in *companion*: from Latin *com* (with) + *panis* (bread), the one you share your bread with. coco is co + co: you and them. Each owner's space is their **co-world**. Coco, a black Labrador, is simply the first pet with one.

## The story in four beats

1. **Memories are scattered.** Thousands of photos of a pet sit in a camera roll that nobody opens again.
2. **Kept as cards.** Each moment becomes a card worth collecting. The card is the vessel; what it keeps is a **Memory Print**: the photo, the day, what it shows, and the owner's own words.
3. **Grown from what really happened.** The pet's AI is not invented; it grows only from Memory Prints (judge by deeds, 论迹不论心). Its own picture of the pet sharpens from a two-colour mosaic to a real portrait as it learns.
4. **A world of your own.** Cards, portrait and a pet that talks back, moves, naps and helps: a co-world that belongs to the two of you. Built from your past together, here for what comes next.

## Principles

- **Nothing invented.** Every claim the pet makes about itself points to the cards behind it; the code rejects evidence that doesn't exist. No memory of something: it says so, and opens a way to show it.
- **Trade information for joy.** The AI needs photos and words; the owner gets cards worth keeping, a portrait that grows, a companion that talks back.
- **One pet, any species.** Species are data packs, not apps. Dogs and cats have full packs; birds, reptiles, small animals and fish share a general one.
- **Any language, any culture.** Names, memories and conversations come in the owner's own language. The app's words follow it (English and Simplified Chinese so far), everything the AI writes for people is written in it, and the AI's own notes stay in English so series and tasks work the same everywhere.
- **Some memories are true for now.** Favourites change; prints with a time span fade and the pet asks again.
- **Safety and privacy first.** Faces are blurred on the owner's device before any photo leaves it. No vet, diet, medicine or training advice. No suggestion that depends on what the AI can't see (a parked car in unknown weather).

## What exists, and why

| Feature | What it is | Why it's there |
|---|---|---|
| One photo to start | Species, breed guesses, coat and marks; the owner corrects and names the pet | Start from what the owner already has |
| Starter pack | Ten kinds of moment from the album, skippable | Lead the owner to the moments that say who the pet is; animals don't pose on request |
| Cards | Every photo painted fresh (9 blind-box styles), finishes by rarity, depth via SAM | Something worth keeping, not a filtered photo |
| Memory Prints + the owner's words | Typed or spoken; outrank the model's reading | One sentence carries what no photo shows |
| Clarity | 9 levels from mosaic to portrait, the AI's own repainted picture | Make honest progress visible |
| Daily pack | Up to 3 photos a day from any day of the pet's life; streak | A small daily ritual of remembering |
| Soul portrait | A full starter set unlocks a legend: the pet says who it is, citing cards | The first landmark of the co-world |
| The pet as a character | 3D character from its photos; a standard set of moves unlocked by clarity; a companion that hops to what you're looking at, sits by the pack, comes down when you type, naps after 20 s, reacts to a tap | Bonding: the more memories, the more alive |
| Agentic chat | The pet answers from its prints and opens things beside the conversation: cards, today's pack, the photo it's missing, clarity, a sitter or playdate link | It helps, not just talks |
| Around us | The owner picks their town (never an address); live weather and air, a parked-car check, US rules (state hot-car laws, ADA service animals, the FDA Food Code), home notes, pet places nearby from OpenStreetMap. Every fact shows its source and when it was checked | The pet speaks up about a plan with real reasons, and code does the checking, not the model |
| Sitters | A link to the twin for whoever looks after the pet; owner chooses topics; questions land in the owner's Recent | The past helping the future |
| Playmates (agent to agent) | Two twins meet first, each from its own play moments; an honest note for both owners | The social side of a co-world |
| Hosted product | Supabase per-user data and media, email/password sign-in, limits, admin review and usage | Real people can use it |

## Meta models

Muse Spark (reading moments, answering, structured output, actions), Muse Image (cards, portrait, character and its moves), SAM 3.1 (depth layers, character cut-outs), Muse Voice Transcribe (spoken notes and questions), and Muse Spark Open, the open-weights model on Baseten (sitter chats and twin-to-twin playdates, with fallback both ways).

## Next

1. The 3-minute demo video.
2. A real playdate with a second real pet (a friend's pet, filmed for the video).
3. Place, beyond the first version: rules outside the US, city leash and park rules, a check per destination.
4. Care reminders in the pet's own voice, dates only from records.
5. Moments from short videos (SAM 3.1 video tracking).
