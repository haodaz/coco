// Art styles for card faces. Every card is a new painting of the pet (new pose, new scene),
// never a filter over the photo. Quest cards use their slot's style; the daily blind box draws from this pool.

export type ArtStyle = { id: string; label: string; prompt: string; tier: 1 | 2 | 3 };

export const ART_STYLES: ArtStyle[] = [
  { id: "storybook", label: "Picture book", tier: 1, prompt: "a children's picture book page in warm gouache, cosy everyday scene" },
  { id: "watercolour", label: "Night watercolour", tier: 1, prompt: "a soft watercolour painting with dreamy washes and paper texture" },
  { id: "pixel", label: "Pixel art", tier: 1, prompt: "16-bit pixel art, retro game sprite style, crisp pixels" },
  { id: "papercut", label: "Paper cut", tier: 1, prompt: "layered paper-cut art with soft shadows between the paper layers" },
  { id: "naturalist", label: "Field guide", tier: 2, prompt: "a vintage naturalist field-guide plate, careful pencil and watercolour study, labels left blank" },
  { id: "ukiyo-e", label: "Woodblock print", tier: 2, prompt: "a Japanese ukiyo-e woodblock print, flat colour, bold outlines, paper texture" },
  { id: "vinyl-toy", label: "Blind-box figure", tier: 2, prompt: "a collectible blind-box vinyl toy figure, chibi proportions, glossy plastic, on a pastel pedestal, studio product photo" },
  { id: "tarot", label: "Tarot", tier: 3, prompt: "an art nouveau tarot card illustration among stars and a crescent moon, ornate flowing lines, gold accents" },
  { id: "tcg-holo", label: "Legend", tier: 3, prompt: "an epic fantasy trading card illustration, dramatic rim light, glowing magical details, painterly" },
];

// Blind-box draw: common styles come up most, legends rarely.
export function drawStyle(rand = Math.random()): ArtStyle {
  const weight = { 1: 6, 2: 3, 3: 1 } as const;
  const total = ART_STYLES.reduce((n, s) => n + weight[s.tier], 0);
  let x = rand * total;
  for (const s of ART_STYLES) if ((x -= weight[s.tier]) < 0) return s;
  return ART_STYLES[0];
}
