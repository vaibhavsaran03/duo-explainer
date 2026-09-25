import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig, staticFile} from 'remotion';

type W = {word: string; start: number; end: number};
type Diagram =
  | {type: 'steps'; items: {title: string; sub: string; icon: string}[]}
  | {type: 'chips'; items: string[]; stat?: string; statLabel?: string}
  | {type: 'stat'; big: string; label: string}
  | {type: 'none'};
export type Scene = {
  pill: string; statement: string; sub?: string;
  diagram: Diagram; footnote?: string;
  speaker: 'doc' | 'bhai';
  audio: string; words: W[]; dur: number;
};
type Props = {scenes: Scene[]};

export const SCENE_GAP = 0.4; // seconds between scenes
const NAVY = '#1d2c4d';
const BLUE = '#2563eb';
const INK = '#101828';
const MUTED = '#98a2b3';

const Grid: React.FC = () => (
  <AbsoluteFill style={{
    backgroundColor: '#f8f9fb',
    backgroundImage:
      'linear-gradient(rgba(16,24,40,0.055) 1px, transparent 1px),' +
      'linear-gradient(90deg, rgba(16,24,40,0.055) 1px, transparent 1px)',
    backgroundSize: '34px 34px',
  }}/>
);

const Pill: React.FC<{text: string; index: number; total: number}> = ({text, index, total}) => (
  <div style={{position: 'absolute', top: 46, left: 42, right: 42, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
    <div style={{
      fontFamily: '"SF Mono", Menlo, monospace', fontSize: 20, fontWeight: 600, letterSpacing: 2,
      color: '#475467', border: '1.5px solid #d0d5dd', borderRadius: 999, padding: '8px 22px', background: 'white',
    }}>{text}</div>
    <div style={{display: 'flex', gap: 8}}>
      {Array.from({length: total}).map((_, i) => (
        <div key={i} style={{width: 34, height: 5, borderRadius: 3, background: i <= index ? '#475467' : '#e4e7ec'}}/>
      ))}
    </div>
  </div>
);

const Header: React.FC<{statement: string; sub?: string}> = ({statement, sub}) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 12], [0, 1], {extrapolateRight: 'clamp'});
  const y = interpolate(frame, [0, 12], [18, 0], {extrapolateRight: 'clamp'});
  return (
    <div style={{position: 'absolute', top: 128, left: 46, right: 46, textAlign: 'center', opacity: o, transform: `translateY(${y}px)`}}>
      <div style={{fontSize: 52, fontWeight: 800, color: INK, lineHeight: 1.15, fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif'}}>
        {statement}
      </div>
      {sub ? <div style={{marginTop: 18, fontSize: 30, color: MUTED, fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif'}}>{sub}</div> : null}
    </div>
  );
};

const StepsDiagram: React.FC<{items: {title: string; sub: string; icon: string}[]; dur: number}> = ({items, dur}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const totalFrames = dur * fps;
  const intro = 0.6 * fps;
  const window = (totalFrames - intro) / items.length;
  return (
    <div style={{position: 'absolute', top: 330, left: 56, right: 56, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22}}>
      {items.map((it, i) => {
        const pop = spring({frame: frame - i * 5, fps, config: {damping: 14}});
        const active = frame >= intro + i * window && frame < intro + (i + 1) * window;
        const done = frame >= intro + (i + 1) * window;
        return (
          <div key={i} style={{
            transform: `scale(${0.85 + pop * 0.15})`, opacity: pop,
            background: active ? '#eaf1fe' : 'white',
            border: active ? `2.5px solid ${BLUE}` : '1.5px solid #e4e7ec',
            borderRadius: 22, padding: '22px 22px 20px', minHeight: 150,
            boxShadow: active ? '0 10px 30px rgba(37,99,235,0.18)' : '0 2px 8px rgba(16,24,40,0.05)',
          }}>
            <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
              <div style={{
                width: 40, height: 40, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: active ? BLUE : done ? '#98b6f5' : '#eef2f6',
                color: active || done ? 'white' : '#667085', fontWeight: 800, fontSize: 21,
              }}>{i + 1}</div>
              <div style={{fontSize: 24, fontWeight: 800, color: INK}}>{it.title}</div>
            </div>
            <div style={{marginTop: 10, fontSize: 22, color: '#667085', lineHeight: 1.3}}>{it.sub}</div>
          </div>
        );
      })}
    </div>
  );
};

const ChipsDiagram: React.FC<{items: string[]; stat?: string; statLabel?: string; dur: number}> = ({items, stat, statLabel, dur}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const intro = 0.5 * fps;
  const window = (dur * fps - intro) / (items.length + (stat ? 1.5 : 0));
  return (
    <div style={{position: 'absolute', top: 380, left: 40, right: 40, textAlign: 'center'}}>
      <div style={{display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center'}}>
        {items.map((c, i) => {
          const pop = spring({frame: frame - i * 4, fps, config: {damping: 14}});
          const active = frame >= intro + i * window;
          return (
            <div key={i} style={{
              transform: `scale(${0.8 + pop * 0.2})`, opacity: pop,
              padding: '14px 26px', borderRadius: 14, fontSize: 30, fontWeight: 700,
              background: active ? BLUE : 'white', color: active ? 'white' : INK,
              border: active ? `2px solid ${BLUE}` : '1.5px solid #d0d5dd',
              fontFamily: '"SF Mono", Menlo, monospace',
              transition: 'background 0.15s',
            }}>{c}</div>
          );
        })}
      </div>
      {stat ? (
        <div style={{marginTop: 60, opacity: frame >= intro + items.length * window ? 1 : 0.15}}>
          <div style={{fontSize: 78, fontWeight: 800, color: BLUE}}>{stat}</div>
          <div style={{fontSize: 26, color: MUTED, marginTop: 6}}>{statLabel}</div>
        </div>
      ) : null}
    </div>
  );
};

const StatDiagram: React.FC<{big: string; label: string}> = ({big, label}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const pop = spring({frame: frame - 10, fps, config: {damping: 12}});
  return (
    <div style={{position: 'absolute', top: 430, left: 0, right: 0, textAlign: 'center', transform: `scale(${0.7 + pop * 0.3})`, opacity: pop}}>
      <div style={{fontSize: 130, fontWeight: 800, color: BLUE, letterSpacing: -2}}>{big}</div>
      <div style={{fontSize: 34, color: INK, fontWeight: 600, marginTop: 8}}>{label}</div>
    </div>
  );
};

const Character: React.FC<{speaker: 'doc' | 'bhai'}> = ({speaker}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const pop = spring({frame, fps, config: {damping: 15}});
  const src = staticFile(`reel/${speaker}_cut.png`);
  return (
    <img src={src} style={{
      position: 'absolute', left: -10, bottom: 185, height: 420,
      transform: `translateX(${(1 - pop) * -60}px)`, opacity: pop,
      filter: 'drop-shadow(0 8px 18px rgba(16,24,40,0.25))',
    }}/>
  );
};

const Caption: React.FC<{words: W[]}> = ({words}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  return (
    <div style={{
      position: 'absolute', left: 40, right: 40, bottom: 46,
      background: NAVY, borderRadius: 22, padding: '22px 30px', textAlign: 'center',
      boxShadow: '0 12px 30px rgba(16,24,40,0.35)',
    }}>
      <div style={{fontSize: 33, fontWeight: 700, lineHeight: 1.45, fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', columnGap: 12}}>
        {words.map((w, i) => {
          const said = t >= w.start;
          const active = t >= w.start && t <= w.end;
          return (
            <span key={i} style={{
              color: active ? '#ffd54a' : said ? 'white' : 'rgba(255,255,255,0.28)',
            }}>{w.word}</span>
          );
        })}
      </div>
    </div>
  );
};

const Footnote: React.FC<{text: string}> = ({text}) => (
  <div style={{position: 'absolute', left: 0, right: 0, bottom: 175, textAlign: 'center'}}>
    <span style={{
      fontFamily: '"SF Mono", Menlo, monospace', fontSize: 19, color: '#667085',
      background: '#eef1f5', borderRadius: 8, padding: '6px 14px',
    }}>{text}</span>
  </div>
);

const SceneView: React.FC<{scene: Scene; index: number; total: number}> = ({scene, index, total}) => {
  const {fps} = useVideoConfig();
  return (
    <Sequence durationInFrames={Math.ceil(scene.dur * fps)}>
      <Pill text={scene.pill} index={index} total={total}/>
      <Header statement={scene.statement} sub={scene.sub}/>
      {scene.diagram.type === 'steps' ? <StepsDiagram items={scene.diagram.items} dur={scene.dur}/> : null}
      {scene.diagram.type === 'chips' ? <ChipsDiagram items={scene.diagram.items} stat={scene.diagram.stat} statLabel={scene.diagram.statLabel} dur={scene.dur}/> : null}
      {scene.diagram.type === 'stat' ? <StatDiagram big={scene.diagram.big} label={scene.diagram.label}/> : null}
      <Character speaker={scene.speaker}/>
      {scene.footnote ? <Footnote text={scene.footnote}/> : null}
      <Caption words={scene.words}/>
    </Sequence>
  );
};

export const ReelVideo: React.FC<Props> = ({scenes}) => {
  const {fps} = useVideoConfig();
  let cursor = 0;
  return (
    <AbsoluteFill>
      <Grid/>
      {scenes.map((s, i) => {
        const from = Math.round(cursor * fps);
        cursor += s.dur + SCENE_GAP;
        return (
          <Sequence key={i} from={from} durationInFrames={Math.ceil((s.dur + SCENE_GAP) * fps)}>
            <SceneView scene={s} index={i} total={scenes.length}/>
            <Audio src={staticFile(s.audio)}/>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
