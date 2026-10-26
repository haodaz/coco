# coco

An AI for each owner that knows their one pet — dog, cat, bird or something more exotic. Every pet gets a stable profile and long-term memory, built from what the pet actually does, and the AI only talks about that animal.

Built for the Meta Global AI Developer Hackathon (Indie track, Build for Your World), Oct 26 – Nov 4, 2026. All code in this repository was written during the hackathon.

- Design notes: [`docs/DESIGN.md`](docs/DESIGN.md)
- Stack: Next.js 16, React 19, Tailwind 4, TypeScript; Meta Model API (Muse Spark, SAM 3.1, Muse Voice Transcribe, Muse Image)

## Run

```bash
npm install
cp .env.example .env.local   # add MODEL_API_KEY; set META_LIVE=1 to call the real API
npm run dev
```

Without `META_LIVE=1` the app runs in practice mode: AI answers are samples and nothing is sent to the API.
