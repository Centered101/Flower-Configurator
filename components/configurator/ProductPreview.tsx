"use client";

import { useId, useState } from "react";
import { ZoomIn, RotateCw } from "lucide-react";
import { getDefaultConfiguratorCatalog } from "@/lib/configurator-catalog";
import { defaultConfig } from "@/lib/configurator";
import type { ColorId, ConfiguratorState } from "@/lib/types";
import { useOptionalConfigurator } from "./ConfiguratorProvider";
import { FlowerSvgShape } from "./FlowerSvgShapes";

const svgNoDragStyle = { userSelect: "none", WebkitUserDrag: "none" } as React.CSSProperties;

export function ProductPreview({ compact = false, config: explicitConfig }: { compact?: boolean; config?: ConfiguratorState }) {
  const context = useOptionalConfigurator();
  const contextConfig = context?.config ?? defaultConfig;
  const catalog = context?.catalog ?? getDefaultConfiguratorCatalog();
  const previewId = useId().replaceAll(":", "");
  const bgId = `${previewId}-preview-bg`;
  const shadowId = `${previewId}-soft-shadow`;
  const [zoomLevel, setZoomLevel] = useState(0);
  const [rotation, setRotation] = useState(0);

  const config = explicitConfig ?? contextConfig;
  const colors = catalog.colors;
  const flowerTypes = catalog.flowerTypes;
  const wrappingOptions = catalog.wrappingOptions;
  const ribbonOptions = catalog.ribbonOptions;
  const stems = catalog.stems;
  const activeColors: ColorId[] = config.flowerColors.length ? config.flowerColors : (colors[0]?.id ? [colors[0].id as ColorId] : []);
  const visibleColors = activeColors.slice(0, Math.min(config.quantity || activeColors.length, 7));
  const stemCount = Math.max(1, Math.min(config.quantity || 1, 12));
  const wrapping = wrappingOptions[config.wrapping];
  const ribbon = ribbonOptions[config.ribbon];
  const configuredStemColor = stems.colors[config.stem.color] ?? Object.values(stems.colors)[0];
  const stemColor = configuredStemColor ?? { id: "preview-stem", name: "ตัวอย่าง", hex: "#2E7D32", price: 0 };
  const flower = flowerTypes.find((item) => item.id === config.flowerType);
  const hasFlower = Boolean(flower);
  const hasConfiguredStemColor = Boolean(configuredStemColor);
  const selectedColors = visibleColors
    .map((colorId) => colors.find((item) => item.id === colorId))
    .filter(Boolean)
    .filter((color, index, list) => list.findIndex((item) => item?.id === color?.id) === index)
    .slice(0, 4);
  const placeholderStems = Array.from({ length: stemCount }, (_, index) => {
    const centerOffset = index - (stemCount - 1) / 2;
    const spread = stemCount <= 1 ? 0 : centerOffset * Math.max(16, 32 - stemCount * 1.25);
    const depth = Math.abs(centerOffset) * 4;
    const leafSide = index % 2 === 0 ? -1 : 1;
    const showLeaf = stemCount <= 3 || index % 2 === 0 || Math.abs(centerOffset) <= 1.5;

    return {
      id: `stem-${index}`,
      x: 210 + spread,
      y: 124 + depth,
      baseX: 210 + centerOffset * 9,
      baseY: 414,
      leafSide,
      showLeaf,
      rotate: spread * 0.12,
      scale: Math.max(0.78, 1 - stemCount * 0.012)
    };
  });
  function getStemCurvePoint(baseDx: number, baseDy: number, t: number) {
    const inverse = 1 - t;
    const x =
      inverse ** 3 * 0 +
      3 * inverse ** 2 * t * (baseDx * 0.12) +
      3 * inverse * t ** 2 * (baseDx * 0.78) +
      t ** 3 * baseDx;
    const y =
      inverse ** 3 * 0 +
      3 * inverse ** 2 * t * (baseDy * 0.34) +
      3 * inverse * t ** 2 * (baseDy * 0.72) +
      t ** 3 * baseDy;

    return { x, y };
  }
  const bouquetFlowers = visibleColors.map((colorId, index) => {
    const color = colors.find((item) => item.id === colorId) ?? colors[0];
    if (!color) return null;
    const centerOffset = index - (visibleColors.length - 1) / 2;
    const spread = visibleColors.length <= 1 ? 0 : centerOffset * 38;
    const depth = Math.abs(centerOffset) * 10 + (index % 2 === 0 ? 0 : 14);
    const isCenter = Math.abs(centerOffset) < 0.5;

    return {
      id: `${colorId}-${index}`,
      color: color.hex,
      x: 210 + spread,
      y: 74 + depth,
      scale: Math.max(0.48, (isCenter ? 0.82 : 0.72) - visibleColors.length * 0.018),
      rotate: spread * 0.23
    };
  }).filter(Boolean);
  const zoomScale = [1, 1.18, 1.36][zoomLevel] ?? 1;

  function toggleZoom() {
    setZoomLevel((current) => (current + 1) % 3);
  }

  function rotatePreview() {
    setRotation((current) => (current + 30) % 360);
  }

  return (
    <div className="relative overflow-hidden rounded-bloom bg-white p-2 shadow-sm sm:p-4">
      <div className="absolute right-3 top-3 z-10 flex gap-2 sm:right-4 sm:top-4">
        <button
          type="button"
          onClick={toggleZoom}
          className="touch-target grid place-items-center rounded-full bg-white text-zinc-700 shadow-sm transition hover:bg-blush hover:text-blossom"
          aria-label={zoomLevel === 0 ? "ซูมตัวอย่าง" : "เปลี่ยนระดับซูมตัวอย่าง"}
          title={`ซูม ${zoomLevel + 1}/3`}
        >
          <ZoomIn size={18} />
        </button>
        <button
          type="button"
          onClick={rotatePreview}
          className="touch-target grid place-items-center rounded-full bg-white text-zinc-700 shadow-sm transition hover:bg-blush hover:text-blossom"
          aria-label="หมุนตัวอย่าง"
          title="หมุนตัวอย่าง"
        >
          <RotateCw size={18} />
        </button>
      </div>
      <div className={compact ? "relative h-[440px] overflow-hidden rounded-bloom bg-blush" : "relative h-[min(500px,78vh)] min-h-[390px] overflow-hidden rounded-bloom bg-blush md:h-[560px]"}>
        <svg
          viewBox="0 0 420 520"
          preserveAspectRatio="xMidYMid slice"
          className="h-full w-full select-none"
          role="img"
          aria-label={`ภาพตัวอย่าง ${flower?.name ?? "ดอกไม้ลวดกำมะหยี่"}`}
          onContextMenu={(event) => event.preventDefault()}
          style={svgNoDragStyle}
        >
          <defs>
            <radialGradient id={bgId} cx="50%" cy="22%" r="80%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="58%" stopColor="#FCE4EC" />
              <stop offset="100%" stopColor="#F8BBD0" />
            </radialGradient>
            <filter id={shadowId} x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="16" stdDeviation="11" floodColor="#ad5576" floodOpacity="0.18" />
            </filter>
          </defs>
          <rect width="420" height="520" rx="28" fill={`url(#${bgId})`} />
          <ellipse cx="210" cy="472" rx="112" ry="18" fill="#AD5576" opacity="0.12" />

          {!hasFlower ? (
            <g
              filter={`url(#${shadowId})`}
              transform={`translate(210 270) rotate(${rotation}) scale(${zoomScale}) translate(-210 -270)`}
              className="transition-transform duration-300 ease-out"
            >
              {placeholderStems.map((item) => {
                const baseDx = (item.baseX - item.x) / item.scale;
                const baseDy = (item.baseY - item.y) / item.scale;

                return (
                  <g key={item.id} transform={`translate(${item.x} ${item.y}) rotate(${item.rotate}) scale(${item.scale})`}>
                    <path d={`M0 0 C${baseDx * 0.12} ${baseDy * 0.34}, ${baseDx * 0.78} ${baseDy * 0.72}, ${baseDx} ${baseDy}`} fill="none" stroke="#1B5E20" strokeWidth="8" strokeLinecap="round" opacity="0.16" />
                    <path d={`M0 0 C${baseDx * 0.12} ${baseDy * 0.34}, ${baseDx * 0.78} ${baseDy * 0.72}, ${baseDx} ${baseDy}`} fill="none" stroke={stemColor.hex} strokeWidth="5" strokeLinecap="round" />
                    {item.showLeaf ? (
                      <path
                        d={item.leafSide < 0 ? "M0 0 C-28 -25 -56 -30 -78 -18 C-66 10 -31 18 0 0Z" : "M0 0 C28 -25 56 -30 78 -18 C66 10 31 18 0 0Z"}
                          fill={stemColor.hex}
                        opacity="0.5"
                        stroke="#1B5E20"
                        strokeWidth="1.5"
                        transform={`translate(${getStemCurvePoint(baseDx, baseDy, item.leafSide < 0 ? 0.38 : 0.5).x} ${getStemCurvePoint(baseDx, baseDy, item.leafSide < 0 ? 0.38 : 0.5).y})`}
                      />
                    ) : null}
                    <circle cx="0" cy="0" r="9" fill={stemColor.hex} opacity="0.55" />
                  </g>
                );
              })}
            </g>
          ) : null}

          <g
            filter={`url(#${shadowId})`}
            transform={`translate(210 270) rotate(${rotation}) scale(${zoomScale}) translate(-210 -270)`}
            className="transition-transform duration-300 ease-out"
          >
            {hasFlower ? bouquetFlowers.map((item) => item ? (
              <FlowerSvgShape
                key={item.id}
                type={config.flowerType}
                color={item.color}
                stemColor={stemColor.hex}
                x={item.x}
                y={item.y}
                scale={item.scale}
                rotate={item.rotate}
                baseX={210}
                baseY={377}
              />
            ) : null) : null}

            {hasFlower && wrapping ? (
              <g>
                <path
                  d="M96 286 C138 262 282 262 324 286 L282 482 C246 500 174 500 138 482Z"
                  fill={wrapping.color}
                  stroke="#D56A91"
                  strokeWidth="3"
                  opacity="0.94"
                />
                <path d="M102 286 L198 385 L137 482Z" fill="#FFFFFF" opacity="0.24" />
                <path d="M318 286 L222 385 L283 482Z" fill="#AD5576" opacity="0.08" />
              </g>
            ) : null}

            {hasFlower && ribbon ? (
              <g transform="translate(210 365)">
                <path d="M-12 0 C-60 -30 -82 -20 -104 4 C-70 26 -42 31 -12 0Z" fill={ribbon.color} stroke="#AD5576" strokeWidth="3" />
                <path d="M12 0 C60 -30 82 -20 104 4 C70 26 42 31 12 0Z" fill={ribbon.color} stroke="#AD5576" strokeWidth="3" />
                <circle cx="0" cy="0" r="17" fill={ribbon.color} stroke="#AD5576" strokeWidth="3" />
                <path d="M-10 15 C-24 48 -31 72 -30 100" fill="none" stroke={ribbon.color} strokeWidth="14" strokeLinecap="round" />
                <path d="M10 15 C24 48 31 72 30 100" fill="none" stroke={ribbon.color} strokeWidth="14" strokeLinecap="round" />
              </g>
            ) : null}
          </g>
        </svg>

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/70 via-ink/20 to-transparent p-3 text-white sm:p-4">
          <p className="text-sm font-semibold">{hasFlower ? `${flower?.name} ตามแบบที่เลือก` : "เริ่มจากก้าน แล้วค่อยเลือกดอกไม้"}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
            {hasFlower ? <span className="rounded-full bg-white/90 px-3 py-1 text-ink">{config.quantity || 1} ดอก</span> : null}
            {hasFlower && wrapping ? <span className="rounded-full bg-white/90 px-3 py-1 text-ink">{wrapping.name}</span> : null}
            {hasFlower && ribbon ? <span className="rounded-full bg-white/90 px-3 py-1 text-ink">ริบบิ้น {ribbon.name}</span> : null}
            {stemColor ? <span className="rounded-full bg-white/90 px-3 py-1 text-ink">{hasFlower ? "ก้าน" : `${config.quantity || 1} ก้าน`} {stemColor.name}</span> : null}
          </div>
        </div>
      </div>
      <div className="mt-2 rounded-soft bg-blush/70 px-3 py-3 text-sm text-zinc-700 sm:mt-3 sm:px-4">
          <p className="font-semibold text-ink">{hasFlower ? "ภาพตัวอย่างปรับตามชนิดดอกไม้" : hasConfiguredStemColor ? "เลือกชนิดดอกไม้เพื่อดูทรงดอก" : "แสดงก้านตัวอย่างก่อนเพิ่มตัวเลือกจริงในแอดมิน"}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {hasFlower ? selectedColors.map((color) => color ? (
            <span key={color.id} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold">
              <span className="size-3 rounded-full border border-pink-100" style={{ backgroundColor: color.hex }} />
              {color.name}
            </span>
          ) : null) : null}
        </div>
        <p className="mt-2 text-xs text-zinc-600">สีและวัสดุจริงอาจแตกต่างเล็กน้อยตามแสง ภาพถ่าย และงานทำมือ</p>
      </div>
    </div>
  );
}
