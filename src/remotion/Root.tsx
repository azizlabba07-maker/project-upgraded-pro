import { Composition, getInputProps } from 'remotion';
import { MyComposition, defaultDesignTokens, videoConfig, type DesignTokens } from './MyComposition';

export const RemotionRoot: React.FC = () => {
  const inputProps = getInputProps() as { designTokens?: DesignTokens };
  const tokens = inputProps.designTokens || defaultDesignTokens;

  return (
    <>
      <Composition
        id="MyComp"
        component={MyComposition}
        durationInFrames={tokens.animation.duration * tokens.animation.fps}
        fps={tokens.animation.fps}
        width={videoConfig.width}
        height={videoConfig.height}
        defaultProps={{
          designTokens: tokens,
        }}
      />
    </>
  );
};
