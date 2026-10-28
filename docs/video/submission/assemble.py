"""Cut the submission video (1920x1080, about 3 minutes): cards + the recordings (waits cut, parts enlarged) + narration
+ subtitles.

    cd ~/Documents/hioffer && uv run python ~/Documents/coco/docs/video/submission/assemble.py

Sources are 3200x1800 screencasts (crops [x, y, w, h], always 16:9): main = record.py, chat / sitter / zh = extras.py,
pd = the playdate video's web take, phone = the playdate video's phone take (played inside web_phone.png).
"""
import json
import subprocess
from pathlib import Path

here = Path(__file__).parent
out = here / "out"
pd_out = here.parent / "playdate" / "out"
FF = "/Users/aisandbox/Documents/companydata/node_modules/ffmpeg-static/ffmpeg"  # has libass for subtitles
SRC = {"main": out / "take.mp4", "chat": out / "take_chat.mp4", "sitter": out / "take_sitter.mp4", "zh": out / "take_zh.mp4", "pd": pd_out / "take_web.mp4", "phone": pd_out / "take.mp4"}
FULL = [0, 0, 3200, 1800]
SHARE = [600, 700, 2600, 1462]
REVEAL = [840, 100, 2000, 1125]
CHAT = [600, 60, 2600, 1462]
RULES = [620, 260, 2480, 1395]

SECTIONS = [
    {"n": ["c1"], "lead": 0.4, "shots": [{"card": "cover", "d": 4.6}]},
    {"n": ["c2"], "shots": [{"card": "concept", "d": 13.0}]},
    {"n": ["h1"], "shots": [{"src": "main", "v": [0.2, 3.4], "crop": FULL}, {"src": "main", "v": [4.6, 7.6], "crop": FULL}]},
    {"n": ["s1"], "shots": [{"src": "main", "v": [21.6, 26.4], "crop": SHARE}]},
    {"n": ["s2"], "shots": [{"src": "main", "v": [26.4, 31.4], "crop": SHARE}, {"src": "main", "v": [33.0, 36.0], "crop": SHARE}]},
    {"n": ["p1"], "shots": [{"src": "main", "v": [47.0, 49.6], "crop": FULL}, {"src": "main", "v": [51.6, 58.8], "crop": REVEAL}]},
    {"n": ["p2"], "shots": [{"src": "main", "v": [58.8, 62.0], "crop": REVEAL}, {"src": "main", "v": [64.2, 67.6], "crop": FULL}]},
    {"n": ["k1"], "shots": [{"src": "main", "v": [67.6, 76.0], "crop": FULL}]},
    {"n": ["a1"], "shots": [{"src": "main", "v": [77.6, 80.2], "crop": FULL}, {"src": "main", "v": [93.0, 101.0], "crop": CHAT}]},
    {"n": ["a2"], "shots": [{"src": "chat", "v": [9.6, 16.0], "crop": FULL}]},
    {"n": ["m1"], "shots": [{"src": "main", "v": [117.6, 128.0], "crop": FULL}]},
    {"n": ["l1"], "shots": [{"src": "main", "v": [133.0, 137.4], "crop": FULL}, {"src": "main", "v": [138.0, 145.0], "crop": RULES}]},
    {"n": ["l2"], "shots": [{"src": "chat", "v": [16.0, 19.4], "crop": FULL}, {"src": "chat", "v": [31.8, 41.0], "crop": FULL}]},
    {"n": ["f1"], "shots": [{"src": "pd", "v": [19.0, 23.0], "crop": [560, 520, 1600, 900]}, {"src": "pd", "v": [27.0, 32.4], "crop": [864, 200, 2336, 1314]}]},
    {"n": ["x1"], "shots": [{"phone": [11.4, 14.6]}, {"src": "zh", "v": [0.6, 3.6], "crop": FULL}, {"src": "sitter", "v": [14.0, 18.5], "crop": [400, 0, 2400, 1350]}]},
    {"n": ["b1"], "shots": [{"card": "built", "d": 8.0}]},
    {"n": ["e1"], "shots": [{"card": "end", "d": 5.0}]},
]
lines = {s["id"]: s["text"] for s in json.loads((here / "narration.json").read_text())}
durs = {d["id"]: d["dur"] for d in json.loads((here / "tts" / "durations.json").read_text())}
GAP = 0.3


