import { after, NextResponse } from "next/server";
import { unlockMoves } from "@/lib/character";
import { refreshLikeness } from "@/lib/likeness";
import { clarityOf, SENSES } from "@/lib/memory";
import { readMomentPhoto } from "@/lib/meta";
import { photoBase64, storePhoto, uploadMeta } from "@/lib/photos";
import { FREE_PER_DAY, SHARE_POINTS, sharesToday, TASK_POINTS, tasksFor } from "@/lib/points";
import { cardTags } from "@/lib/series";
import { packFor } from "@/lib/species";
import { load, newId, save } from "@/lib/store";
import type { Card, Trace } from "@/lib/types";
import { overLimit } from "@/lib/limits";
import { currentUserId, isAdmin, runAs, withUser } from "@/lib/session";

export const maxDuration = 60;

// Share one memory: a photo (and, if the owner likes, a few words). The pet's AI reads it and keeps it right away
// as a Memory Print (sealed: a pack paints it into a card later). Points: +3 when it answers one of today's tasks,
// otherwise +1 for each of the first three free shares of the day.
export const POST = withUser(async (req: Request) => {
  const limited = await overLimit("quest");
  if (limited) return limited;
  const form = await req.formData();
  const file = form.get("photo");
  if (!(file instanceof File)) return NextResponse.json({ error: "photo required" }, { status: 400 });
  const s = await load();
  const pet = s.pets.find((p) => p.id === String(form.get("petId") ?? ""));
  if (!pet) return NextResponse.json({ error: "pet not found" }, { status: 404 });
  const taskId = String(form.get("task") ?? "") || null;
  const task = taskId ? tasksFor(s, pet).find((t) => t.id === taskId && !t.done) : null;
  const freeLeft = isAdmin() ? FREE_PER_DAY : FREE_PER_DAY - sharesToday(s, pet.id);
  if (!task && freeLeft <= 0) return NextResponse.json({ error: `You've shared ${FREE_PER_DAY} moments today. Today's tasks still give points.` }, { status: 400 });

  const words = String(form.get("words") ?? "").trim().slice(0, 500);
  const kinds = [...new Set(packFor(pet.species).quest.map((q) => q.pattern))].map((p) => ({ pattern: p, label: SENSES[p] }));
  const avatar = s.photos.find((p) => p.id === pet.avatarPhotoId);
  const ref = avatar ? await photoBase64(avatar.file) : null;
  const before = clarityOf(s, pet).level;
  const photo = await storePhoto(file, pet.id, null, uploadMeta(form.get("photoMeta")));
  const reading = await readMomentPhoto(await photoBase64(photo.file), kinds, pet.name || "me", pet.sex, ref);
  const now = new Date().toISOString();
  const traces: Trace[] = reading.traces.map((t) => ({ id: newId("tr"), petId: pet.id, ...t, source: { type: "photo", photoId: photo.id }, at: photo.takenAt }));
  const card: Card = {
    id: newId("card"),
    petId: pet.id,
    kind: "daily",
    slotId: null,
    pattern: reading.pattern,
    name: reading.cardName,
    rarity: reading.rarity,
    style: "",
    art: null,
    line: reading.line,
    observation: reading.observation,
    note: words ? { text: words, via: "text", at: now } : null,
    photoId: photo.id,
    createdAt: now,
    sealed: true,
  };
  s.photos.push(photo);
  s.traces.push(...traces);
  s.cards.push(card);

  // points: a task only counts when the moment really fits it
  let earned = 0;
  let matched = false;
  if (task && cardTags(card, s, pet).includes(task.tag)) {
    matched = true;
    card.task = task.id;
    earned = TASK_POINTS;
    (s.points ??= []).push({ petId: pet.id, at: now, delta: TASK_POINTS, why: "task", ref: task.id });
  } else if (freeLeft > 0) {
    earned = SHARE_POINTS;
    (s.points ??= []).push({ petId: pet.id, at: now, delta: SHARE_POINTS, why: "share", ref: card.id });
  }
  await refreshLikeness(s, pet).catch(() => false);
  await save(s);
  const owner = currentUserId();
  after(() => runAs(owner, () => unlockMoves(pet.id)).catch(() => {}));
  return NextResponse.json({ card, earned, matched, task: task?.label ?? null, levelBefore: before, levelAfter: clarityOf(s, pet).level });
});
