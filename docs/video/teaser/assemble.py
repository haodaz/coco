"""Cut the coco teaser: cards + the phone recording (waits cut, parts enlarged) + narration + burned-in subtitles.

    cd ~/Documents/hioffer && uv run python ~/Documents/coco/docs/video/teaser/assemble.py

Output: out/coco_teaser.mp4, 1080x1920. Video times are seconds in out/take.mp4 (look at a contact sheet first);
crops are [x, y, w, h] in the 1170x2532 recording, always 9:16, so 1170 wide is the full screen and smaller is enlarged.
"""
import json
import subprocess
from pathlib import Path

here = Path(__file__).parent
out = here / "out"
FF = "/Users/aisandbox/Documents/companydata/node_modules/ffmpeg-static/ffmpeg"  # has libass for subtitles
FULL_TOP = [0, 0, 1170, 2080]
FULL_BOTTOM = [0, 452, 1170, 2080]

# each section: its pictures, then the narration line that starts with it
SECTIONS = [
    {"n": "n1", "lead": 0.5, "top": [0, 1, 2], "shots": [{"card": "cover", "d": 3.0}, {"card": "concept", "d": 6.6}]},
    {"n": "n2", "shots": [{"v": [0.3, 3.8], "crop": FULL_TOP}, {"v": [3.8, 6.6], "crop": [0, 120, 877, 1559]}]},
    {"n": "n3", "shots": [{"v": [7.6, 10.0], "crop": FULL_TOP}, {"v": [10.1, 14.4], "crop": [80, 0, 1010, 1795]}]},
    {"n": "n4", "top": [0], "shots": [{"v": [16.9, 19.4], "crop": FULL_BOTTOM}, {"v": [25.9, 31.6], "crop": [0, 60, 1000, 1778]}]},
    {"n": "n5", "shots": [{"v": [36.95, 37.5], "crop": FULL_TOP}]},
    {"n": "n6", "top": [0, 1], "shots": [{"card": "end", "d": 3.4}]},
]
lines = {s["id"]: s["text"] for s in json.loads((here / "narration.json").read_text())}
durs = {d["id"]: d["dur"] for d in json.loads((here / "tts" / "durations.json").read_text())}

inputs = ["-i", str(out / "take.mp4")]
parts, vf = [], []
t = 0.0
cues, voice = [], []
for si, sec in enumerate(SECTIONS):
    lead = sec.get("lead", 0.25)
    need = lead + durs[sec["n"]] + 0.45  # the line, with a breath after it
    have = sum(sh["d"] if "card" in sh else sh["v"][1] - sh["v"][0] for sh in sec["shots"])
    extra = max(0.0, need - have)  # hold the last picture a little longer if the line runs over
    voice.append((sec["n"], t + lead))
    start = t
    for i, sh in enumerate(sec["shots"]):
        last = i == len(sec["shots"]) - 1
        label = f"s{si}_{i}"
        if "card" in sh:
            d = sh["d"] + (extra if last else 0)
            inputs += ["-loop", "1", "-t", f"{d:.2f}", "-i", str(out / f"card_{sh['card']}.png")]
            idx = inputs.count("-i") - 1
            vf.append(f"[{idx}:v]scale=1080:1920,fps=30,format=yuv420p,setsar=1[{label}]")
        else:
            a, b = sh["v"]
            x, y, w, h = sh["crop"]
            d = b - a + (extra if last else 0)
            hold = f",tpad=stop_mode=clone:stop_duration={extra:.2f}" if last and extra else ""
            vf.append(f"[0:v]trim={a}:{b},setpts=PTS-STARTPTS,crop={w}:{h}:{x}:{y},scale=1080:1920:flags=lanczos,fps=30,format=yuv420p,setsar=1{hold}[{label}]")
        parts.append(f"[{label}]")
        t += d
    # one subtitle cue per sentence, timed by its share of the characters
    text = lines[sec["n"]]
    sentences = [s.strip() + ("." if not s.strip().endswith((".", "?")) else "") for s in text.replace("? ", "?|").replace(". ", ".|").split("|") if s.strip()]
    total = sum(len(s) for s in sentences)
    c = start + lead
    for k, s in enumerate(sentences):
        dd = durs[sec["n"]] * len(s) / total
        # some lines go to the top, where they don't cover what is being shown (the pet on a card, the box being typed in)
        cues.append((c, c + dd, ("{\\an8}" if k in sec.get("top", []) else "") + s))
        c += dd


def ts(x: float) -> str:
    h, r = divmod(x, 3600)
    m, s = divmod(r, 60)
    return f"{int(h):02d}:{int(m):02d}:{s:06.3f}".replace(".", ",")


(out / "subs.srt").write_text("\n".join(f"{i + 1}\n{ts(a)} --> {ts(b)}\n{s}\n" for i, (a, b, s) in enumerate(cues)))

for n, _ in voice:
    inputs += ["-i", str(here / "tts" / f"{n}.wav")]
first_voice = inputs.count("-i") - len(voice)
af = [f"[{first_voice + k}:a]adelay={int(at * 1000)}|{int(at * 1000)}[a{k}]" for k, (_, at) in enumerate(voice)]
# BorderStyle=3 draws a box in the outline colour: white, a little see-through, with ink-coloured text
style = "FontName=Helvetica Neue,FontSize=12,Bold=1,PrimaryColour=&H00331D1F,OutlineColour=&H1AFFFFFF,BackColour=&H00000000,BorderStyle=3,Outline=6,Shadow=0,MarginV=34,MarginL=18,MarginR=18,Alignment=2"
fc = ";".join(vf + af) + f";{''.join(parts)}concat=n={len(parts)}:v=1:a=0[cat];[cat]subtitles={out / 'subs.srt'}:force_style='{style}'[vout];" + "".join(f"[a{k}]" for k in range(len(voice))) + f"amix=inputs={len(voice)}:normalize=0,apad,atrim=0:{t:.2f}[aout]"
cmd = [FF, "-v", "error", "-y", *inputs, "-filter_complex", fc, "-map", "[vout]", "-map", "[aout]", "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", str(out / "coco_teaser.mp4")]
subprocess.run(cmd, check=True)
print(f"done {t:.1f}s -> {out / 'coco_teaser.mp4'}")
