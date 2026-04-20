import React from 'react';
import {
  AbsoluteFill,
  useVideoConfig,
  useCurrentFrame,
  interpolate,
  spring,
  Easing,
} from 'remotion';

// ============================================================================
// 🎯 TYPES & INTERFACES
// ============================================================================
export interface DesignTokens {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    gradients: Array<{ start: string; end: string; angle: number }>;
  };
  shapes: {
    circles: Array<{ size: number; opacity: number; blur: number; x: number; y: number }>;
    rectangles: Array<{ width: number; height: number; rotation: number; opacity: number }>;
    triangles: Array<{ size: number; rotation: number; opacity: number }>;
    lines: Array<{ length: number; strokeWidth: number; opacity: number; angle: number }>;
  };
  animation: {
    duration: number;
    fps: number;
    speeds: { slow: number; normal: number; fast: number };
    easing: { type: string; damping: number; stiffness: number; mass: number };
    delays: { primary: number; secondary: number; tertiary: number };
  };
  effects: {
    shadow: { enabled: boolean; blur: number; opacity: number; offsetX: number; offsetY: number };
    blur: { enabled: boolean; amount: number };
    glow: { enabled: boolean; intensity: number; spread: number };
  };
}

// ============================================================================
// 🎨 DEFAULT DESIGN TOKENS
// ============================================================================
export const defaultDesignTokens: DesignTokens = {
  colors: {
    primary: '#6366f1',
    secondary: '#8b5cf6',
    accent: '#f59e0b',
    background: '#0f0f23',
    foreground: '#ffffff',
    gradients: [
      { start: '#6366f1', end: '#8b5cf6', angle: 45 },
      { start: '#f59e0b', end: '#ef4444', angle: 90 },
      { start: '#10b981', end: '#06b6d4', angle: 135 },
    ],
  },
  shapes: {
    circles: [
      { size: 400, opacity: 0.3, blur: 50, x: 200, y: 300 },
      { size: 600, opacity: 0.2, blur: 80, x: 800, y: 500 },
      { size: 300, opacity: 0.4, blur: 30, x: 1500, y: 800 },
    ],
    rectangles: [
      { width: 500, height: 300, rotation: 45, opacity: 0.25 },
      { width: 800, height: 200, rotation: -30, opacity: 0.15 },
    ],
    triangles: [
      { size: 350, rotation: 0, opacity: 0.2 },
      { size: 450, rotation: 180, opacity: 0.15 },
    ],
    lines: [
      { length: 1200, strokeWidth: 2, opacity: 0.3, angle: 45 },
      { length: 800, strokeWidth: 1, opacity: 0.2, angle: -60 },
    ],
  },
  animation: {
    duration: 8,
    fps: 30,
    speeds: { slow: 0.5, normal: 1.0, fast: 2.0 },
    easing: { type: 'spring', damping: 20, stiffness: 100, mass: 1 },
    delays: { primary: 0, secondary: 0.5, tertiary: 1.0 },
  },
  effects: {
    shadow: { enabled: true, blur: 40, opacity: 0.5, offsetX: 10, offsetY: 10 },
    blur: { enabled: true, amount: 5 },
    glow: { enabled: true, intensity: 0.8, spread: 20 },
  },
};

export const videoConfig = {
  width: 3840,
  height: 2160,
  fps: 30,
  durationInSeconds: defaultDesignTokens.animation.duration,
};

// ============================================================================
// 🛠️ HELPER FUNCTIONS
// ============================================================================
export const calculateInterpolation = (
  frame: number,
  inputRange: [number, number] | [number, number, number] | [number, number, number, number],
  outputRange: [number, number] | [number, number, number] | [number, number, number, number],
  easing: string = 'easeInOut'
): number => {
  const easingFunction = easing === 'spring' ? Easing.bezier(0.17, 0.67, 0.83, 0.67) : Easing.linear;
  return interpolate(frame, inputRange as any, outputRange as any, {
    extrapolateRight: 'clamp',
    extrapolateLeft: 'clamp',
    easing: easingFunction,
  });
};

export const createTrianglePath = (size: number, center: { x: number; y: number }): string => {
  const height = size * Math.sqrt(3) / 2;
  return `
    M ${center.x} ${center.y - height / 2}
    L ${center.x - size / 2} ${center.y + height / 2}
    L ${center.x + size / 2} ${center.y + height / 2}
    Z
  `;
};

export const degToRad = (deg: number): number => (deg * Math.PI) / 180;
export const calculateDelay = (index: number, baseDelay: number): number => index * baseDelay;

