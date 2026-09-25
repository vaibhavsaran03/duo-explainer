"""script-svc: topic + duo + length -> dialogue JSON via Groq (strict JSON mode)."""
import json, os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import httpx

app = FastAPI()
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL = "openai/gpt-oss-120b"
DUOS_PATH = os.environ.get("DUOS_PATH", os.path.join(os.path.dirname(__file__), "..", "..", "duos", "duos.json"))

class ScriptReq(BaseModel):
    topic: str
    duo_id: str = "madlab"
    length_sec: int = 30

def load_duo(duo_id: str):
    with open(DUOS_PATH) as f:
        duos = json.load(f)
    for d in duos:
        if d["id"] == duo_id:
            return d
    raise HTTPException(400, f"unknown duo_id {duo_id}")

@app.post("/script")
async def script(req: ScriptReq):
    if os.environ.get("SCRIPT_SVC_MOCK") == "1":
        duo = load_duo(req.duo_id)
        ids = list(duo["personas"].keys())
        mock_lines = [
            {"speaker": ids[0], "text": f"Arre, aaj ka topic hai - {req.topic}! Sun, bahut simple hai yeh."},
            {"speaker": ids[1], "text": "Achha? Mujhe toh bahut complicated lagta hai yeh. Kaise kaam karta hai?"},
            {"speaker": ids[0], "text": "Dekh, isko aise samajh - chhote chhote parts mein tod do, har part apna kaam karta hai."},
            {"speaker": ids[1], "text": "Ohhh! Matlab ek bada problem, kai chhote solutions ka total?"},
            {"speaker": ids[0], "text": "Exactly! Aur har part ko alag test kar sakte ho, alag fix kar sakte ho."},
            {"speaker": ids[1], "text": "Sahi hai yaar! Ab samajh aaya. Toh shuru kahan se kare?"},
            {"speaker": ids[0], "text": "Baby steps! Pehle ek chhota sa working version banao, phir features jodte jao."},
        ]
        return {"duo_id": req.duo_id, "topic": req.topic, "length_sec": req.length_sec,
                "lines": mock_lines[:max(4, req.length_sec // 5)], "mock": True}
    key = os.environ.get("GROQ_API_KEY")
    if not key:
        raise HTTPException(500, "GROQ_API_KEY not set")
    duo = load_duo(req.duo_id)
    words = int(req.length_sec * 2.3)
    personas = "\n".join(f'- "{pid}": {p["role"]}' for pid, p in duo["personas"].items())
    prompt = (
        f'Write a fun, punchy Hinglish (Hindi-English mix, roman script) dialogue that explains the topic: "{req.topic}".\n'
        f'Duo: {duo["name"]}.\nCharacters:\n{personas}\n'
        f'Rules: exactly {max(6, req.length_sec // 5)} to {max(8, req.length_sec // 4)} alternating lines, ~{words} words total. '
        'The explainer teaches accurately; the asker reacts naturally. No slang overload, keep it funny but clear.\n'
        'Return ONLY valid JSON: {"lines": [{"speaker": "<character id>", "text": "<line>"}, ...]}'
    )
    body = {"model": MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "response_format": {"type": "json_object"},
            "temperature": 0.8}
    async with httpx.AsyncClient(timeout=60) as c:
        r = await c.post(GROQ_URL, json=body, headers={"Authorization": f"Bearer {key}"})
    if r.status_code != 200:
        raise HTTPException(502, f"groq {r.status_code}: {r.text[:500]}")
    content = r.json()["choices"][0]["message"]["content"]
    try:
        data = json.loads(content)
        assert isinstance(data["lines"], list) and data["lines"]
        valid = set(duo["personas"].keys())
        for l in data["lines"]:
            assert l["speaker"] in valid and l["text"].strip()
    except Exception:
        raise HTTPException(502, f"groq returned malformed script: {content[:500]}")
    return {"duo_id": req.duo_id, "topic": req.topic, "length_sec": req.length_sec, **data}

@app.get("/health")
def health():
    return {"ok": True}
