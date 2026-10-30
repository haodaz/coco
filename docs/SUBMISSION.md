# Submission form (Meta Global AI Developer Hackathon, Cerebral Valley)

The form (cerebralvalley.ai/e/meta-ai-developer-hackathon/hackathon/submit) is one dialog, submitted once; nothing can be edited after. Fields and paste-ready answers, in the form's order. Due Nov 4, 9:00 PM ET (Nov 5, 10:00 Beijing).

## Team Name

```
coco
```

## Team Members

Elodie Hao Liu (haoz214), already listed. Solo.

## Which track are you submitting to?

Indie Developer Track

## Which problem statement did you build towards?

Build for Your World

## Most Viral Track: X post link

The pinned post on X (the hero banner post). Paste its URL.

## Project Description

```
cocoverse: a little universe for you and your pet. Live at https://www.cocoverse.app

Your pet will never tell you who they are. Pet "AI" today is either a chatbot that knows breeds, or a filter on a photo. cocoverse builds your pet's AI twin the only honest way: from what the animal actually does.

Every photo you share becomes a collectible card, a Memory Print. Muse Spark reads the moment into short notes and a line in the pet's voice; Muse Image paints a new picture of your pet in that moment, in a blind-box style; SAM 3.1 cuts the pet out so rare cards have real depth. You add the story the photo can't show, and your words outrank anything the model guessed.

The twin grows only from those cards. It answers as your pet, in your language, and names the cards each answer rests on. Asked about something it has never been shown, it says so and suggests the photo that would teach it. It never makes a memory up: an answer can only cite cards that exist, a single photo never becomes a habit, and general breed knowledge is labelled as such. Under every answer it shows what it did: how many moments it looked through, what it checked, which cards it cited.

Around it, a small world: Memory Points and daily packs; series that follow who your pet is; a portrait that sharpens from a mosaic to a painting as evidence grows; a memory graph of everything it knows, every link resting on real cards; a 3D character of your pet that walks over and reacts. Around us checks today's weather, whether a parked car is safe right now, and the local rules with their sources, so when you ask your pet along to the shop it checks first. Friends: a sitter can talk to the twin through a link, and before two pets meet, their twins meet first (agent to agent) and both owners get one honest note.

Faces are blurred on the device before anything is uploaded. No health, food-amount, medicine or training advice. Any pet. Everything in the repository was written during the hackathon; Coco is a real dog, Biscuit and Mochi are demo pets whose photos were made with Muse Image.
```

## Public GitHub Repository

```
https://github.com/haodaz/coco
```

## 3-Minute Demo Video

```
https://youtu.be/m3XgR4j48NY
```

(`cocoverse_submission_v1.mp4`, 2:57, unlisted; make it public once the submission is in.)

## Describe your use of Meta products to build the submitted project

```
Muse Spark 1.3 (Meta Model API, structured output with image input): identifies the animal from one photo; reads every photo into traces, a card name and a line in the pet's voice; reads the owner's words; answers as the pet with cited cards, a gap when it has none, and the panel to open; writes the soul portrait; is told the place facts we checked in code and must cite them by id.

Muse Image 1.0: a new painting for every card (nine blind-box styles), the pet's portrait at each clarity level, the 3D character and its moods and walk frames, the clean scene behind rare cards, the landing hero, and the demo pets' photos.

SAM 3.1: cuts the pet, with what it wears and holds, out of each painting (card depth: the pet moves in front of the scene) and out of every character frame.

Muse Spark Open (open weights, meta-models/muse-spark-open-1026 on Baseten): answers sitters, runs the twin-to-twin playdates and builds the memory graph; the page says so when it did; either Spark takes over if the other fails. SAM 3 (open weights) also runs on Modal (modal/sam.py) as a self-hosted alternative, tested, not wired in.

Muse Voice Transcribe 1.0: spoken questions to the pet and spoken stories about a card.

Every live call's token use is logged and shown on the admin page.
```

## Why are Meta's models important to your solution?

```
The whole product rests on one rule: the AI may only claim what the photos show. That needs a model that can look at a photo and return structured, checkable evidence, not prose. Muse Spark's image input plus strict JSON output gives us traces with sources, card citations we verify in code, and a "gap" when there is nothing to cite. Muse Image makes every card a new painting of this pet in this moment, so the collection is art, not filters. SAM 3.1 turns those paintings into layers, which is what makes the cards and the character feel alive. Muse Spark Open lets the social features (sitters, playdates, the graph) run on open weights, with the hosted API as the fallback. One family of models covers reading, painting, cutting and talking, so the loop from photo to memory to answer stays consistent.
```

## Provide feedback from your experience using partner technologies

```
Baseten: Muse Spark Open with json_schema output worked first try and answers in about a second; the model id note (muse-spark-open-1026) in the guide saved us time. Modal: SAM 3 runs on CPU in about 13 s warm; a payment method is required for GPUs even with credits, and the first container needed torchvision added by hand. Fireworks: not used.
```

## Survey (required radios; suggested answers)

- How likely are you to build with Meta Model API? Very likely
- Overall opinion of Meta Model API? Very favorable
- Consent checkbox: tick
- Recommend Meta Model API (0–5): 5
- Recommend Muse Code (0–5): 3 (not used much)
- Biggest obstacle: Errors (occasional 500s on images/edits; we retry and paint in the background)
- Compared with other models: Somewhat better (image input + strict JSON in one call)
- What matters most: Quality of the answers and code
- Hardest to switch: Our product is tuned to our current model's behavior and prompts
- What would stop production use: Price or unpredictable costs (image generation per card)

## Before pressing Submit

- Repo public, README current, last commit pushed.
- Video link opens in a private window.
- X post link is the pinned post.
- Read the whole dialog once more; it cannot be edited after.
