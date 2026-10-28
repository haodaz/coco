"""Cut the playdate video for YouTube (1920x1080): cards + the web recording (parts enlarged) + a phone insert +
narration + subtitles.

    cd ~/Documents/hioffer && uv run python ~/Documents/coco/docs/video/playdate/assemble_web.py

Video times are seconds in out/take_web.mp4 (3200x1800; read beats_web.json and a contact sheet first); crops are
[x, y, w, h], always 16:9. A "still" holds one frame (the card modal only shows for a moment in the screencast). The
phone insert plays out/take.mp4 (the phone recording) inside the phone on web_phone.png.
"""
import json
import subprocess
from pathlib import Path

here = Path(__file__).parent
out = here / "out"
FF = "/Users/aisandbox/Documents/companydata/node_modules/ffmpeg-static/ffmpeg"  # has libass for subtitles
FULL = [0, 0, 3200, 1800]

SECTIONS = [
    {"n": ["n1"], "lead": 0.4, "shots": [{"card": "cover", "d": 6.2}]},
    {"n": ["n2"], "shots": [{"card": "concept", "d": 10.0}]},
    {"n": ["n3"], "shots": [{"v": [3.0, 6.4], "crop": [1000, 150, 2200, 1238]}, {"v": [6.4, 9.8], "crop": FULL}]},
    {"n": ["n4"], "shots": [{"v": [12.0, 15.0], "crop": FULL}, {"v": [19.0, 23.0], "crop": [560, 520, 1600, 900]}]},
    {"n": ["n4b"], "shots": [{"phone": [11.4, 15.8]}]},
    {"n": ["n5"], "shots": [{"v": [27.0, 32.4], "crop": [864, 200, 2336, 1314]}, {"still": 33.6, "d": 1.5, "crop": [704, 90, 1792, 1008]}]},
    {"n": ["n6"], "shots": [{"v": [38.5, 47.0], "crop": [1536, 760, 1664, 936]}]},
    {"n": ["n7"], "shots": [{"card": "end", "d": 5.0}]},
]
lines = {s["id"]: s["text"] for s in json.loads((here / "narration.json").read_text())}
durs = {d["id"]: d["dur"] for d in json.loads((here / "tts" / "durations.json").read_text())}
GAP = 0.3  # between two lines in one section


def length(sh: dict) -> float:
    if "v" in sh:
        return sh["v"][1] - sh["v"][0]
    if "phone" in sh:
        return sh["phone"][1] - sh["phone"][0]
    return sh["d"]


inputs = ["-i", str(out / "take_web.mp4"), "-i", str(out / "take.mp4")]
n_in = lambda: inputs.count("-i")  # noqa: E731
parts, vf, cues, voice = [], [], [], []
t = 0.0
for si, sec in enumerate(SECTIONS):
    lead = sec.get("lead", 0.25)
    talk = sum(durs[n] for n in sec["n"]) + GAP * (len(sec["n"]) - 1)
    need = lead + talk + 0.45
    extra = max(0.0, need - sum(length(sh) for sh in sec["shots"]))  # hold the last picture while the line finishes
    c = t + lead
    for n in sec["n"]:
        voice.append((n, c))
        text = lines[n]
        sentences = [x.strip() for x in text.replace("? ", "?|").replace(". ", ".|").replace(": ", ":|").split("|") if x.strip()]
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
        elif "still" in sh:
            x, y, w, h = sh["crop"]
            vf.append(f"[0:v]trim={sh['still']}:{sh['still'] + 0.04},setpts=PTS-STARTPTS,crop={w}:{h}:{x}:{y},scale=1920:1080:flags=lanczos,fps=30,format=yuv420p,setsar=1,tpad=stop_mode=clone:stop_duration={d:.2f},trim=0:{d:.2f}[{label}]")
        elif "phone" in sh:
            a, b = sh["phone"]
            inputs += ["-loop", "1", "-t", f"{d:.2f}", "-i", str(out / "web_phone.png")]
            bg = n_in() - 1
            vf.append(f"[1:v]trim={a}:{b},setpts=PTS-STARTPTS,scale=412:-2:flags=lanczos,fps=30{hold}[{label}p];[{bg}:v]scale=1920:1080,fps=30[{label}b];[{label}b][{label}p]overlay=1274:90:shortest=1,format=yuv420p,setsar=1[{label}]")
        else:
            a, b = sh["v"]
            x, y, w, h = sh["crop"]
            vf.append(f"[0:v]trim={a}:{b},setpts=PTS-STARTPTS,crop={w}:{h}:{x}:{y},scale=1920:1080:flags=lanczos,fps=30,format=yuv420p,setsar=1{hold}[{label}]")
        parts.append(f"[{label}]")
        t += d


def ts(x: float) -> str:
    h, r = divmod(x, 3600)
    m, s = divmod(r, 60)
    return f"{int(h):02d}:{int(m):02d}:{s:06.3f}".replace(".", ",")


(out / "subs_web.srt").write_text("\n".join(f"{i + 1}\n{ts(a)} --> {ts(b)}\n{s}\n" for i, (a, b, s) in enumerate(cues)))
first_voice = n_in()
for n, _ in voice:
    inputs += ["-i", str(here / "tts" / f"{n}.wav")]
af = [f"[{first_voice + k}:a]adelay={int(at * 1000)}|{int(at * 1000)}[a{k}]" for k, (_, at) in enumerate(voice)]
style = "FontName=Helvetica Neue,FontSize=15,Bold=1,PrimaryColour=&H00331D1F,OutlineColour=&H1AFFFFFF,BackColour=&H00000000,BorderStyle=3,Outline=5,Shadow=0,MarginV=16,Alignment=2"
fc = ";".join(vf + af) + f";{''.join(parts)}concat=n={len(parts)}:v=1:a=0[cat];[cat]subtitles={out / 'subs_web.srt'}:force_style='{style}'[vout];" + "".join(f"[a{k}]" for k in range(len(voice))) + f"amix=inputs={len(voice)}:normalize=0,apad,atrim=0:{t:.2f}[aout]"
cmd = [FF, "-v", "error", "-y", *inputs, "-filter_complex", fc, "-map", "[vout]", "-map", "[aout]", "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", str(out / "cocoverse_playdate_web.mp4")]
subprocess.run(cmd, check=True)
print(f"done {t:.1f}s -> {out / 'cocoverse_playdate_web.mp4'}")
