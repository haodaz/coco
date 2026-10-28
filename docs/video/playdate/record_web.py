"""Record the playdate video on a laptop-sized screen at 2x (Chrome screencast frames, so parts can be enlarged).

    cd ~/Documents/hioffer && uv run python ~/Documents/coco/docs/video/playdate/record_web.py http://localhost:3032 ~/Documents/coco/docs/video/playdate/out PET_ID

Local production build in local mode with the owner's local data (back it up first, run inject.mjs, restore after).
The playdate on screen is the real one Coco and Biscuit had on cocoverse.app; the invite is made on camera.
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
frames_dir = out / "frames_web"
frames_dir.mkdir(parents=True, exist_ok=True)
for old in frames_dir.glob("*.jpg"):
    old.unlink()
frames: list[tuple[str, float]] = []
beats: list[dict] = []
t0 = time.time()


def beat(name: str) -> None:
    beats.append({"name": name, "t": round(time.time() - t0, 2)})
    print(f"{beats[-1]['t']:6.1f}s  {name}", flush=True)


def glide(page, dy: int, steps: int = 12, pause: float = 0.03) -> None:
    for _ in range(steps):
        page.mouse.wheel(0, dy / steps)
        time.sleep(pause)


W, H, S = 1600, 900, 2

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": W, "height": H}, device_scale_factor=S, locale="en-US")
    # no "learned a move" note over the recording
    ctx.add_init_script(f"try {{ localStorage.setItem('coco-told-moves-{pet_id}', JSON.stringify(['thinking','busy','confused','close','rest','happy','walk'])); }} catch (e) {{}}")
    page = ctx.new_page()
    cdp = ctx.new_cdp_session(page)

    def on_frame(ev):
        name = f"{len(frames):05d}.jpg"
        (frames_dir / name).write_bytes(base64.b64decode(ev["data"]))
        frames.append((name, time.time() - t0))
        cdp.send("Page.screencastFrameAck", {"sessionId": ev["sessionId"]})

    cdp.on("Page.screencastFrame", on_frame)
    page.goto(f"{base}/app/friends", wait_until="networkidle")
    page.get_by_text("Find a playmate").wait_for(timeout=30000)
    time.sleep(1.5)
    t0 = time.time()
    cdp.send("Page.startScreencast", {"format": "jpeg", "quality": 92, "maxWidth": W * S, "maxHeight": H * S, "everyNthFrame": 1})

    # 1. the Friends page, then the playmate invite: what Coco's twin may share
    time.sleep(2.0)
    beat("friends")
    card = page.get_by_text("Find a playmate")
    card.scroll_into_view_if_needed()
    glide(page, -60)
    time.sleep(1.5)
    beat("invite")
    box = page.get_by_placeholder("A name for this invite (optional)")
    box.click()
    box.type("Biscuit", delay=70)
    time.sleep(0.6)
    page.get_by_role("button", name="Make link").nth(1).click()
    time.sleep(1.2)
    page.get_by_text("Your links").scroll_into_view_if_needed()
    glide(page, 120)
    time.sleep(2.5)
    beat("link made")

    # 2. the twins' conversation
    page.get_by_text("Coco & Biscuit").scroll_into_view_if_needed()
    glide(page, 40)
    time.sleep(1.0)
    beat("talk")
    for _ in range(3):
        time.sleep(2.6)
        glide(page, 110, steps=18)
    time.sleep(1.5)
    beat("talk end")

    # 3. the note, every reason pointing back to a real card
    page.get_by_text("The twins' note").scroll_into_view_if_needed()
    glide(page, -20)
    time.sleep(3.0)
    beat("note")
    glide(page, 220, steps=20)
    time.sleep(2.5)
    beat("reasons")
    page.get_by_title("Belly Up Toy Time").first.click()
    time.sleep(5.0)
    beat("card open")
    page.keyboard.press("Escape")
    time.sleep(1.0)
    beat("card closed")

    # 4. what to watch for, and who decides
    page.get_by_text("Watch for:").scroll_into_view_if_needed()
    glide(page, 160, steps=16)
    time.sleep(5.0)
    beat("watch")
    time.sleep(6.0)  # screencast frames can lag behind the page; leave room at the end
    beat("end")

    cdp.send("Page.stopScreencast")
    ctx.close()
    b.close()

lst = [f"file '{frames_dir / n}'\nduration {max(0.001, (frames[i + 1][1] if i + 1 < len(frames) else ts + 0.5) - ts):.3f}" for i, (n, ts) in enumerate(frames)]
(out / "frames_web.txt").write_text("\n".join(lst) + f"\nfile '{frames_dir / frames[-1][0]}'\n")
FF = "/Users/aisandbox/Documents/companydata/node_modules/ffmpeg-static/ffmpeg"
subprocess.run([FF, "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(out / "frames_web.txt"), "-vf", f"fps=30,scale={W * S}:{H * S},format=yuv420p", "-c:v", "libx264", "-crf", "16", str(out / "take_web.mp4")], check=True)
(out / "beats_web.json").write_text(json.dumps(beats, indent=1))
print("done", out / "take_web.mp4", len(frames), "frames")
