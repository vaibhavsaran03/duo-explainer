"""stitch-svc: dialogue lines + assets -> 720p MP4 via Remotion."""
import base64, json, os, subprocess, uuid
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

app = FastAPI()
ROOT = os.path.dirname(os.path.abspath(__file__))
APP = os.path.join(ROOT, "remotion-app")

class RenderJob(BaseModel):
    topic: str
    speakers: dict  # id -> {"art": "assets/xxx.jpg", "name": str}
    lines: list     # [{speaker, text, audio: "assets/l1.mp3", start, duration}]
    totalFrames: int
    assets: list    # [{name: "assets/l1.mp3", data_b64: str}]

@app.post("/render")
def render(job: RenderJob):
    pub = os.path.join(APP, "public")
    for a in job.assets:
        dest = os.path.join(pub, a["name"])
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, "wb") as f:
            f.write(base64.b64decode(a["data_b64"]))
    props = {"topic": job.topic, "fps": 30, "speakers": job.speakers,
             "lines": job.lines, "totalFrames": job.totalFrames}
    props_path = os.path.join(APP, "props_job.json")
    with open(props_path, "w") as f:
        json.dump(props, f)
    out_name = f"out/{uuid.uuid4().hex}.mp4"
    os.makedirs(os.path.join(APP, "out"), exist_ok=True)
    r = subprocess.run(["npx", "remotion", "render", "src/index.ts", "DuoVideo",
                        out_name, "--props=props_job.json"],
                       cwd=APP, capture_output=True, text=True, timeout=900)
    out_path = os.path.join(APP, out_name)
    if r.returncode != 0 or not os.path.exists(out_path):
        raise HTTPException(502, f"remotion render failed: {r.stdout[-2000:]} {r.stderr[-2000:]}")
    return FileResponse(out_path, media_type="video/mp4", filename="video.mp4")

@app.get("/health")
def health():
    return {"ok": True}
