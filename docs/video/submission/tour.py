"""Screenshot every page the submission video shows (laptop size, 2x), to find what needs fixing before recording.

    cd ~/Documents/hioffer && uv run python ~/Documents/coco/docs/video/submission/tour.py http://localhost:3032 PET_ID
"""
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

base = sys.argv[1].rstrip("/")
pet_id = sys.argv[2]
out = Path(__file__).parent / "out" / "pages"
PAGES = ["/", "/app", "/app/pack", "/app/cards", "/app/memory", "/app/chat", "/app/place", "/app/friends"]
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1600, "height": 900}, device_scale_factor=1, locale="en-US")
    ctx.add_init_script(f"try {{ localStorage.setItem('coco-told-moves-{pet_id}', JSON.stringify(['thinking','busy','confused','close','rest','happy','walk'])); }} catch (e) {{}}")
    page = ctx.new_page()
    for path in PAGES:
        page.goto(base + path, wait_until="networkidle")
        time.sleep(2.5)
        name = path.strip("/").replace("/", "_") or "landing"
        page.screenshot(path=str(out / f"{name}.png"), full_page=True)
        print(name, page.evaluate("document.body.scrollHeight"))
    b.close()
