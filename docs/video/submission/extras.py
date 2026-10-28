"""Short clips for the submission video's "and also" moment: the app in Chinese, and a sitter talking to Coco's twin
through a link (laptop size, 2x screencast). Run after record.py, on the same local build; switches the language
back to English at the end.

    cd ~/Documents/hioffer && uv run python ~/Documents/coco/docs/video/submission/extras.py http://localhost:3032 ~/Documents/coco/docs/video/submission/out PET_ID
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
W, H, S = 1600, 900, 2
FF = "/Users/aisandbox/Documents/companydata/node_modules/ffmpeg-static/ffmpeg"


def lang(code: str) -> None:
    subprocess.run(["curl", "-s", "-X", "POST", "-H", "Content-Type: application/json", "-d", json.dumps({"lang": code}), f"{base}/api/settings"], capture_output=True)


def clip(name: str, run) -> None:
    d = out / f"frames_{name}"
    d.mkdir(parents=True, exist_ok=True)
    for old in d.glob("*.jpg"):
        old.unlink()
    frames: list[tuple[str, float]] = []
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={"width": W, "height": H}, device_scale_factor=S, locale="en-US")
        ctx.add_init_script(f"try {{ localStorage.setItem('coco-told-moves-{pet_id}', JSON.stringify(['thinking','busy','confused','close','rest','happy','walk'])); }} catch (e) {{}}")
        page = ctx.new_page()
        cdp = ctx.new_cdp_session(page)
        t0 = [time.time()]

        def on_frame(ev):
            n = f"{len(frames):05d}.jpg"
            (d / n).write_bytes(base64.b64decode(ev["data"]))
            frames.append((n, time.time() - t0[0]))
            cdp.send("Page.screencastFrameAck", {"sessionId": ev["sessionId"]})

        cdp.on("Page.screencastFrame", on_frame)
        run(page, lambda: (t0.__setitem__(0, time.time()), cdp.send("Page.startScreencast", {"format": "jpeg", "quality": 92, "maxWidth": W * S, "maxHeight": H * S, "everyNthFrame": 1})))
        time.sleep(1.5)
        cdp.send("Page.stopScreencast")
        ctx.close()
        b.close()
    lst = [f"file '{d / n}'\nduration {max(0.001, (frames[i + 1][1] if i + 1 < len(frames) else ts + 0.5) - ts):.3f}" for i, (n, ts) in enumerate(frames)]
    (out / f"{name}.txt").write_text("\n".join(lst) + f"\nfile '{d / frames[-1][0]}'\n")
    subprocess.run([FF, "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(out / f"{name}.txt"), "-vf", f"fps=30,scale={W * S}:{H * S},format=yuv420p", "-c:v", "libx264", "-crf", "16", str(out / f"take_{name}.mp4")], check=True)
    print("clip", name, len(frames), "frames", flush=True)


def chinese(page, start):
    lang("zh-Hans")
    page.goto(f"{base}/app", wait_until="networkidle")
    time.sleep(3.0)
    start()
    time.sleep(0.5)
    page.mouse.wheel(0, 40)
    time.sleep(3.0)
    page.goto(f"{base}/app/cards", wait_until="networkidle")
    time.sleep(3.5)
    lang("en")


def sitter(page, start):
    page.goto(f"{base}/app/friends", wait_until="networkidle")
    page.get_by_text("For a sitter").filter(visible=True).first.wait_for(timeout=20000)
    time.sleep(1.5)
    start()
    time.sleep(1.0)
    box = page.get_by_placeholder("Who is it for? e.g. Sam, Nov 10–14").filter(visible=True).first
    box.click()
    box.type("Sam, Nov 10–14", delay=60)
    page.get_by_role("button", name="Make link").filter(visible=True).first.click()
    time.sleep(1.5)
    href = page.locator("a[href*='/s/']").first.get_attribute("href")
    page.goto(href if href.startswith("http") else base + href, wait_until="networkidle")
    q = page.get_by_placeholder("Ask Coco about her day").filter(visible=True).first
    q.wait_for(timeout=20000)
    time.sleep(1.5)
    q.click()
    q.type("Where does Coco like to nap in the afternoon?", delay=45)
    page.keyboard.press("Enter")
    time.sleep(2.0)
    page.wait_for_function("() => ![...document.querySelectorAll('.animate-pulse')].some((e) => e.innerText.trim() === '…')", timeout=180000)
    hold(page, 8.0)


def hold(page, secs: float) -> None:
    # the screencast only sends frames when something repaints; a tiny pointer drift keeps it flowing
    end = time.time() + secs
    k = 0
    while time.time() < end:
        page.mouse.move(1500 + (k % 2), 860)
        k += 1
        time.sleep(0.1)


def settled(page):
    time.sleep(2.0)
    page.wait_for_function("() => { const t = document.querySelector('main').innerText; return !t.includes('Thinking') && !t.includes('Looking through'); }", timeout=180000)


def chat(page, start):
    # a fresh conversation: something Coco has never been shown, then a plan she checks before saying yes
    page.goto(f"{base}/app/chat", wait_until="networkidle")
    q = page.get_by_placeholder("Say something to Coco").filter(visible=True).first
    q.wait_for(timeout=20000)
    time.sleep(1.5)
    start()
    time.sleep(1.0)
    q.click()
    q.type("Have you ever been to the beach?", delay=45)
    page.keyboard.press("Enter")
    settled(page)
    print("beach answered", time.time(), flush=True)
    hold(page, 8.0)
    q.click()
    q.type("I'm going to the store this afternoon. Want to come?", delay=40)
    page.keyboard.press("Enter")
    settled(page)
    print("store answered", time.time(), flush=True)
    hold(page, 12.0)
    page.screenshot(path=str(out / "chat_end_check.png"))


for name, run in [("zh", chinese), ("sitter", sitter), ("chat", chat)]:
    if len(sys.argv) < 5 or name in sys.argv[4].split(","):
        clip(name, run)
