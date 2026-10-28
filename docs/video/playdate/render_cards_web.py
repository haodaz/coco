"""Render the playdate short's cover, concept and end cards (cards.html) to 1080x1920 PNGs.

    cd ~/Documents/hioffer && uv run python ~/Documents/coco/docs/video/playdate/render_cards_web.py
"""
from pathlib import Path

from playwright.sync_api import sync_playwright

here = Path(__file__).parent
with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_page(viewport={"width": 1920, "height": 1080})
    for name in ["cover", "concept", "phone", "end"]:
        page.goto(f"file://{here / 'cards_web.html'}?p={name}", wait_until="networkidle")
        page.wait_for_timeout(600)
        page.screenshot(path=str(here / "out" / f"web_{name}.png"))
        print("card", name)
    b.close()