// ============================================================================
// 🎭 SVG FILTERS
// ============================================================================
export const SVGFilters: React.FC<{ tokens: DesignTokens }> = ({ tokens }) => (
  <defs>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation={tokens.effects.glow.spread} result="coloredBlur" />
      <feMerge>
        <feMergeNode in="coloredBlur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx={tokens.effects.shadow.offsetX} dy={tokens.effects.shadow.offsetY} stdDeviation={tokens.effects.shadow.blur} floodOpacity={tokens.effects.shadow.opacity} />
    </filter>
    <filter id="blur">
      <feGaussianBlur stdDeviation={tokens.effects.blur.amount} />
    </filter>
    <linearGradient id="primaryGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor={tokens.colors.primary} />
      <stop offset="100%" stopColor={tokens.colors.secondary} />
    </linearGradient>
    <radialGradient id="radialGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stopColor={tokens.colors.accent} stopOpacity="0.8" />
      <stop offset="100%" stopColor="transparent" stopOpacity="0" />
    </radialGradient>
  </defs>
);

// ============================================================================
// 🎨 COMPONENTS
// ============================================================================
interface CircleProps {
  index: number;
  config: DesignTokens['shapes']['circles'][0];
  frame: number;
  durationInFrames: number;
  tokens: DesignTokens;
}
const AnimatedCircle: React.FC<CircleProps> = ({ index, config, frame, durationInFrames, tokens }) => {
  const startX = config.x;
  const startY = config.y;
  const endX = config.x + 500;
  const endY = config.y - 300;
  const x = calculateInterpolation(frame, [0, durationInFrames], [startX, endX]);
  const y = calculateInterpolation(frame, [0, durationInFrames], [startY, endY]);
  const scale = calculateInterpolation(frame, [0, durationInFrames / 2, durationInFrames], [0.5, 1.2, 0.8]);
  const opacity = calculateInterpolation(frame, [0, durationInFrames / 4, durationInFrames], [0, config.opacity, config.opacity * 0.5]);
  const color = tokens.colors.gradients.length > 0 ? tokens.colors.gradients[0].start : tokens.colors.primary;
  return (
    <circle cx={x} cy={y} r={config.size / 2} fill={color} opacity={opacity} filter="url(#glow)" style={{ transform: `scale(${scale})`, transformOrigin: `${x}px ${y}px` }} />
  );
};

interface RectangleProps {
  index: number;
  config: DesignTokens['shapes']['rectangles'][0];
  frame: number;
  durationInFrames: number;
  tokens: DesignTokens;
}
const AnimatedRectangle: React.FC<RectangleProps> = ({ index, config, frame, durationInFrames, tokens }) => {
  const centerX = 1920;
  const centerY = 1080;
  const rotation = calculateInterpolation(frame, [0, durationInFrames], [config.rotation, config.rotation + 360]);
  const opacity = calculateInterpolation(frame, [0, durationInFrames / 3, durationInFrames], [0, config.opacity, config.opacity * 0.3]);
  const scale = calculateInterpolation(frame, [0, durationInFrames / 2, durationInFrames], [0.3, 1, 0.5]);
  return (
    <rect x={centerX - config.width / 2} y={centerY - config.height / 2} width={config.width} height={config.height} fill="url(#primaryGradient)" opacity={opacity} filter="url(#shadow)" style={{ transform: `rotate(${rotation}deg) scale(${scale})`, transformOrigin: `${centerX}px ${centerY}px` }} />
  );
};

interface TriangleProps {
  index: number;
  config: DesignTokens['shapes']['triangles'][0];
  frame: number;
  durationInFrames: number;
  tokens: DesignTokens;
}
const AnimatedTriangle: React.FC<TriangleProps> = ({ index, config, frame, durationInFrames, tokens }) => {
  const centerX = 1920 + index * 400;
  const centerY = 1080;
  const rotation = calculateInterpolation(frame, [0, durationInFrames], [config.rotation, config.rotation + 720]);
  const opacity = calculateInterpolation(frame, [0, durationInFrames], [config.opacity, config.opacity * 0.5]);
  const scale = calculateInterpolation(frame, [0, durationInFrames / 4, durationInFrames * 0.75, durationInFrames], [0, 1.2, 0.8, 0]);
  const path = createTrianglePath(config.size, { x: centerX, y: centerY });
  const color = tokens.colors.gradients.length > 1 ? tokens.colors.gradients[1].start : tokens.colors.secondary;
  return (
    <path d={path} fill={color} opacity={opacity} filter="url(#glow)" style={{ transform: `rotate(${rotation}deg) scale(${scale})`, transformOrigin: `${centerX}px ${centerY}px` }} />
  );
};

