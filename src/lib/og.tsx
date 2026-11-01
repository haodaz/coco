import { ImageResponse } from "next/og";
import { getMedia, mediaType } from "./media";
import { runAs } from "./session";
import { openShare, publicCards } from "./shares";

// The picture social apps show for a public link (and the one a reader can save): the card, or the pet and its
// best cards, on the cocoverse sky. Built from the same files the link may serve, nothing else.

// cached at the edge for a day: social crawlers give up on slow images, and a link's picture rarely changes
const SIZE = { width: 1200, height: 630, headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" } };
const SKY = "linear-gradient(135deg, #e9e2ff 0%, #f6e4f3 55%, #fdf0e3 100%)";

async function dataUrl(ownerId: string, file: string | null | undefined) {
  if (!file) return null;
  const name = file.replace("/api/art/", "").replace(/\?.*$/, "");
  try {
    const buf = await runAs(ownerId, () => getMedia(name));
    return `data:${mediaType(name)};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

const notFound = () =>
  new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: SKY, fontSize: 48, color: "#1f1d33" }}>cocoverse</div>,
    SIZE,
  );

export async function ogImage(token: string) {
  const o = (await openShare(token, "card")) ?? (await openShare(token, "pet"));
  if (!o) return notFound();
  const { pet, share, ownerId } = o;
  const cards = publicCards(o);
  const brand = (
    <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#1f1d33", fontSize: 28, fontWeight: 700 }}>
      <div style={{ display: "flex", width: 44, height: 30 }}>
        <div style={{ position: "absolute", left: 0, top: 2, width: 26, height: 26, borderRadius: 13, border: "5px solid #4a3fb0" }} />
        <div style={{ position: "absolute", left: 16, top: 2, width: 26, height: 26, borderRadius: 13, border: "5px solid #c2418f" }} />
      </div>
      cocoverse
    </div>
  );

  if (share.kind === "card") {
    const c = cards[0];
    const art = await dataUrl(ownerId, c?.art);
    return new ImageResponse(
      <div style={{ width: "100%", height: "100%", display: "flex", background: SKY, padding: 48, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", width: 400, height: 534, borderRadius: 28, overflow: "hidden", boxShadow: "0 30px 60px -20px rgba(40,30,90,.45)", background: "#ddd" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {art && <img src={art} alt="" width={400} height={534} style={{ objectFit: "cover" }} />}
        </div>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", marginLeft: 56, flex: 1 }}>
          {brand}
          <div style={{ marginTop: 28, fontSize: 20, letterSpacing: 4, textTransform: "uppercase", color: "#6d4fd1", fontWeight: 700 }}>{`${pet.name}'s memory card`}</div>
          <div style={{ marginTop: 10, fontSize: 56, fontWeight: 700, lineHeight: 1.05, color: "#1f1d33" }}>{c?.name ?? pet.name}</div>
          {c?.line && <div style={{ marginTop: 18, fontSize: 26, fontStyle: "italic", lineHeight: 1.3, color: "#3d3a58" }}>{`“${c.line}”`}</div>}
          <div style={{ marginTop: 34, fontSize: 22, color: "#5c5a75" }}>In cocoverse we keep every moment. · cocoverse.app</div>
        </div>
      </div>,
      SIZE,
    );
  }

  const face = await dataUrl(ownerId, pet.character?.moods.idle?.[0]);
  const arts = (await Promise.all(cards.slice(0, 4).map((c) => dataUrl(ownerId, c.art)))).filter((a): a is string => !!a);
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", background: SKY, padding: 48, fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", width: 380, height: 534, alignItems: "flex-end", justifyContent: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {face && <img src={face} alt="" width={380} height={523} style={{ objectFit: "contain" }} />}
      </div>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", marginLeft: 40, flex: 1 }}>
        {brand}
        <div style={{ marginTop: 28, fontSize: 20, letterSpacing: 4, textTransform: "uppercase", color: "#6d4fd1", fontWeight: 700 }}>{pet.breed ?? pet.species}</div>
        <div style={{ marginTop: 8, fontSize: 60, fontWeight: 700, lineHeight: 1.05, color: "#1f1d33" }}>{`This is ${pet.name}.`}</div>
        <div style={{ marginTop: 14, fontSize: 27, fontStyle: "italic", color: "#3d3a58" }}>In cocoverse we have a universe of our own.</div>
        <div style={{ display: "flex", gap: 14, marginTop: 30 }}>
          {arts.map((a, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={a} alt="" width={120} height={160} style={{ objectFit: "cover", borderRadius: 14, boxShadow: "0 14px 30px -14px rgba(40,30,90,.5)" }} />
          ))}
        </div>
        <div style={{ marginTop: 26, fontSize: 22, color: "#5c5a75" }}>cocoverse.app</div>
      </div>
    </div>,
    SIZE,
  );
}
