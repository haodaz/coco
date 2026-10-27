"""Record the coco teaser on a phone-sized screen, at 3x so any part can be cropped and enlarged.

    cd ~/Documents/hioffer && uv run python ~/Documents/coco/docs/video/teaser/record.py http://localhost:3032 ~/Documents/coco/docs/video/teaser/out

Runs against a local production build in local mode (no dev badge, the owner's local data). Everything on screen is the
real app, including a real answer from Muse Spark. Writes the video and beats.json (when each moment happened).
"""
import base64
import json
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

base = sys.argv[1].rstrip("/")
out = Path(sys.argv[2]).expanduser()
out.mkdir(parents=True, exist_ok=True)
frames_dir = out / "frames"
frames_dir.mkdir(exist_ok=True)
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
    # Playwright's own video ignores the pixel ratio, so frames come from Chrome's screencast at full device pixels
    ctx = b.new_context(viewport={"width": W, "height": H}, device_scale_factor=S, is_mobile=True, has_touch=False)
    page = ctx.new_page()
    cdp = ctx.new_cdp_session(page)

    def on_frame(ev):
        name = f"{len(frames):05d}.jpg"
        (frames_dir / name).write_bytes(base64.b64decode(ev["data"]))
        frames.append((name, time.time() - t0))
        cdp.send("Page.screencastFrameAck", {"sessionId": ev["sessionId"]})

    cdp.on("Page.screencastFrame", on_frame)
    page.goto(f"{base}/app", wait_until="networkidle")
    t0 = time.time()
    cdp.send("Page.startScreencast", {"format": "jpeg", "quality": 92, "maxWidth": W * S, "maxHeight": H * S, "everyNthFrame": 1})

    # 1. Home: the pet, its line, today's pack
    page.wait_for_selector(".home-m [title='Pat']", timeout=30000)
    time.sleep(1.5)
    beat("home")
    time.sleep(2.5)
    page.locator(".home-m [title='Pat']").click()
    beat("pat")
    time.sleep(2.2)

    # 2. Cards: the collection, one card opened and turned in the light
    page.locator(".ws-tabs a[href='/app/cards']").click()
    page.wait_for_url("**/app/cards")
    time.sleep(1.2)
    beat("cards")
    cards = page.locator("main button:has(img)")
    target = cards.nth(3)
    target.scroll_into_view_if_needed()
    time.sleep(1.6)
    beat("cards grid")
    target.click()
    time.sleep(1.0)
    beat("card open")
    holo = page.locator(".fixed.inset-0 .hc").first
    box = holo.bounding_box()
    if box:
        cx, cy = box["x"] + box["width"] / 2, box["y"] + box["height"] / 2
        for i in range(60):
            x = box["x"] + box["width"] * (0.15 + 0.7 * (i / 59))
            page.mouse.move(x, cy + (box["height"] * 0.2) * (1 if i < 30 else -1) * (i % 30) / 30)
            time.sleep(0.04)
    beat("card tilted")
    time.sleep(1.5)
    page.locator(".fixed.inset-0 button[aria-label='Close']").first.click()
    time.sleep(0.6)

    # 3. Talk: a plan, the pet checks the place before it answers
    page.locator(".ws-tabs a.talk").click()
    page.wait_for_url("**/app/chat**")
    box_in = page.get_by_placeholder("Say something to Coco")
    box_in.wait_for(timeout=20000)
    time.sleep(1.2)
    beat("chat")
    box_in.click()
    box_in.type("Can you wait in the car while I grab coffee?", delay=45)
    beat("typed")
    time.sleep(0.6)
    page.keyboard.press("Enter")
    beat("sent")
    page.get_by_text("I checked").first.wait_for(timeout=120000)
    time.sleep(0.4)
    beat("answer")
    time.sleep(4.5)
    page.get_by_text("I opened").first.click()
    time.sleep(0.8)
    beat("checks")
    time.sleep(4.0)
    beat("end")

    cdp.send("Page.stopScreencast")
    ctx.close()
    b.close()

# frames arrive only when something changes: each one lasts until the next
lst = [f"file '{frames_dir / n}'\nduration {max(0.001, (frames[i + 1][1] if i + 1 < len(frames) else ts + 0.5) - ts):.3f}" for i, (n, ts) in enumerate(frames)]
(out / "frames.txt").write_text("\n".join(lst) + f"\nfile '{frames_dir / frames[-1][0]}'\n")
FF = "/Users/aisandbox/Documents/companydata/node_modules/ffmpeg-static/ffmpeg"
import subprocess
subprocess.run([FF, "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(out / "frames.txt"), "-vf", f"fps=30,scale={W * S}:{H * S},format=yuv420p", "-c:v", "libx264", "-crf", "16", str(out / "take.mp4")], check=True)
(out / "beats.json").write_text(json.dumps(beats, indent=1))
print("done", out / "take.mp4", len(frames), "frames")
