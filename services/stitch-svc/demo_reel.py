"""Build the rick.theengineer-style motion-graphics demo reel on 'How does UPI work'.
Lines -> voice-svc /tts_timed -> mp3 + word timings -> scenes props JSON -> Remotion render."""
import json, os, subprocess, base64, sys
import urllib.request

VOICE = "http://localhost:8101"
APP = os.path.join(os.path.dirname(__file__), "remotion-app")
PUB = os.path.join(APP, "public", "reel")
os.makedirs(PUB, exist_ok=True)

VOICES = {"doc": "hi-IN-MadhurNeural", "bhai": "en-IN-PrabhatNeural"}

SCENES = [
    dict(pill="THE QUESTION",
         statement="UPI se paise jaate kaise hain?",
         sub="The whole pipeline, in 20 seconds.",
         diagram={"type": "chips", "items": ["Phone", "Bank", "Done"]},
         speaker="bhai",
         line="Bhai, UPI se paise bhejna toh ek dum easy hai. Par andar jaake hota kya hai?"),
    dict(pill="THE PIPELINE",
         statement="It's really a long pipeline.",
         diagram={"type": "steps", "items": [
             {"title": "YOUR APP", "sub": "GPay, PhonePe, Paytm"},
             {"title": "PSP SWITCH", "sub": "routes the payment"},
             {"title": "NPCI RAILS", "sub": "the actual UPI network"},
             {"title": "BANK CORE", "sub": "money actually moves"},
         ]},
         speaker="doc",
         line="Simple baat nahi hai re. Andar ek poori pipeline chalti hai. App, switch, NPCI, bank."),
    dict(pill="THE FLOW",
         statement="Ramesh pays Suresh ₹500.",
         diagram={"type": "chips",
                  "items": ["Ramesh", "→", "GPay", "→", "NPCI", "→", "Bank", "→", "Suresh"],
                  "stat": "5 hops", "statLabel": "in under 2 seconds"},
         speaker="bhai",
         line="Matlab Ramesh ne Suresh ko paanch sau rupaye bheje, toh andar paanch jumps hote hain. Do second ke andar."),
    dict(pill="THE SCALE",
         statement="India runs on this.",
         diagram={"type": "stat", "big": "13B+", "label": "UPI transactions every month"},
         footnote="NPCI monthly product statistics, 2025",
         speaker="doc",
         line="Aur yeh poora system mahine ke terah billion transactions handle karta hai. Duniya ka sabse bada real-time payment network."),
]

def tts_timed(text, voice, out_mp3):
    req = urllib.request.Request(VOICE + "/tts_timed",
        data=json.dumps({"text": text, "voice": voice}).encode(),
        headers={"Content-Type": "application/json"})
    d = json.load(urllib.request.urlopen(req, timeout=120))
    with open(out_mp3, "wb") as f:
        f.write(base64.b64decode(d["audio_b64"]))
    return d["words"]

def dur_of(path):
    out = subprocess.run(["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
                          "-of", "csv=p=0", path], capture_output=True, text=True).stdout.strip()
    return float(out)

scenes = []
for i, s in enumerate(SCENES):
    mp3 = os.path.join(PUB, f"line{i}.mp3")
    words = tts_timed(s["line"], VOICES[s["speaker"]], mp3)
    dur = dur_of(mp3)
    scenes.append(dict(pill=s["pill"], statement=s["statement"], sub=s.get("sub"),
                       diagram=s["diagram"], footnote=s.get("footnote"),
                       speaker=s["speaker"], audio=f"reel/line{i}.mp3",
                       words=words, dur=dur))
    print(f"line{i}: {dur:.1f}s, {len(words)} words")

props = {"scenes": scenes}
with open(os.path.join(APP, "reel_props.json"), "w") as f:
    json.dump(props, f)
total = sum(s["dur"] + 0.4 for s in scenes)
print(f"total: {total:.1f}s -> rendering")
r = subprocess.run(["npx", "remotion", "render", "ReelVideo", "out/reel_demo.mp4",
                    "--props=reel_props.json"], cwd=APP, capture_output=True, text=True)
print(r.stdout[-500:])
print(r.stderr[-1500:], file=sys.stderr)
