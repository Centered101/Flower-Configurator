"use client";

import type { FlowerTypeId } from "@/lib/types";

type FlowerSvgProps = {
  color: string;
  stemColor: string;
  x: number;
  y: number;
  scale: number;
  rotate: number;
  type: FlowerTypeId | "";
  baseX: number;
  baseY: number;
};

function Stem({ color, baseDx, baseDy }: { color: string; baseDx: number; baseDy: number }) {
  return (
    <g>
      <path
        d={`M0 38 C${baseDx * 0.12} ${baseDy * 0.38}, ${baseDx * 0.72} ${baseDy * 0.72}, ${baseDx} ${baseDy}`}
        fill="none"
        stroke="#1B5E20"
        strokeWidth="7"
        strokeLinecap="round"
        opacity="0.18"
      />
      <path
        d={`M0 38 C${baseDx * 0.12} ${baseDy * 0.38}, ${baseDx * 0.72} ${baseDy * 0.72}, ${baseDx} ${baseDy}`}
        fill="none"
        stroke={color}
        strokeWidth="4.6"
        strokeLinecap="round"
      />
      <path d="M-2 132 C-30 120 -40 105 -43 88 C-21 91 -7 106 -2 132Z" fill={color} opacity="0.58" stroke="#1B5E20" strokeWidth="1.4" />
      <path d="M1 164 C30 150 41 135 45 116 C23 120 8 140 1 164Z" fill={color} opacity="0.52" stroke="#1B5E20" strokeWidth="1.4" />
    </g>
  );
}

function Petal({ d, color, opacity = 1 }: { d: string; color: string; opacity?: number }) {
  return (
    <path
      d={d}
      fill={color}
      opacity={opacity}
      stroke="rgba(45,45,45,0.2)"
      strokeWidth="1.45"
      strokeLinejoin="round"
    />
  );
}

function Lily({ color }: { color: string }) {
  return (
    <g>
      <Petal color={color} d="M0 30 C-18 2 -16 -35 0 -72 C17 -34 19 2 0 30Z" />
      <Petal color={color} d="M-7 29 C-51 13 -70 -18 -75 -55 C-38 -48 -13 -18 -7 29Z" opacity={0.94} />
      <Petal color={color} d="M7 29 C51 13 70 -18 75 -55 C38 -48 13 -18 7 29Z" opacity={0.94} />
      <Petal color={color} d="M-12 34 C-55 48 -83 38 -105 10 C-66 -3 -30 7 -12 34Z" opacity={0.9} />
      <Petal color={color} d="M12 34 C55 48 83 38 105 10 C66 -3 30 7 12 34Z" opacity={0.9} />
      <Petal color={color} d="M0 38 C-22 62 -55 68 -88 55 C-57 29 -25 22 0 38Z" opacity={0.86} />
      <Petal color={color} d="M0 38 C22 62 55 68 88 55 C57 29 25 22 0 38Z" opacity={0.86} />
      <path d="M-30 -7 C-8 4 8 4 31 -7" fill="none" stroke="rgba(255,255,255,0.62)" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M-63 -37 C-39 -24 -21 -1 -9 27" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M63 -37 C39 -24 21 -1 9 27" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1.8" strokeLinecap="round" />
      <g stroke="#C89B00" strokeWidth="2" strokeLinecap="round">
        <path d="M0 24 L0 -16" />
        <path d="M0 24 L-19 -11" />
        <path d="M0 24 L19 -11" />
      </g>
      <g fill="#FDD835" stroke="#A67800" strokeWidth="1.5">
        <ellipse cx="0" cy="-19" rx="4.4" ry="7" />
        <ellipse cx="-21" cy="-13" rx="4.4" ry="7" transform="rotate(-28 -21 -13)" />
        <ellipse cx="21" cy="-13" rx="4.4" ry="7" transform="rotate(28 21 -13)" />
      </g>
    </g>
  );
}

function Tulip({ color }: { color: string }) {
  return (
    <g>
      <Petal color={color} d="M-44 35 C-58 0 -47 -46 -12 -80 C-5 -35 -13 -1 -44 35Z" opacity={0.88} />
      <Petal color={color} d="M44 35 C58 0 47 -46 12 -80 C5 -35 13 -1 44 35Z" opacity={0.88} />
      <Petal color={color} d="M-48 35 C-52 -12 -29 -72 0 -96 C28 -69 53 -13 48 35 C33 55 -31 55 -48 35Z" />
      <Petal color={color} d="M-20 39 C-22 -14 -10 -62 0 -91 C11 -60 22 -14 20 39 C8 46 -8 46 -20 39Z" opacity={0.95} />
      <path d="M-31 -20 C-11 -6 11 -6 31 -20" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2.3" strokeLinecap="round" />
      <path d="M-30 -48 C-22 -18 -23 12 -38 34" fill="none" stroke="rgba(255,255,255,0.24)" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M30 -48 C22 -18 23 12 38 34" fill="none" stroke="rgba(255,255,255,0.24)" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M-47 35 C-25 61 25 61 47 35" fill="none" stroke="rgba(45,45,45,0.22)" strokeWidth="1.7" strokeLinecap="round" />
    </g>
  );
}

