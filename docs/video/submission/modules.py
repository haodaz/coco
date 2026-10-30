"""Capture the submission video's module shots: each one part of a page on its own (like a slide), never a scrolled
page. Writes out/mod_<name>.png at 2x, plus out/take_banner.mp4 (the landing hero, a few seconds of its motion).

    cd ~/Documents/hioffer && uv run python ~/Documents/coco/docs/video/submission/modules.py http://localhost:3032 ~/Documents/coco/docs/video/submission/out PET_ID

Sets the place to San Francisco on the local data (restore the backup after).
"""
import base64
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

# the page box from one divider (✦ label ✦) down to the next one, or a fixed height
BETWEEN = """([a, b, h]) => {
  const rules = [...document.querySelectorAll('.ws-rule')];
  const find = (t) => rules.find((r) => r.innerText.includes(t));
  const ra = find(a); if (!ra) return null;
  const top = ra.getBoundingClientRect().top + scrollY - 8;
  const rb = b && find(b);
  const bottom = rb ? rb.getBoundingClientRect().top + scrollY - 12 : top + h;
  const r = ra.getBoundingClientRect();
  return { x: r.left - 20, y: top, width: r.width + 40, height: Math.min(bottom - top, h || 99999) };
}"""


def shot(page, name, box):
    page.screenshot(path=str(out / f"mod_{name}.png"), clip=box, full_page=True)
    print("module", name, {k: round(v) for k, v in box.items()}, flush=True)


with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": W, "height": H}, device_scale_factor=S, locale="en-US")
    ctx.add_init_script(f"try {{ localStorage.setItem('coco-told-moves-{pet_id}', JSON.stringify(['thinking','busy','confused','close','rest','happy','walk'])); }} catch (e) {{}}")
    page = ctx.new_page()

    # the landing hero, moving: a screencast of the hero alone, in a window as wide as the hero is tall
    page.set_viewport_size({"width": 1280, "height": 720})
    page.goto(f"{base}/", wait_until="networkidle")
    time.sleep(2.0)
    hero = page.locator("header.hero-universe").bounding_box()
    d = out / "frames_banner"
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
    cdp.send("Page.startScreencast", {"format": "jpeg", "quality": 92, "maxWidth": W * S, "maxHeight": H * S, "everyNthFrame": 1})
    end = time.time() + 9
    k = 0
    while time.time() < end:  # a tiny pointer drift keeps frames coming
        page.mouse.move(5 + k % 2, 5)
        k += 1
        time.sleep(0.05)
    cdp.send("Page.stopScreencast")
    lst = [f"file '{d / n}'\nduration {max(0.001, (frames[i + 1][1] if i + 1 < len(frames) else ts + 0.1) - ts):.3f}" for i, (n, ts) in enumerate(frames)]
    (out / "banner.txt").write_text("\n".join(lst) + f"\nfile '{d / frames[-1][0]}'\n")
    hh = min(720, round(hero["height"]))
    subprocess.run([FF, "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(out / "banner.txt"), "-vf", f"fps=30,scale={1280 * S}:{720 * S},crop={1280 * S}:{hh * S}:0:0,format=yuv420p", "-c:v", "libx264", "-crf", "16", str(out / "take_banner.mp4")], check=True)
    print("banner", len(frames), "frames, hero height", hh, flush=True)
    page.set_viewport_size({"width": W, "height": H})

    # home: Coco greeting, and today's pack
    page.goto(f"{base}/app", wait_until="networkidle")
    time.sleep(3.0)
    top = page.locator("section").filter(visible=True).first.bounding_box()
    shot(page, "home", {"x": top["x"] - 20, "y": top["y"] - 20, "width": 1600 - top["x"] - 20, "height": top["height"] + 40})

    # the collection: the legend, the series, the move cards
    page.goto(f"{base}/app/cards", wait_until="networkidle")
    time.sleep(3.0)
    legend = page.get_by_text("The Belly-Up Toy Keeper").nth(1).locator("xpath=ancestor::section[1]").bounding_box()
    shot(page, "legend", {"x": legend["x"] - 20, "y": legend["y"] - 10, "width": legend["width"] + 40, "height": legend["height"] + 30})
    # the series: from the divider down to the end of the second row of series, never cutting a row in half
    series = page.evaluate("""() => {
      const rule = [...document.querySelectorAll('.ws-rule')].find((r) => r.innerText.includes('Series'));
      let el = rule.nextElementSibling;
      while (el && !(el.children.length > 3 && getComputedStyle(el).display === 'grid')) el = el.nextElementSibling;
      const kids = [...el.children].slice(0, 4).map((c) => c.getBoundingClientRect());
      const r = rule.getBoundingClientRect();
      const top = r.top + scrollY - 8, bottom = Math.max(...kids.map((k) => k.bottom)) + scrollY + 16;
      return { x: r.left - 20, y: top, width: r.width + 40, height: bottom - top };
    }""")
    shot(page, "series", series)
    shot(page, "moves", page.evaluate(BETWEEN, ["Move cards", "All my cards", 0]))

    # her memory: how well she knows Coco, and how the picture sharpens
    page.goto(f"{base}/app/memory", wait_until="networkidle")
    time.sleep(3.0)
    panel = page.locator("main section.ws-card").filter(visible=True).first.bounding_box()
    shot(page, "clarity", {"x": panel["x"] - 20, "y": panel["y"] - 20, "width": panel["width"] + 40, "height": panel["height"] + 40})
    page.wait_for_function("() => !document.body.innerText.includes('Drawing what I know')", timeout=180000)
    time.sleep(1.5)
    shot(page, "graph", page.evaluate(BETWEEN, ["What I know, and where it comes from", "Moves", 0]))
    shot(page, "learned", page.evaluate(BETWEEN, ["Moves", "How the picture sharpens", 0]))
    shot(page, "levels", page.evaluate(BETWEEN, ["How the picture sharpens", None, 420]))

    # around us: today's weather and the rules there, each with its source
    page.goto(f"{base}/app/place", wait_until="networkidle")
    box = page.get_by_placeholder("Your town or neighbourhood").filter(visible=True).first
    if box.count():
        box.click()
        box.type("San Francisco", delay=40)
        page.get_by_role("button", name="San Francisco").filter(visible=True).first.click()
    page.get_by_text("Rules here").filter(visible=True).first.wait_for(timeout=120000)
    time.sleep(2.5)
    shot(page, "now", page.evaluate(BETWEEN, ["Right now", "Rules here", 0]))
    shot(page, "rules", page.evaluate(BETWEEN, ["Rules here", "Our home", 0]))
    b.close()
