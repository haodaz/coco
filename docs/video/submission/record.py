"""Record the submission video's main flow on a laptop-sized screen at 2x (Chrome screencast frames, so parts can be
enlarged): share a moment, open a pack, ask Coco a question. The collection, her memory and the place she lives
are shown as single modules (modules.py), not scrolled pages.

    cd ~/Documents/hioffer && uv run python ~/Documents/coco/docs/video/submission/record.py http://localhost:3032 ~/Documents/coco/docs/video/submission/out PET_ID

Local production build in local mode with the owner's local data (back it up first; restore after). Two memories are
shared through the API just before, so the one shared on camera brings the points to 3 and the pool has paintings.
Everything on screen is live: Muse Spark reads the photo and answers, Muse Image paints, SAM cuts the layers.
"""
import base64
import json
import subprocess
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

base = sys.argv[1].rstrip("/")
out = Path(sys.argv[2]).expanduser()
pet_id = sys.argv[3]
photos = Path("~/Documents/coco/data/photos").expanduser()
frames_dir = out / "frames"
frames_dir.mkdir(parents=True, exist_ok=True)
for old in frames_dir.glob("*.jpg"):
    old.unlink()
frames: list[tuple[str, float]] = []
beats: list[dict] = []
t0 = time.time()


def beat(name: str) -> None:
    beats.append({"name": name, "t": round(time.time() - t0, 2)})
    print(f"{beats[-1]['t']:6.1f}s  {name}", flush=True)


def glide(page, dy: int, steps: int = 14, pause: float = 0.03) -> None:
    for _ in range(steps):
        page.mouse.wheel(0, dy / steps)
        time.sleep(pause)


W, H, S = 1600, 900, 2

# two memories shared beforehand (painted in the background while the camera rolls)
for f in ["f6c69a20e70085c47a1dce87e6bdc27d.JPG", "IMG_6641-share.jpg"]:
    r = subprocess.run(["curl", "-s", "-F", f"photo=@{photos / f}", "-F", f"petId={pet_id}", f"{base}/api/share"], capture_output=True, text=True)
    print("pre-shared", f, r.stdout[:80])

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": W, "height": H}, device_scale_factor=S, locale="en-US")
    ctx.add_init_script(f"try {{ localStorage.setItem('coco-told-moves-{pet_id}', JSON.stringify(['thinking','busy','confused','close','rest','happy','walk'])); }} catch (e) {{}}")
    page = ctx.new_page()
    cdp = ctx.new_cdp_session(page)

    def on_frame(ev):
        name = f"{len(frames):05d}.jpg"
        (frames_dir / name).write_bytes(base64.b64decode(ev["data"]))
        frames.append((name, time.time() - t0))
        cdp.send("Page.screencastFrameAck", {"sessionId": ev["sessionId"]})

    cdp.on("Page.screencastFrame", on_frame)
    page.goto(f"{base}/app", wait_until="networkidle")
    page.locator("text=Latest memories >> visible=true").first.wait_for(timeout=30000)
    time.sleep(2.0)
    t0 = time.time()
    cdp.send("Page.startScreencast", {"format": "jpeg", "quality": 92, "maxWidth": W * S, "maxHeight": H * S, "everyNthFrame": 1})

    # 0. home: Coco greets you
    time.sleep(3.0)
    beat("home")

    # 1. share a moment: Coco reads the photo, then you tell the story behind it
    page.get_by_role("link", name="Today").filter(visible=True).first.click()
    page.get_by_text("Share any moment").filter(visible=True).first.wait_for(timeout=20000)
    time.sleep(1.5)
    beat("today")
    page.get_by_text("Share any moment").filter(visible=True).first.scroll_into_view_if_needed()
    glide(page, 160)
    time.sleep(1.0)
    with page.expect_file_chooser() as fc:
        page.get_by_role("button", name="Choose a photo · +1 M pt").filter(visible=True).first.click()
    fc.value.set_files(str(photos / "IMG_7205.JPG"))
    beat("reading")
    page.get_by_text("Coco learned:").filter(visible=True).first.wait_for(timeout=120000)
    glide(page, 200)
    time.sleep(1.0)
    beat("learned")
    time.sleep(3.0)
    story = page.get_by_placeholder("What happened, what Coco was like that day… (optional)").first
    story.click()
    story.type("She sits like this by the table every time I eat, very polite, waiting for one crumb.", delay=34)
    time.sleep(0.5)
    page.get_by_role("button", name="Send").filter(visible=True).first.click()
    page.get_by_text("Coco will remember:").filter(visible=True).first.wait_for(timeout=120000)
    time.sleep(0.6)
    beat("remembered")
    time.sleep(4.0)

    # 2. open a pack: three memories painted in styles you don't know yet
    page.evaluate("window.scrollTo({top: 0, behavior: 'smooth'})")
    time.sleep(1.2)
    beat("pack wait")
    page.wait_for_function("async () => { const s = await fetch('/api/state').then(r => r.json()); return s.cards.filter(c => c.sealed && c.art && !c.painting).length >= 3; }", timeout=600000, polling=3000)
    page.reload(wait_until="networkidle")
    time.sleep(2.0)
    beat("pack ready")
    page.get_by_role("button", name="Open a pack · 3 M pt").filter(visible=True).first.click()
    page.get_by_text("Tap the glowing card to turn it over.").filter(visible=True).first.wait_for(timeout=120000)
    time.sleep(1.0)
    beat("reveal")
    flips = page.locator("button.flip")
    for i in range(flips.count()):
        flips.nth(i).click()
        time.sleep(1.6)
        beat(f"flip{i}")
    time.sleep(3.0)
    beat("revealed")
    page.get_by_role("button", name="Add to my collection").filter(visible=True).first.click()
    time.sleep(1.0)

    # 4. talk with Coco: she answers from her cards, and says so when she hasn't seen something
    page.get_by_role("link", name="Talk with Coco").filter(visible=True).first.click()
    q = page.get_by_placeholder("Say something to Coco").filter(visible=True).first
    q.wait_for(timeout=20000)
    time.sleep(1.5)
    beat("chat")
    q.click()
    q.type("Where do you like to sleep?", delay=45)
    page.keyboard.press("Enter")
    beat("sent1")
    page.get_by_text("I remember this from").filter(visible=True).first.wait_for(timeout=120000)
    time.sleep(0.4)
    beat("answer1")
    time.sleep(6.0)
    time.sleep(3.0)  # screencast frames can lag behind the page; leave room at the end
    beat("end")

    cdp.send("Page.stopScreencast")
    ctx.close()
    b.close()

lst = [f"file '{frames_dir / n}'\nduration {max(0.001, (frames[i + 1][1] if i + 1 < len(frames) else ts + 0.5) - ts):.3f}" for i, (n, ts) in enumerate(frames)]
(out / "frames.txt").write_text("\n".join(lst) + f"\nfile '{frames_dir / frames[-1][0]}'\n")
FF = "/Users/aisandbox/Documents/companydata/node_modules/ffmpeg-static/ffmpeg"
subprocess.run([FF, "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(out / "frames.txt"), "-vf", f"fps=30,scale={W * S}:{H * S},format=yuv420p", "-c:v", "libx264", "-crf", "16", str(out / "take.mp4")], check=True)
(out / "beats.json").write_text(json.dumps(beats, indent=1))
print("done", out / "take.mp4", len(frames), "frames")
