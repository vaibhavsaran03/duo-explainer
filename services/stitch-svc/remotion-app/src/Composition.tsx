import React from "react";
import { AbsoluteFill, Audio, Img, Sequence, useCurrentFrame, interpolate, staticFile } from "remotion";

export type Line = { speaker: string; text: string; audio: string; start: number; duration: number };
export type DuoVideoProps = {
  topic: string;
  fps: number;
  speakers: Record<string, { art: string; name: string }>;
  lines: Line[];
  totalFrames: number;
};

const Caption: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 6], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", bottom: 60, width: "100%", textAlign: "center", opacity }}>
      <span style={{
        background: "rgba(0,0,0,0.75)", color: "#FFD700", fontSize: 44,
        fontFamily: "Arial, sans-serif", fontWeight: 700, padding: "10px 24px",
        borderRadius: 12, lineHeight: 1.3, display: "inline-block", maxWidth: "90%",
      }}>{text}</span>
    </div>
  );
};

const Speaker: React.FC<{ art: string; active: boolean; side: "left" | "right" }> = ({ art, active, side }) => {
  const frame = useCurrentFrame();
  const pop = interpolate(frame, [0, 8], [1, active ? 1.06 : 0.97], { extrapolateRight: "clamp" });
  return (
    <Img src={staticFile(art)} style={{
      position: "absolute", bottom: 140, [side]: 60, width: 480, height: 480,
      objectFit: "contain", transform: `scale(${pop})`,
      filter: active ? "none" : "brightness(0.45) saturate(0.5)",
      transition: "filter 0.2s",
    }} />
  );
};

export const DuoVideo: React.FC<DuoVideoProps> = ({ topic, speakers, lines }) => {
  const frame = useCurrentFrame();
  const current = lines.find((l) => frame >= l.start && frame < l.start + l.duration);
  const ids = Object.keys(speakers);
  return (
    <AbsoluteFill style={{ background: "linear-gradient(160deg,#1a1a2e 0%,#16213e 60%,#0f3460 100%)" }}>
      <div style={{ position: "absolute", top: 40, width: "100%", textAlign: "center" }}>
        <span style={{ color: "white", fontSize: 52, fontFamily: "Arial, sans-serif", fontWeight: 800 }}>{topic}</span>
      </div>
      {ids.map((id, i) => (
        <Speaker key={id} art={speakers[id].art} side={i === 0 ? "left" : "right"}
          active={current?.speaker === id} />
      ))}
      {lines.map((l, i) => (
        <Sequence key={i} from={l.start} durationInFrames={l.duration}>
          <Audio src={staticFile(l.audio)} />
          <Caption text={l.text} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
