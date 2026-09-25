"""orchestrator: topic -> script-svc -> voice-svc (per line) -> stitch-svc -> mp4."""
import base64, json, os, subprocess
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
import httpx

app = FastAPI()
SCRIPT_URL = os.environ.get("SCRIPT_SVC", "http://localhost:8102")
VOICE_URL = os.environ.get("VOICE_SVC", "http://localhost:8101")
STITCH_URL = os.environ.get("STITCH_SVC", "http://localhost:8103")
DUOS_PATH = os.environ.get("DUOS_PATH", os.path.join(os.path.dirname(__file__), "..", "..", "duos", "duos.json"))

class VideoReq(BaseModel):
    topic: str
    duo_id: str = "madlab"
    length_sec: int = 30

def ffprobe_dur(path):
    return float(subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]).strip())

@app.post("/video")
async def video(req: VideoReq):
    workdir = f"/tmp/duo-job-{os.getpid()}"
    os.makedirs(workdir, exist_ok=True)
    async with httpx.AsyncClient(timeout=180) as c:
        r = await c.post(f"{SCRIPT_URL}/script",
                         json={"topic": req.topic, "duo_id": req.duo_id, "length_sec": req.length_sec})
        if r.status_code != 200:
            raise HTTPException(502, f"script-svc: {r.text[:400]}")
        script = r.json()
        with open(DUOS_PATH) as f:
            duo = next(d for d in json.load(f) if d["id"] == req.duo_id)
        assets, lines, frame = [], [], 0
        for i, line in enumerate(script["lines"]):
            voice = duo["personas"][line["speaker"]]["voice"]
            rv = await c.post(f"{VOICE_URL}/tts", json={"text": line["text"], "voice": voice})
            if rv.status_code != 200:
                raise HTTPException(502, f"voice-svc: {rv.text[:400]}")
            name = f"assets/l{i}.mp3"
            p = os.path.join(workdir, f"l{i}.mp3")
            with open(p, "wb") as fh:
                fh.write(rv.content)
            dur = ffprobe_dur(p)
            n = round(dur * 30)
            lines.append({"speaker": line["speaker"], "text": line["text"],
                          "audio": name, "start": frame, "duration": n})
            frame += n
            assets.append({"name": name, "data_b64": base64.b64encode(rv.content).decode()})
        speakers = {}
        for pid, p in duo["personas"].items():
            art_rel = p["art"]
            art_path = os.path.join(os.path.dirname(DUOS_PATH), art_rel)
            art_name = f"assets/art-{pid}{os.path.splitext(art_rel)[1]}"
            if os.path.exists(art_path):
                with open(art_path, "rb") as fh:
                    assets.append({"name": art_name, "data_b64": base64.b64encode(fh.read()).decode()})
            speakers[pid] = {"art": art_name, "name": pid}
        job = {"topic": req.topic, "speakers": speakers, "lines": lines,
               "totalFrames": frame + 15, "assets": assets}
        rr = await c.post(f"{STITCH_URL}/render", json=job, timeout=900)
        if rr.status_code != 200:
            raise HTTPException(502, f"stitch-svc: {rr.text[:400]}")
        out = os.path.join(workdir, "video.mp4")
        with open(out, "wb") as fh:
            fh.write(rr.content)
        return FileResponse(out, media_type="video/mp4", filename=f"{req.topic[:30]}.mp4")

@app.get("/health")
def health():
    return {"ok": True}
