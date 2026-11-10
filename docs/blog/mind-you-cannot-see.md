---
title: How do you model a mind you can never see?
published: false
description: A black Labrador, a counting horse, four old ideas, and the rules I wrote so an AI would stop making things up about my dog.
tags: ai, llm, design, showdev
cover_image: https://www.cocoverse.app/landing/legend.jpg
---

> **A black Labrador, a counting horse, four old ideas, and the rules I wrote so an AI would stop making things up about my dog.**

My dog Coco, a black Labrador, likes to lie on the sofa by the window in the afternoon. I would love to know what she is thinking there. Is she guarding the house? Waiting for someone? Just warm?

Any chatbot will tell me. Ask one "what is my dog thinking?" and you get a confident little paragraph: she feels safe, she is watching over her family, she loves you very much. It sounds lovely, and none of it rests on anything.

That is the problem I ran into when I built [cocoverse](https://www.cocoverse.app), an app where each pet gets its own AI. I didn't want an AI that guesses well. I wanted one that knows what it can't know. This post is about how I tried to get there. It turns out people have been working on this problem for more than a hundred years. Most of what I needed was already worked out. My job was to turn it into code.

## The problem is old

**We can't get inside.** In 1974 the philosopher Thomas Nagel asked "What is it like to be a bat?" His answer was that we can describe everything a bat does and still not know what it is like to be one. Its experience happens from a point of view we don't have. A dog is closer to us than a bat, but the gap is the same kind of gap. Coco will never tell me what the window means to her.

**We fool ourselves easily.** In the early 1900s a horse in Berlin called Clever Hans seemed to do arithmetic. He tapped out answers with his hoof, and crowds and even some experts believed it. In 1907 the psychologist Oskar Pfungst showed what was really going on. Hans was reading tiny, unconscious changes in the questioner's posture and face, and stopped tapping when they relaxed. The horse was clever, just not in the way people wanted to believe. The mistake was on the human side: people saw a mind they were hoping to see.

A language model asked about your pet is Clever Hans turned around. Now it is the model reading *your* cues. You obviously love this dog, so it tells you the dog loves you back. It gives you the mind you are hoping for.

## Four ideas people already worked out

When I looked for help, I found four ideas from very different fields that all point the same way.

**1. Don't reach for a bigger explanation than you need.** In 1894 the psychologist C. Lloyd Morgan wrote what is now called Morgan's Canon: don't explain an animal's behaviour with a higher mental ability if a simpler one explains it. A dog by the door at six may be waiting for you, or may have learned that six is when food happens. The canon says: start with the simpler one.

**2. Watch what they choose.** In 1938 the economist Paul Samuelson proposed revealed preference. Instead of asking people what they want, look at what they actually pick. A dog can't fill in a survey, but it chooses all day long: this spot, this toy, this person to sit next to.

**3. Talking as if it has a mind is a tool.** The philosopher Daniel Dennett called it the intentional stance (1987). We predict a chess program, a cat or a neighbour by treating them as if they have beliefs and wants. It works, and it is a useful model, not a claim about what is really inside. So an AI can say "I like the window" in the dog's voice, as long as everyone knows that is a model talking.

**4. Judge by deeds.** Chinese has a short phrase for all of this: 论迹不论心, roughly "judge by the traces, not the heart". You can't see the heart. You can see what someone did.

Put together, they make a fairly strict rule for an AI that talks about a pet: **say only what the traces support, in the simplest terms that fit, and mark everything else as a guess.**

![Four ideas from four fields, one rule](https://www.cocoverse.app/blog/mind/1-four-ideas.png)

## Turning the ideas into rules in code

Here is how that rule shows up in cocoverse. I'll start with the shape of the system and then go through the parts that mattered most.

### Three layers: what it did, who it is, what it would do

Everything the AI knows about a pet lives in three layers:

1. **Traces: what it did.** Each photo the owner shares becomes a Memory Print: what is in the picture (where the pet is, what it is doing, who and what is around), when it was taken, and the owner's own sentence about the moment. Every observation keeps a note of where it came from.
2. **The memory graph: who it is.** The model turns the prints into short links, from the pet's side: Coco sleeps on the sofa, waits for you, plays with a gray toy. Each link has to name the cards that show it, and code drops any link whose cards don't exist. The prompt also says: only what the memories show, never anything inferred from the breed.
3. **The voice: what it would say.** Only this layer speaks, in the pet's own voice, and every answer comes with the cards it rests on.

General knowledge about dogs or Labradors sits outside all three. The AI may say "Labradors often love water", but it can't turn that into "Coco loves water" without a card of Coco in water.

![Three layers, and what stays outside](https://www.cocoverse.app/blog/mind/2-three-layers.png)

![A Memory Print: a real moment, painted as a card](https://www.cocoverse.app/landing/memory-print.jpg)

### Evidence has to exist, and code checks it

When the pet answers a question, the model has to list the cards it used, with a few words on how each one supports the answer. Models are fluent liars about sources, so I don't take its word for it:

```ts
// keep only cards that exist; the model may not invent evidence
const basis = answer.basis.filter((b) => cards.some((c) => c.id === b.cardId));
```

![Evidence has to exist](https://www.cocoverse.app/blog/mind/3-evidence-check.png)

One line, but it changes what the answer is. A claim with no surviving evidence stands without support, and the app shows it that way: under every answer there is a "What I did" note that lists the moments it looked through, the cards it cited and the gaps it found.

### Simple words for behaviour, no diagnoses

This is Morgan's Canon written as a product rule. The design notes put it in one line: behaviour only, no emotional or psychological diagnosis. "Stays close to me during thunder" is a trace. "Has anxiety" is a diagnosis it has no right to make. The memory graph is held to plain verbs from the pet's side (sleeps on, waits for, is calm near), and on health, food amounts, medicine or training the pet doesn't guess at all: it says, kindly and in its own voice, that a vet is the one to ask.

### Some senses stay dark

Memory Prints are sorted by the kind of moment they hold: sleep, food, play, walks, trips, other animals, and so on. Each kind is one "sense" of the twin. If there are no walk cards, the walk sense is dark, and when you ask about walks the pet says it hasn't seen any yet and offers to take a photo. It doesn't fill the gap with what Labradors usually do.

I like this one most, because "I don't know" turns into an invitation instead of a dead end. The gap tells the owner which memory to share next.

![No cards, no claims: some senses stay dark](https://www.cocoverse.app/blog/mind/5-dark-senses.png)

### Confidence you can see

How well does the AI know this pet? I didn't want a percentage. Instead, the app shows the AI's own picture of the pet at the resolution it has earned.

With no memories it is a two-colour mosaic, a few blocks: "a black dog". As memories come in, the portrait is repainted from them and shown at a finer grid with more colours, until it becomes a full painting.

The points behind it are deliberately simple, and they reward breadth, not just volume:

```ts
// each imprint 1, each new kind of moment 2, each different day of the pet's life 1, each owner's note 2
export const POINTS = { imprint: 1, kind: 2, day: 1, note: 2 } as const;
```

Ten photos of the same nap on the same afternoon tell you one thing: the dog sleeps. They are worth 13 points. Ten different kinds of moment from ten different days, each with a sentence from the owner, are worth 60, and the portrait gets visibly sharper. The level never goes up just because time passes. It is earned from traces only.

![Variety earns more than volume](https://www.cocoverse.app/blog/mind/4-clarity-points.png)

### Some truths are only true for now

Coco picks a new favourite toy about every three months. I know this; the AI doesn't, unless I say so. The design answer is that a Memory Print can carry a time span: for things like favourites, the AI says "right now", lets the print fade as it ages, and after about that span asks whether anything has changed instead of repeating an old favourite as fact.

I have to be honest here: that part is designed but not built yet. Today every print counts the same no matter how old it is. Revealed preference has the same catch, and economists know it well: what someone chose last season tells you less about this one.

### The owner's words count most, and that is a risk too

A photo shows a moment. The owner's sentence carries what no photo can: before and after, how often, why it matters. "She always does this when the doorbell rings." So the owner's words outrank the model's reading of a photo. The owner is the only observer who has been there for years.

That rule bit me during the build. To test voice transcription, I recorded a made-up note about a gray toy Coco had "loved since she was a puppy" and forgot to delete it. Because it was stored as the owner's words, the strongest evidence in the system, it spread everywhere: into her answers, onto her legendary card, even onto the landing page. The truth was smaller. The gray toy is her favourite *for now*.

![Who outranks whom, and how it broke](https://www.cocoverse.app/blog/mind/6-trust-ladder.png)

It was a good lesson about evidence systems. The channel you trust most is the one that does the most damage when it is wrong. Since then, tests run on a copy, and nothing is ever written in the owner's voice except by the owner.

### Even the pictures are interpretations

The cards follow the same principle. Each card is a new painting, not a filter over the photo. The model uses the photo only to learn what this animal looks like (coat, markings, eyes, ears), then paints a new scene in a style drawn from a pool: picture book, watercolour, pixel art, woodblock print, tarot and others.

![One of the styles: a woodblock print](https://www.cocoverse.app/landing/styles/ukiyo-e.jpg)

So the card never pretends to be the moment. It is clearly a reading of it, and the original photo sits on the back. Human faces are blurred on the owner's device before a photo leaves it, and any people in a scene are painted as simple cartoon figures, never recovered.

## Where it still falls short

I want to be honest about the limits, since that is the whole point of the post.

- **Citing a card is not the same as the card supporting the claim.** Code checks that the cited card exists. It doesn't check that the card really says what the answer claims. That part is still the model's judgement.
- **The owner is a biased observer too.** I adore my dog. When I add a note, I'm also seeing the mind I hope for. The system trusts me most, and I am Clever Hans's audience.
- **Old memories don't fade yet.** The "true for now" idea above is still a design. Until it's built, a favourite from two years ago weighs as much as one from last week.
- **The points are a guess.** Why is a new kind of moment worth two points and a new day one? Because it felt right while testing. A better version would learn which traces actually predict what the owner later confirms.
- **The voice is still a stance.** When the twin says "the 3 PM sun is mine", that is the intentional stance doing its job, and it is very easy to forget that it is a model talking. The app marks it as interpretation, but the pull to believe it is strong. I feel it too.

## This isn't really about pets

Pets made the problem easy to see, because nobody pretends a dog can explain itself. But the same problem appears whenever we try to understand any mind from outside: a baby who can't talk yet, a colleague whose work we only see as finished output, a user we only know through clicks. In each case the temptation is the same: let a fluent model fill in the inner life, because the story is nicer than the gap.

The rules that worked for Coco seem to carry over:

1. Keep the traces, with where and when they came from.
2. Say only what the traces support, in the simplest words that fit.
3. Make confidence visible, and earn it from variety, not volume.
4. Let some truths expire.
5. Treat "I don't know" as an invitation to look closer.

Back at the window: I don't know what Coco is thinking there, and the AI doesn't either. What it can say is that it has seen her there on several afternoons, and which cards show it. Why she goes there is still a question only she could answer, and I'm fine with that.

---

*cocoverse is live at [cocoverse.app](https://www.cocoverse.app). The code is at [github.com/haodaz/coco](https://github.com/haodaz/coco), and there is a [3-minute demo](https://youtu.be/628PXRkQE8c). I built it in ten days for the Meta Global AI Developer Hackathon.*

## References

- Nagel, T. (1974). What is it like to be a bat? *The Philosophical Review*, 83(4), 435–450. [doi:10.2307/2183914](https://doi.org/10.2307/2183914)
- Pfungst, O. (1907). *Das Pferd des Herrn von Osten (Der Kluge Hans)*. English translation by C. L. Rahn: *Clever Hans (The Horse of Mr. von Osten)*, Henry Holt, 1911. [Free on Project Gutenberg](https://www.gutenberg.org/ebooks/33936)
- Morgan, C. L. (1894). *An Introduction to Comparative Psychology*. Walter Scott, London.
- Samuelson, P. A. (1938). A note on the pure theory of consumer's behaviour. *Economica*, 5(17), 61–71. [doi:10.2307/2548836](https://doi.org/10.2307/2548836)
- Dennett, D. C. (1987). *The Intentional Stance*. MIT Press.