interface LineProps {
  index: number;
  config: DesignTokens['shapes']['lines'][0];
  frame: number;
  durationInFrames: number;
  tokens: DesignTokens;
}
const AnimatedLine: React.FC<LineProps> = ({ index, config, frame, durationInFrames, tokens }) => {
  const startX1 = 0;
  const startY1 = index * 400 + 200;
  const startX2 = config.length;
  const startY2 = startY1 + Math.tan(degToRad(config.angle)) * config.length;
  const x1 = calculateInterpolation(frame, [0, durationInFrames], [startX1 - 500, startX1 + 500]);
  const y1 = calculateInterpolation(frame, [0, durationInFrames], [startY1, startY1 + 200]);
  const x2 = calculateInterpolation(frame, [0, durationInFrames], [startX2 - 500, startX2 + 500]);
  const y2 = calculateInterpolation(frame, [0, durationInFrames], [startY2, startY2 + 200]);
  const opacity = calculateInterpolation(frame, [0, durationInFrames / 2, durationInFrames], [0, config.opacity, 0]);
  return (
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={tokens.colors.primary} strokeWidth={config.strokeWidth} opacity={opacity} strokeLinecap="round" />
  );
};

// ============================================================================
// 🎬 BACKGROUND COMPONENT
// ============================================================================
const AnimatedBackground: React.FC<{ frame: number; durationInFrames: number; tokens: DesignTokens }> = ({ frame, durationInFrames, tokens }) => {
  return (
    <rect x="0" y="0" width="3840" height="2160" fill={tokens.colors.background}>
      <animate attributeName="fill" values={`${tokens.colors.background};#1a1a3e;${tokens.colors.background}`} dur={`${tokens.animation.duration}s`} repeatCount="indefinite" />
    </rect>
  );
};

// ============================================================================
// 🎥 MAIN COMPOSITION
// ============================================================================
export interface MyCompositionProps {
  designTokens?: DesignTokens;
}

export const MyComposition: React.FC<MyCompositionProps> = ({ designTokens: customTokens }) => {
  const tokens = customTokens || defaultDesignTokens;
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  
  const springConfig = {
    fps,
    config: {
      damping: tokens.animation.easing.damping,
      stiffness: tokens.animation.easing.stiffness,
      mass: tokens.animation.easing.mass,
    },
  };
  
  const titleScale = spring({ frame: frame - tokens.animation.delays.primary * fps, ...springConfig });
  const contentOpacity = interpolate(frame, [0, fps * 0.5, fps * 2], [0, 1, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: tokens.colors.background }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', position: 'absolute' }}>
        <SVGFilters tokens={tokens} />
        <AnimatedBackground frame={frame} durationInFrames={durationInFrames} tokens={tokens} />
        
        <g id="circles-layer">
          {tokens.shapes.circles.map((config, index) => (
            <AnimatedCircle key={`circle-${index}`} index={index} config={config} frame={frame} durationInFrames={durationInFrames} tokens={tokens} />
          ))}
        </g>
        
        <g id="rectangles-layer">
          {tokens.shapes.rectangles.map((config, index) => (
            <AnimatedRectangle key={`rect-${index}`} index={index} config={config} frame={frame} durationInFrames={durationInFrames} tokens={tokens} />
          ))}
        </g>
        
        <g id="triangles-layer">
          {tokens.shapes.triangles.map((config, index) => (
            <AnimatedTriangle key={`triangle-${index}`} index={index} config={config} frame={frame} durationInFrames={durationInFrames} tokens={tokens} />
          ))}
        </g>
        
        <g id="lines-layer">
          {tokens.shapes.lines.map((config, index) => (
            <AnimatedLine key={`line-${index}`} index={index} config={config} frame={frame} durationInFrames={durationInFrames} tokens={tokens} />
          ))}
        </g>
        
        <g id="effects-layer">
          {Array.from({ length: 20 }).map((_, i) => {
            const x = (i * 192) % width;
            const y = Math.sin(frame * 0.02 + i) * 100 + (i * 108) % height;
            const radius = Math.sin(frame * 0.05 + i * 0.5) * 3 + 3;
            return <circle key={`dot-${i}`} cx={x} cy={y} r={radius} fill={tokens.colors.accent} opacity={0.5} filter="url(#glow)" />;
          })}
        </g>
      </svg>
      
    </AbsoluteFill>
  );
};

export default MyComposition;
