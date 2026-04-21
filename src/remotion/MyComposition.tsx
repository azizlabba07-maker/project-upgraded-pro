import React, { useMemo } from 'react';
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
  Easing,
} from 'remotion';

/* -------------------------------------------------------------------------
   تعريف الواجهة المتوقعة للـ tokens (تستقبل بالكامل من LLM)
-------------------------------------------------------------------------- */
export interface DesignTokens {
  colors: {
    primary: string;      // HEX
    secondary: string;   // HEX
    accent: string;       // HEX
    background: string;  // HEX
    gradients?: Array<{ start: string; end: string; angle: number }>;
  };
  shapes: {
    circles: number;      // عدد الدوائر
    rectangles: number;   // عدد المستطيلات
    triangles: number;    // عدد المثلثات
    lines: number;        // عدد الخطوط
  };
  animation: {
    duration: number;      // ثوانٍ
    fps: number;          // إطار/ث
    speedFactor?: number; // مضاعف السرعة (اختياري)
  };
  seed?: string;           // UUID/رقم عشوائي من LLM
}

export const defaultDesignTokens: DesignTokens = {
  colors: {
    primary: '#6366f1',
    secondary: '#8b5cf6',
    accent: '#f59e0b',
    background: '#0f0f23',
    gradients: [
      { start: '#6366f1', end: '#8b5cf6', angle: 45 },
      { start: '#f59e0b', end: '#ef4444', angle: 90 }
    ],
  },
  shapes: {
    circles: 6,
    rectangles: 3,
    triangles: 4,
    lines: 5
  },
  animation: {
    duration: 8,
    fps: 30,
    speedFactor: 1.0
  },
  seed: 'default-seed'
};

export const videoConfig = {
  width: 3840,
  height: 2160,
  fps: 30,
  durationInSeconds: defaultDesignTokens.animation.duration,
};

/* -------------------------------------------------------------------------
   مُولّد أرقام pseudo‑random ثابت على أساس seed
   (Mulberry32 – بسيط وسريع)
-------------------------------------------------------------------------- */
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* -------------------------------------------------------------------------
   Helper – تحويل seed (string) إلى عدد صحيح للـ PRNG
-------------------------------------------------------------------------- */
const seedToNumber = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = Math.imul(31, hash) + seed.charCodeAt(i) | 0;
  }
  return Math.abs(hash);
};

/* -------------------------------------------------------------------------
   MyComposition – العنصر الرئيس
-------------------------------------------------------------------------- */
export interface MyCompositionProps {
  designTokens?: DesignTokens;
}

