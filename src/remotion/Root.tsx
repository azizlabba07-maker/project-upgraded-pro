import { Composition } from 'remotion';
import { MyComposition, defaultDesignTokens, videoConfig } from './MyComposition';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MyComp"
        component={MyComposition}
        durationInFrames={videoConfig.fps * videoConfig.durationInSeconds}
        fps={videoConfig.fps}
        width={videoConfig.width}
        height={videoConfig.height}
        defaultProps={{
          designTokens: defaultDesignTokens,
        }}
      />
    </>
  );
};
