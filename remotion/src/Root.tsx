import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { AionVideo } from './AionVideo';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="AionVideo"
        component={AionVideo}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          audioPath: undefined,
          durationMs: 10000,
          images: [],
        }}
        calculateMetadata={async ({ props }) => {
          if (props.durationMs) {
            return {
              durationInFrames: Math.ceil((props.durationMs / 1000) * 30) + 60,
            };
          }
          return {};
        }}
      />

      <Composition
        id="AionPreview"
        component={AionVideo}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          audioPath: undefined,
          durationMs: undefined,
          images: [],
        }}
      />
    </>
  );
};

registerRoot(RemotionRoot);
