"""Record the "judge by deeds" teaser on a phone-sized screen at 3x (Chrome screencast frames, so parts can be enlarged).

    cd ~/Documents/hioffer && uv run python ~/Documents/coco/docs/video/deeds/record.py http://localhost:3032 ~/Documents/coco/docs/video/deeds/out PET_ID

Local production build in local mode, the owner's local data (back it up first; restore after). Two memories are shared
beforehand through the API so that the one shared on camera brings the points to 3. Everything on screen is real:
Muse Spark reads the photo, the pack is painted by Muse Image, Coco answers live.
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


W, H, S = 390, 844, 3

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": W, "height": H}, device_scale_factor=S, is_mobile=True, has_touch=False, locale="en-US")
    # no "learned a move" note over the recording
    ctx.add_init_script(f"try {{ localStorage.setItem('coco-told-moves-{pet_id}', JSON.stringify(['thinking','busy','confused','close','rest','happy'])); }} catch (e) {{}}")
    page = ctx.new_page()
    cdp = ctx.new_cdp_session(page)

    def on_frame(ev):
        name = f"{len(frames):05d}.jpg"
        (frames_dir / name).write_bytes(base64.b64decode(ev["data"]))
        frames.append((name, time.time() - t0))
        cdp.send("Page.screencastFrameAck", {"sessionId": ev["sessionId"]})

    cdp.on("Page.screencastFrame", on_frame)
    page.goto(f"{base}/app/pack", wait_until="networkidle")
    page.get_by_text("Share any moment").wait_for(timeout=30000)
    t0 = time.time()
    cdp.send("Page.startScreencast", {"format": "jpeg", "quality": 92, "maxWidth": W * S, "maxHeight": H * S, "everyNthFrame": 1})

    # 1. share a moment: a photo and a few words
    page.get_by_text("Share any moment").scroll_into_view_if_needed()
    page.mouse.wheel(0, 120)
    time.sleep(1.2)
    beat("share")
    box = page.get_by_placeholder("Anything to tell Coco about it? (optional)")
    box.click()
    box.type("She rolls over for a belly rub every time this toy comes out.", delay=32)
    time.sleep(0.5)
    with page.expect_file_chooser() as fc:
        page.get_by_role("button", name="Choose a photo · +1 M pt").click()
    fc.value.set_files(str(photos / "IMG_3195.JPG"))
    beat("reading")
    page.get_by_text("Coco learned:").first.wait_for(timeout=120000)
    for _ in range(6):  # bring what Coco learned into view
        page.mouse.wheel(0, 60)
        time.sleep(0.05)
    time.sleep(0.6)
    beat("learned")
    time.sleep(4.5)

    # 2. open a pack with the points
    page.get_by_role("button", name="Open a pack · 3 M pt").scroll_into_view_if_needed()
    time.sleep(1.2)
    beat("pack")
    page.get_by_role("button", name="Open a pack · 3 M pt").click()
    beat("painting")
    page.get_by_text("Tap the glowing card to turn it over.").wait_for(timeout=300000)
    page.evaluate("window.scrollTo(0, 0)")
    time.sleep(1.0)
    beat("reveal")
    flips = page.locator("button.flip")
    for i in range(flips.count()):
        flips.nth(i).click()
        time.sleep(1.1)
        beat(f"flip{i}")
    time.sleep(3.0)
    beat("bonus shown")
    page.get_by_role("button", name="Add to my collection").click()
    time.sleep(1.0)

    # 3. ask where she likes to sleep: the answer names the cards behind it
    page.locator(".ws-tabs a.talk").click()
    page.wait_for_url("**/app/chat**")
    q = page.get_by_placeholder("Say something to Coco")
    q.wait_for(timeout=20000)
    time.sleep(1.0)
    beat("chat")
    q.click()
    q.type("Where do you like to sleep?", delay=45)
    page.keyboard.press("Enter")
    beat("sent1")
    page.get_by_text("I remember this from").first.wait_for(timeout=120000)
    time.sleep(0.4)
    beat("answer1")
    time.sleep(5.0)

    # 4. ask about something never shown: she says so
    q.click()
    q.type("Have you ever played in the snow?", delay=45)
    page.keyboard.press("Enter")
    beat("sent2")
    # wait until the server has the second answer, then until it is on screen
    page.wait_for_function("async () => { const s = await fetch('/api/state').then(r => r.json()); return (s.threads || []).some(t => t.turns.length >= 2); }", timeout=180000, polling=1000)
    page.wait_for_function("() => !document.body.innerText.includes('Thinking…') && !document.body.innerText.includes('Looking through our moments…')", timeout=60000)
    time.sleep(0.4)
    beat("answer2")
    time.sleep(8.0)  # screencast frames can lag behind the page; leave room at the end
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
