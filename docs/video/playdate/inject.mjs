// Put the real playdate (Coco x Biscuit, run on cocoverse.app on 2026-10-28) into the local state, from Coco's side,
// so the local build can be recorded. Back up data/state.json first and restore it after recording.
import fs from "node:fs";
const s = JSON.parse(fs.readFileSync("data/state.json", "utf8"));
const coco = s.pets.find((p) => p.name === "Coco");
s.playdates = (s.playdates ?? []).filter((p) => p.id !== "pd_demo_biscuit");
s.playdates.push({
  id: "pd_demo_biscuit",
  petId: coco.id,
  other: { name: "Biscuit", species: "dog", breed: "Pembroke Welsh Corgi", face: "art_biscuitdemo-friend.png" },
  transcript: [
    { who: "me", line: "Hello. I like lying on my back and holding my toy with my paws.", mood: "happy" },
    { who: "them", line: "That sounds gentle and nice with your toy. I like to run for my yellow ball on the grass, would you like to chase it with me?", mood: "happy" },
    { who: "me", line: "I have not chased a yellow ball on the grass that I know of, I like to lie on my back holding my toy. I sat on a bench by the water next to a small white fluffy dog and was calm, do you like sitting near other dogs", mood: "thinking" },
    { who: "them", line: "Yes, I like being near other dogs and saying hello nose to nose with my tail up. I walk on my leash along the city sidewalk with fallen leaves and look ahead.", mood: "happy" },
  ],
  report: {
    verdict: "worth a try",
    summary: "Coco and Biscuit have both been calm and friendly near other dogs. Their favorite ways of playing look quite different, with Coco preferring gentle toy-holding and Biscuit preferring running and chasing.",
    reasons: [
      { pet: "me", text: "Coco sat calmly on a bench by the water next to a small white fluffy dog that was being held by her owner.", cardIds: ["card_mvpyi9xt37oo"] },
      { pet: "me", text: "Coco's play is gentle and on her own - lying on her back holding a plush rope toy with her front paws, and standing holding a long stick in her mouth.", cardIds: ["card_mvpx8ezpk1ry", "card_mvrb0lsih6g0"] },
      { pet: "them", text: "Biscuit greeted a large golden dog nose-to-nose in a dog park with his tail up.", cardIds: [] },
      { pet: "them", text: "Biscuit's play is high-energy - running across grass toward a yellow tennis ball and running through shallow sea water at the beach.", cardIds: [] },
    ],
    cautions: [
      "The imprints show different energy in play, so Biscuit wanting to run and chase may be more than Coco wants when she is lying down with a toy.",
      "We have only seen Coco sitting near one small dog and Biscuit in a brief nose-to-nose hello, not extended play together, so watch how they respond to longer close contact, especially if toys like Coco's plush toy or Biscuit's ball are around.",
    ],
    firstMeeting: ["Choose a neutral, open place for a first meeting.", "Keep both dogs on leash at first with owners close by.", "Keep it short and calm and give them space to move away."],
  },
  at: "2026-10-28T12:50:13.596Z",
});
fs.writeFileSync("data/state.json", JSON.stringify(s, null, 1));
console.log("playdate injected for", coco.id);