export const MyComposition: React.FC<MyCompositionProps> = ({ designTokens: customTokens }) => {
  const designTokens = customTokens || defaultDesignTokens;
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();

  /* ----------------- 1️⃣ إنشاء PRNG ثابت ----------------- */
  const rng = useMemo(() => {
    const seedNum = designTokens.seed
      ? seedToNumber(designTokens.seed)
      : Math.floor(Math.random() * 2 ** 31);
    return mulberry32(seedNum);
  }, [designTokens.seed]);

  /* ----------------- 2️⃣ حسابات اللون ----------------- */
  const {
    primary,
    secondary,
    accent,
    background,
    gradients,
  } = designTokens.colors;

  /* ----------------- 3️⃣ توليد المصفوفات الديناميكية ----------------- */
  const circles = useMemo(() => {
    return Array.from({ length: designTokens.shapes?.circles || 5 }).map(() => ({
      size: 200 + rng() * 300,               // 200‑500 بكسل
      opacity: 0.2 + rng() * 0.5,           // 0.2‑0.7
      blur: 20 + rng() * 40,                // 20‑60
      x: rng() * width,
      y: rng() * height,
      rotSpeed: (rng() - 0.5) * 0.02,        // دوران بطيء متغير
    }));
  }, [designTokens.shapes, width, height, rng]);

  const rectangles = useMemo(() => {
    return Array.from({ length: designTokens.shapes?.rectangles || 3 }).map(() => ({
      w: 300 + rng() * 400,
      h: 200 + rng() * 300,
      x: rng() * (width - 400),
      y: rng() * (height - 300),
      rotation: rng() * 360,
      opacity: 0.15 + rng() * 0.3,
      speed: (rng() - 0.5) * 0.04,
    }));
  }, [designTokens.shapes, width, height, rng]);

  const triangles = useMemo(() => {
    return Array.from({ length: designTokens.shapes?.triangles || 4 }).map(() => ({
      size: 250 + rng() * 350,
      x: rng() * width,
      y: rng() * height,
      rotation: rng() * 360,
      opacity: 0.15 + rng() * 0.35,
    }));
  }, [designTokens.shapes, width, height, rng]);

  const lines = useMemo(() => {
    return Array.from({ length: designTokens.shapes?.lines || 5 }).map(() => ({
      length: 500 + rng() * 800,
      strokeWidth: 1 + Math.round(rng() * 3),
      angle: rng() * 180 - 90,
      opacity: 0.1 + rng() * 0.3,
    }));
  }, [designTokens.shapes, rng]);

  /* ----------------- 4️⃣ حركة كل عنصر حسب الإطار ----------------- */
  const getAnimatedPos = (base: number, speed: number) => {
    const s = speed ?? 0.02;
    return base + Math.sin(frame * s) * 150;
  };

  /* ----------------- 5️⃣ الفلتر المخصص (Glow + Blur) ----------------- */
  const filters = (
    <defs>
      <filter id="glow">
        <feGaussianBlur stdDeviation="30" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id="blur">
        <feGaussianBlur stdDeviation="8" />
      </filter>
      {/* تدرجات لونية ديناميكية */}
      {gradients?.map((g, i) => (
        <linearGradient
          key={i}
          id={`grad-${i}`}
          gradientTransform={`rotate(${g.angle})`}
        >
          <stop offset="0%" stopColor={g.start} />
          <stop offset="100%" stopColor={g.end} />
        </linearGradient>
      ))}
    </defs>
  );

  /* ----------------- 6️⃣ الرندر النهائي ----------------- */
  return (
    <AbsoluteFill style={{ background: background }}>
      {filters}
      {/* 6.1 الدوائر */}
      {circles.map((c, i) => (
        <circle
          key={i}
          cx={getAnimatedPos(c.x, c.rotSpeed)}
          cy={getAnimatedPos(c.y, c.rotSpeed)}
          r={c.size / 2}
          fill={gradients?.[i % (gradients.length || 1)]
            ? `url(#grad-${i % (gradients.length || 1)})`
            : primary}
          opacity={c.opacity}
          filter="url(#glow)"
        />
      ))}

      {/* 6.2 المستطيلات */}
      {rectangles.map((r, i) => (
        <rect
          key={i}
          x={getAnimatedPos(r.x, r.speed)}
          y={getAnimatedPos(r.y, r.speed)}
          width={r.w}
          height={r.h}
          fill={secondary}
          opacity={r.opacity}
          transform={`rotate(${r.rotation} ${r.x + r.w / 2} ${r.y + r.h / 2})`}
          filter="url(#blur)"
        />
      ))}

      {/* 6.3 المثلثات */}
      {triangles.map((t, i) => {
        const path = `
          M ${t.x} ${t.y - t.size / Math.sqrt(3)}
          L ${t.x - t.size / 2} ${t.y + t.size / (2 * Math.sqrt(3))}
          L ${t.x + t.size / 2} ${t.y + t.size / (2 * Math.sqrt(3))}
          Z`;
        return (
          <path
            key={i}
            d={path}
            fill={accent}
            opacity={t.opacity}
            transform={`rotate(${t.rotation} ${t.x} ${t.y})`}
            filter="url(#glow)"
          />
        );
      })}

      {/* 6.4 الخطوط */}
      {lines.map((l, i) => {
        const rad = (l.angle * Math.PI) / 180;
        const x1 = width / 2;
        const y1 = height / 2;
        const x2 = x1 + l.length * Math.cos(rad);
        const y2 = y1 + l.length * Math.sin(rad);
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={primary}
            strokeWidth={l.strokeWidth}
            opacity={l.opacity}
            filter="url(#glow)"
          />
        );
      })}
    </AbsoluteFill>
  );
};

export default MyComposition;
