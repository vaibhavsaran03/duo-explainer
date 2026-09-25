"""voice-svc: text + voice -> mp3 via edge-tts (free, no key)."""
import asyncio, uuid, os
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
import edge_tts

app = FastAPI()
OUT = os.path.join(os.path.dirname(__file__), "out")
os.makedirs(OUT, exist_ok=True)

class TTSReq(BaseModel):
    text: str
    voice: str = "hi-IN-MadhurNeural"

async def synth(text: str, voice: str, path: str):
    await edge_tts.Communicate(text, voice).save(path)

@app.post("/tts")
async def tts(req: TTSReq):
    if not req.text.strip():
        raise HTTPException(400, "empty text")
    path = os.path.join(OUT, f"{uuid.uuid4().hex}.mp3")
    try:
        await synth(req.text, req.voice, path)
    except Exception as e:
        raise HTTPException(502, f"edge-tts failed: {e}")
    if not os.path.exists(path) or os.path.getsize(path) < 1000:
        raise HTTPException(502, "edge-tts returned empty audio")
    return FileResponse(path, media_type="audio/mpeg", filename=os.path.basename(path))

@app.get("/health")
def health():
    return {"ok": True}
