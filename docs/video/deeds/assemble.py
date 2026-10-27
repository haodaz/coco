"""Cut the "judge by deeds" teaser: cards + the phone recording (waits cut, parts enlarged) + narration + subtitles.

    cd ~/Documents/hioffer && uv run python ~/Documents/coco/docs/video/deeds/assemble.py

Output: out/cocoverse_deeds.mp4, 1080x1920. Video times are seconds in out/take.mp4 (read the beats and a contact
sheet first); crops are [x, y, w, h] in the 1170x2532 recording, always 9:16.
"""
import json
import subprocess
from pathlib import Path

here = Path(__file__).parent
out = here / "out"
FF = "/Users/aisandbox/Documents/companydata/node_modules/ffmpeg-static/ffmpeg"  # has libass for subtitles
FULL_TOP = [0, 0, 1170, 2080]
FULL_BOTTOM = [0, 452, 1170, 2080]

# each section: its narration lines (spoken one after another), its pictures, and which subtitle lines go on top
SECTIONS = [
    {"n": ["n1"], "lead": 0.5, "top": True, "shots": [{"card": "cover", "d": 4.6}, {"card": "contrast", "d": 9.2}]},
    {"n": ["n2a", "n2b"], "top": True, "shots": [{"card": "saying", "d": 6.6}]},
    {"n": ["n3"], "top": True, "shots": [{"v": [1.5, 4.2], "crop": FULL_BOTTOM}, {"v": [12.8, 17.4], "crop": FULL_BOTTOM}]},
    {"n": ["n4"], "top": True, "shots": [{"v": [49.3, 57.6], "crop": FULL_BOTTOM}]},
    {"n": ["n5"], "shots": [{"v": [68.4, 74.4], "crop": FULL_TOP}]},
    {"n": ["n6"], "top": True, "shots": [{"v": [74.9, 76.6], "crop": FULL_BOTTOM}, {"v": [90.66, 91.1], "crop": FULL_BOTTOM}]},
    {"n": ["n7"], "top": True, "shots": [{"card": "end", "d": 5.0}]},
]
lines = {s["id"]: s["text"] for s in json.loads((here / "narration.json").read_text())}
durs = {d["id"]: d["dur"] for d in json.loads((here / "tts" / "durations.json").read_text())}
GAP = 0.3  # between two lines in one section

inputs = ["-i", str(out / "take.mp4")]
parts, vf, cues, voice = [], [], [], []
t = 0.0
for si, sec in enumerate(SECTIONS):
    lead = sec.get("lead", 0.25)
    talk = sum(durs[n] for n in sec["n"]) + GAP * (len(sec["n"]) - 1)
    need = lead + talk + 0.45
    have = sum(sh["d"] if "card" in sh else sh["v"][1] - sh["v"][0] for sh in sec["shots"])
    extra = max(0.0, need - have)  # hold the last picture while the line finishes
    c = t + lead
    for n in sec["n"]:
        voice.append((n, c))
        text = lines[n]
        sentences = [x.strip() for x in text.replace("? ", "?|").replace(". ", ".|").replace(": ", ":|").split("|") if x.strip()]
        total = sum(len(x) for x in sentences)
        cc = c
        for x in sentences:
            dd = durs[n] * len(x) / total
            cues.append((cc, cc + dd, ("{\\an8}" if sec.get("top") else "") + x))
            cc += dd
        c += durs[n] + GAP
    for i, sh in enumerate(sec["shots"]):
        last = i == len(sec["shots"]) - 1
        label = f"s{si}_{i}"
        if "card" in sh:
            d = sh["d"] + (extra if last else 0)
            inputs += ["-loop", "1", "-t", f"{d:.2f}", "-i", str(out / f"card_{sh['card']}.png")]
            vf.append(f"[{inputs.count('-i') - 1}:v]scale=1080:1920,fps=30,format=yuv420p,setsar=1[{label}]")
        else:
            a, b = sh["v"]
            x, y, w, h = sh["crop"]
            d = b - a + (extra if last else 0)
            hold = f",tpad=stop_mode=clone:stop_duration={extra:.2f}" if last and extra else ""
            vf.append(f"[0:v]trim={a}:{b},setpts=PTS-STARTPTS,crop={w}:{h}:{x}:{y},scale=1080:1920:flags=lanczos,fps=30,format=yuv420p,setsar=1{hold}[{label}]")
        parts.append(f"[{label}]")
        t += d


def ts(x: float) -> str:
    h, r = divmod(x, 3600)
    m, s = divmod(r, 60)
    return f"{int(h):02d}:{int(m):02d}:{s:06.3f}".replace(".", ",")


(out / "subs.srt").write_text("\n".join(f"{i + 1}\n{ts(a)} --> {ts(b)}\n{s}\n" for i, (a, b, s) in enumerate(cues)))
first_voice = inputs.count("-i")
for n, _ in voice:
    inputs += ["-i", str(here / "tts" / f"{n}.wav")]
af = [f"[{first_voice + k}:a]adelay={int(at * 1000)}|{int(at * 1000)}[a{k}]" for k, (_, at) in enumerate(voice)]
# BorderStyle=3 draws a box in the outline colour: white, a little see-through, with ink-coloured text
style = "FontName=Helvetica Neue,FontSize=12,Bold=1,PrimaryColour=&H00331D1F,OutlineColour=&H1AFFFFFF,BackColour=&H00000000,BorderStyle=3,Outline=6,Shadow=0,MarginV=30,MarginL=18,MarginR=18,Alignment=2"
fc = ";".join(vf + af) + f";{''.join(parts)}concat=n={len(parts)}:v=1:a=0[cat];[cat]subtitles={out / 'subs.srt'}:force_style='{style}'[vout];" + "".join(f"[a{k}]" for k in range(len(voice))) + f"amix=inputs={len(voice)}:normalize=0,apad,atrim=0:{t:.2f}[aout]"
cmd = [FF, "-v", "error", "-y", *inputs, "-filter_complex", fc, "-map", "[vout]", "-map", "[aout]", "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", str(out / "cocoverse_deeds.mp4")]
subprocess.run(cmd, check=True)
print(f"done {t:.1f}s -> {out / 'cocoverse_deeds.mp4'}")
