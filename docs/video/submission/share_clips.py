"""The sharing beat for the submission video: a screencast of "Share this card" on a card, and the two public pages
(one card, the pet's universe) as single screens. Writes out/take_share.mp4, out/mod_sharecard.png, out/mod_shareworld.png.

    cd ~/Documents/hioffer && uv run python ~/Documents/coco/docs/video/submission/share_clips.py http://localhost:3032 ~/Documents/coco/docs/video/submission/out PET_ID CARD_ID
"""
import base64
import json
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

base = sys.argv[1].rstrip("/")
out = Path(sys.argv[2]).expanduser()
pet_id, card_id = sys.argv[3], sys.argv[4]
W, H, S = 1600, 900, 2
FF = "/Users/aisandbox/Documents/companydata/node_modules/ffmpeg-static/ffmpeg"


def make(kind, **extra):
    req = urllib.request.Request(f"{base}/api/shares", data=json.dumps({"kind": kind, "petId": pet_id, **extra}).encode(), headers={"Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req))["share"]["token"]


with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": W, "height": H}, device_scale_factor=S, locale="en-US")
    ctx.add_init_script(f"try {{ localStorage.setItem('coco-told-moves-{pet_id}', JSON.stringify(['thinking','busy','confused','close','rest','happy','walk'])); }} catch (e) {{}}")
    page = ctx.new_page()

    # 1. the card, then "Share this card" (screencast)
    d = out / "frames_share"
    d.mkdir(parents=True, exist_ok=True)
    for old in d.glob("*.jpg"):
        old.unlink()
    frames = []
    cdp = ctx.new_cdp_session(page)
    t0 = time.time()

    def on_frame(ev):
        n = f"{len(frames):05d}.jpg"
        (d / n).write_bytes(base64.b64decode(ev["data"]))
        frames.append((n, time.time() - t0))
        cdp.send("Page.screencastFrameAck", {"sessionId": ev["sessionId"]})

    cdp.on("Page.screencastFrame", on_frame)
    page.goto(f"{base}/app/cards", wait_until="networkidle")
    time.sleep(2)
    page.locator(f"#card-{card_id} button, [title='Sunny Bench By Water']").first.click()
    time.sleep(1.5)
    t0 = time.time()
    cdp.send("Page.startScreencast", {"format": "jpeg", "quality": 92, "maxWidth": W * S, "maxHeight": H * S, "everyNthFrame": 1})
    time.sleep(1.5)
    page.get_by_role("button", name="Share this card").first.click()
    end = time.time() + 5
    k = 0
    while time.time() < end:
        page.mouse.move(1500 + k % 2, 860)
        k += 1
        time.sleep(0.05)
    cdp.send("Page.stopScreencast")
    lst = [f"file '{d / n}'\nduration {max(0.001, (frames[i + 1][1] if i + 1 < len(frames) else ts + 0.1) - ts):.3f}" for i, (n, ts) in enumerate(frames)]
    (out / "share.txt").write_text("\n".join(lst) + f"\nfile '{d / frames[-1][0]}'\n")
    subprocess.run([FF, "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(out / "share.txt"), "-vf", f"fps=30,scale={W * S}:{H * S},format=yuv420p", "-c:v", "libx264", "-crf", "16", str(out / "take_share.mp4")], check=True)
    print("share clip", len(frames), "frames", flush=True)

    # 2. the public pages, one screen each
    tc = make("card", cardId=card_id)
    tw = make("pet")
    page.goto(f"{base}/c/{tc}", wait_until="networkidle")
    time.sleep(2.5)
    page.screenshot(path=str(out / "mod_sharecard.png"), clip={"x": 300, "y": 40, "width": 1000, "height": 860})
    page.goto(f"{base}/w/{tw}", wait_until="networkidle")
    time.sleep(2.5)
    page.screenshot(path=str(out / "mod_shareworld.png"), clip={"x": 200, "y": 60, "width": 1200, "height": 840})
    print("public pages shot", tc, tw, flush=True)
    b.close()