function Rose({ color }: { color: string }) {
  return (
    <g>
      <Petal color={color} d="M0 58 C-44 58 -72 29 -65 -12 C-54 -52 -21 -77 0 -92 C22 -76 55 -52 66 -12 C72 30 44 58 0 58Z" opacity={0.86} />
      <Petal color={color} d="M-54 34 C-82 8 -73 -39 -24 -58 C-31 -24 -27 13 -54 34Z" opacity={0.82} />
      <Petal color={color} d="M54 34 C82 8 73 -39 24 -58 C31 -24 27 13 54 34Z" opacity={0.82} />
      <Petal color={color} d="M-39 45 C-50 2 -22 -50 17 -70 C11 -32 8 8 -39 45Z" opacity={0.95} />
      <Petal color={color} d="M38 45 C50 2 22 -50 -17 -70 C-11 -32 -8 8 38 45Z" opacity={0.93} />
      <Petal color={color} d="M-28 39 C-30 -8 -9 -45 18 -59 C20 -21 13 19 -28 39Z" opacity={0.98} />
      <Petal color={color} d="M29 38 C30 -7 10 -43 -17 -57 C-20 -19 -12 18 29 38Z" opacity={0.94} />
      <Petal color={color} d="M-12 35 C-14 -8 -4 -37 0 -55 C8 -34 16 -9 12 34 C5 41 -5 41 -12 35Z" opacity={1} />
      <path d="M-42 5 C-25 19 -6 21 13 12 C27 5 37 -8 43 -21" fill="none" stroke="rgba(45,45,45,0.3)" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M38 10 C22 23 -7 25 -30 7 C-17 -7 4 -14 25 -10" fill="none" stroke="rgba(45,45,45,0.24)" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M-8 13 C-2 -6 13 -15 25 -10 C17 3 5 11 -8 13Z" fill="none" stroke="rgba(255,255,255,0.58)" strokeWidth="2" strokeLinecap="round" />
      <path d="M-32 -35 C-20 -22 -13 -6 -13 20" fill="none" stroke="rgba(255,255,255,0.24)" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M32 -35 C20 -22 13 -6 13 20" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.7" strokeLinecap="round" />
    </g>
  );
}

function Daisy({ color }: { color: string }) {
  const petals = Array.from({ length: 16 }, (_, index) => index * 22.5);
  return (
    <g>
      {petals.map((angle) => (
        <ellipse
          key={angle}
          cx="0"
          cy="-48"
          rx="12"
          ry="36"
          fill={color}
          stroke="rgba(45,45,45,0.18)"
          strokeWidth="1.35"
          transform={`rotate(${angle})`}
        />
      ))}
      <circle cx="0" cy="0" r="31" fill="#FDD835" stroke="#A67800" strokeWidth="3" />
      <circle cx="-8" cy="-6" r="4" fill="#D6A300" opacity="0.75" />
      <circle cx="8" cy="4" r="4" fill="#D6A300" opacity="0.75" />
      <circle cx="1" cy="12" r="3.5" fill="#D6A300" opacity="0.75" />
    </g>
  );
}

function Sunflower({ color }: { color: string }) {
  const petals = Array.from({ length: 22 }, (_, index) => index * (360 / 22));
  return (
    <g>
      {petals.map((angle) => (
        <path
          key={angle}
          d="M0 -35 C-12 -56 -9 -84 0 -104 C10 -84 13 -56 0 -35Z"
          fill={color}
          stroke="rgba(88,55,0,0.22)"
          strokeWidth="1.4"
          transform={`rotate(${angle})`}
        />
      ))}
      <circle cx="0" cy="0" r="42" fill="#5D4037" stroke="#3E2723" strokeWidth="4" />
      {[-18, 0, 18].map((x) => (
        [-14, 4, 21].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="3.5" fill="#8D6E63" opacity="0.95" />)
      ))}
    </g>
  );
}

function FlowerHead({ type, color }: { type: FlowerTypeId | ""; color: string }) {
  switch (type) {
    case "lily":
      return <Lily color={color} />;
    case "rose":
      return <Rose color={color} />;
    case "daisy":
      return <Daisy color={color} />;
    case "sunflower":
      return <Sunflower color={color === "#FFFFFF" ? "#FDD835" : color} />;
    case "tulip":
    default:
      return <Tulip color={color} />;
  }
}

export function FlowerSvgShape({ color, stemColor, x, y, scale, rotate, type, baseX, baseY }: FlowerSvgProps) {
  const baseDx = (baseX - x) / scale;
  const baseDy = (baseY - y) / scale;

  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`}>
      <Stem color={stemColor} baseDx={baseDx} baseDy={baseDy} />
      <g transform="translate(0 28)">
        <FlowerHead type={type} color={color} />
      </g>
    </g>
  );
}
