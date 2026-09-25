import React from "react";
import { Composition } from "remotion";
import { DuoVideo, DuoVideoProps } from "./Composition";

export const RemotionRoot: React.FC = () => (
  <Composition id="DuoVideo" component={DuoVideo}
    durationInFrames={300} fps={30} width={1280} height={720}
    defaultProps={{
      topic: "Test", fps: 30,
      speakers: {}, lines: [], totalFrames: 300,
    } as DuoVideoProps}
    calculateMetadata={({ props }) => ({ durationInFrames: props.totalFrames || 300 })}
  />
);
