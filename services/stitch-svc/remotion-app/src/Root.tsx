import React from "react";
import { Composition } from "remotion";
import { DuoVideo, DuoVideoProps } from "./Composition";
import { ReelVideo, SCENE_GAP } from "./ReelVideo";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="DuoVideo" component={DuoVideo}
      durationInFrames={300} fps={30} width={1280} height={720}
      defaultProps={{
        topic: "Test", fps: 30,
        speakers: {}, lines: [], totalFrames: 300,
      } as DuoVideoProps}
      calculateMetadata={({ props }) => ({ durationInFrames: props.totalFrames || 300 })}
    />
    <Composition id="ReelVideo" component={ReelVideo}
      width={720} height={1280} fps={30}
      defaultProps={{scenes: [] as any}}
      calculateMetadata={({props}) => {
        const scenes = (props as any).scenes as {dur: number}[];
        const total = scenes.reduce((a, s) => a + s.dur + SCENE_GAP, 0);
        return {durationInFrames: Math.max(1, Math.ceil(total * 30)), props};
      }}
    />
  </>
);