def length(sh: dict) -> float:
    if "v" in sh:
        return sh["v"][1] - sh["v"][0]
    if "phone" in sh:
        return sh["phone"][1] - sh["phone"][0]
    return sh["d"]


keys = list(SRC)
inputs = sum((["-i", str(SRC[k])] for k in keys), [])
n_in = lambda: inputs.count("-i")  # noqa: E731
parts, vf, cues, voice = [], [], [], []
t = 0.0
for si, sec in enumerate(SECTIONS):
    lead = sec.get("lead", 0.25)
    talk = sum(durs[n] for n in sec["n"]) + GAP * (len(sec["n"]) - 1)
    extra = max(0.0, lead + talk + 0.45 - sum(length(sh) for sh in sec["shots"]))
    c = t + lead
    for n in sec["n"]:
        voice.append((n, c))
        sentences = [x.strip() for x in lines[n].replace("? ", "?|").replace(". ", ".|").replace(": ", ":|").split("|") if x.strip()]
        total = sum(len(x) for x in sentences)
        cc = c
        for x in sentences:
            dd = durs[n] * len(x) / total
            cues.append((cc, cc + dd, x))
            cc += dd
        c += durs[n] + GAP
    for i, sh in enumerate(sec["shots"]):
        last = i == len(sec["shots"]) - 1
        label = f"s{si}_{i}"
        d = length(sh) + (extra if last else 0)
        hold = f",tpad=stop_mode=clone:stop_duration={extra:.2f}" if last and extra else ""
        if "card" in sh:
            inputs += ["-loop", "1", "-t", f"{d:.2f}", "-i", str(out / f"web_{sh['card']}.png")]
            vf.append(f"[{n_in() - 1}:v]scale=1920:1080,fps=30,format=yuv420p,setsar=1[{label}]")
        elif "phone" in sh:
            a, b = sh["phone"]
            inputs += ["-loop", "1", "-t", f"{d:.2f}", "-i", str(out / "web_phone.png")]
            bg = n_in() - 1
            vf.append(f"[{keys.index('phone')}:v]trim={a}:{b},setpts=PTS-STARTPTS,scale=412:-2:flags=lanczos,fps=30{hold}[{label}p];[{bg}:v]scale=1920:1080,fps=30[{label}b];[{label}b][{label}p]overlay=1274:90:shortest=1,format=yuv420p,setsar=1[{label}]")
        else:
            a, b = sh["v"]
            x, y, w, h = sh["crop"]
            vf.append(f"[{keys.index(sh['src'])}:v]trim={a}:{b},setpts=PTS-STARTPTS,crop={w}:{h}:{x}:{y},scale=1920:1080:flags=lanczos,fps=30,format=yuv420p,setsar=1{hold}[{label}]")
        parts.append(f"[{label}]")
        t += d


def ts(x: float) -> str:
    h, r = divmod(x, 3600)
    m, s = divmod(r, 60)
    return f"{int(h):02d}:{int(m):02d}:{s:06.3f}".replace(".", ",")


(out / "subs.srt").write_text("\n".join(f"{i + 1}\n{ts(a)} --> {ts(b)}\n{s}\n" for i, (a, b, s) in enumerate(cues)))
first_voice = n_in()
for n, _ in voice:
    inputs += ["-i", str(here / "tts" / f"{n}.wav")]
af = [f"[{first_voice + k}:a]adelay={int(at * 1000)}|{int(at * 1000)}[a{k}]" for k, (_, at) in enumerate(voice)]
style = "FontName=Helvetica Neue,FontSize=15,Bold=1,PrimaryColour=&H00331D1F,OutlineColour=&H1AFFFFFF,BackColour=&H00000000,BorderStyle=3,Outline=5,Shadow=0,MarginV=16,Alignment=2"
fc = ";".join(vf + af) + f";{''.join(parts)}concat=n={len(parts)}:v=1:a=0[cat];[cat]subtitles={out / 'subs.srt'}:force_style='{style}'[vout];" + "".join(f"[a{k}]" for k in range(len(voice))) + f"amix=inputs={len(voice)}:normalize=0,apad,atrim=0:{t:.2f}[aout]"
cmd = [FF, "-v", "error", "-y", *inputs, "-filter_complex", fc, "-map", "[vout]", "-map", "[aout]", "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", str(out / "cocoverse_submission.mp4")]
subprocess.run(cmd, check=True)
print(f"done {t:.1f}s -> {out / 'cocoverse_submission.mp4'}")
