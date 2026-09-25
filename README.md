# duo-explainer

Type any topic, pick a duo, get a 30-60s explainer video back - two characters arguing their way to clarity, in Hinglish.

## Architecture (microservices, baby steps)

| Service | What it does | Runs on |
|---|---|---|
| `services/script-svc` | topic + duo + length -> dialogue JSON (Groq, strict JSON mode) | FastAPI :8102 |
| `services/voice-svc` | text + voice -> mp3 (edge-tts, free Indian voices) | FastAPI :8101 |
| `services/stitch-svc` | lines + art + audio -> 720p MP4 (Remotion) | FastAPI :8103 |
| `services/orchestrator` | chains script -> voices -> stitch -> final video | FastAPI :8104 |
| `duos/duos.json` | duo configs: personas, voices, art | - |
| `web/` | React UI (coming) | - |

Free stack only: Groq free tier, edge-tts, Pollinations art, Remotion (free for individuals), Render/Vercel free hosting.

## Milestones
- [x] step-0: all 5 components verified end-to-end
- [x] first Lite video rendered (23.5s, 720p, speaker highlights + synced captions)
- [ ] full pipeline: topic -> video in one call
- [ ] React UI
