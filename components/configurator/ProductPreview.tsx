"use client";

import { useEffect, useId, useState } from "react";
import { ZoomIn, RotateCw } from "lucide-react";
import {
  fetchConfiguratorCatalog,
  getDefaultConfiguratorCatalog,
  hasConfiguratorCatalogData,
  readAdminConfiguratorCatalog,
  type ConfiguratorCatalog
} from "@/lib/configurator-catalog";
import { defaultConfig, updateConfigPrice } from "@/lib/configurator";
import type { CatalogOption, ColorId, ConfiguratorState } from "@/lib/types";
import { useOptionalConfigurator } from "./ConfiguratorProvider";
import { FlowerSvgShape, type StemShapeStyle } from "./FlowerSvgShapes";

const svgNoDragStyle = { userSelect: "none", WebkitUserDrag: "none" } as React.CSSProperties;

type ProductPreviewProps = {
  compact?: boolean;
  config?: ConfiguratorState;
  sampleMode?: "random";
};

function optionText(option: { id?: string; name?: string; description?: string } | undefined) {
  return `${option?.id ?? ""} ${option?.name ?? ""} ${option?.description ?? ""}`.toLowerCase();
}

function includesAny(value: string, keywords: string[]) {
  return keywords.some((keyword) => value.includes(keyword));
}

function numberFromOption(option: CatalogOption | undefined, fallback: number) {
  const match = optionText(option).match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : fallback;
}

function randomItem<T>(items: T[]) {
  return items.length ? items[Math.floor(Math.random() * items.length)] : undefined;
}

function createRandomPreviewConfig(catalog: ConfiguratorCatalog) {
  const product = randomItem(catalog.productTypes);
  const flower = randomItem(catalog.flowerTypes.filter((item) => item.available)) ?? randomItem(catalog.flowerTypes);
  const colorPool = catalog.colors.filter((item) => item.inStock) ?? catalog.colors;
  const colors = colorPool.length ? colorPool : catalog.colors;
  if (!flower || !colors.length) return null;

  const quantity = Math.max(1, Math.min(product?.baseQuantity ?? 3, 12));
  const pickedColors = Array.from({ length: quantity }, () => randomItem(colors)?.id ?? colors[0].id);
  const stemStrength = randomItem(Object.values(catalog.stems.strengths));
  const stemStyle = randomItem(Object.values(catalog.stems.styles));
  const stemLength = randomItem(Object.values(catalog.stems.lengths));
  const stemColor = randomItem(Object.values(catalog.stems.colors));
  const wrapping = randomItem(Object.values(catalog.wrappingOptions));
  const ribbon = randomItem(Object.values(catalog.ribbonOptions));
  const decorations = Object.values(catalog.decorationOptions)
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.random() > 0.55 ? 1 : 0)
    .map((item) => item.id);

  return updateConfigPrice({
    ...defaultConfig,
    productType: product?.id ?? "",
    flowerType: flower.id,
    quantity,
    colorMode: quantity > 1 ? "individual" : "single",
    flowerColors: pickedColors,
    stem: {
      strength: stemStrength?.id ?? "",
      style: stemStyle?.id ?? "",
      length: stemLength ? numberFromOption(stemLength, Number(stemLength.id) || 20) : 20,
      color: stemColor?.id ?? ""
    },
    wrapping: wrapping?.id ?? "",
    ribbon: ribbon?.id ?? "",
    decorations
  }, catalog);
}

function getStemVisual(strength: CatalogOption | undefined, style: CatalogOption | undefined, length: CatalogOption | undefined, fallbackLength: number) {
  const strengthText = optionText(strength);
  const styleText = optionText(style);
  const lengthCm = Math.max(1, numberFromOption(length, fallbackLength || 20));
  const lengthScale = Math.min(1.28, Math.max(0.72, lengthCm / 20));
  const stemStyle: StemShapeStyle = includesAny(styleText, ["เกลียว", "twist", "spiral"])
    ? "spiral"
    : includesAny(styleText, ["คู่", "double"])
      ? "double"
      : includesAny(styleText, ["ริบบิ้น", "ribbon"])
        ? "ribbon"
        : includesAny(styleText, ["โค้ง", "งอ", "curve", "bend"])
          ? "curved"
          : "straight";

  const width = includesAny(strengthText, ["บาง", "thin", "slim"])
    ? 3.2
    : includesAny(strengthText, ["หนา", "พิเศษ", "แข็ง", "thick", "strong"])
      ? 6.3
      : 4.6;

  return {
    width,
    style: stemStyle,
    curveOffset: stemStyle === "curved" ? -48 : stemStyle === "spiral" ? -24 : stemStyle === "ribbon" ? -14 : 0,
    lengthScale,
    headYShift: Math.round((1 - lengthScale) * 30),
    flowerBaseY: Math.round(340 + lengthScale * 54),
    placeholderBaseY: Math.round(352 + lengthScale * 64)
  };
}

function previewStemPath(baseDx: number, baseDy: number, curveOffset: number) {
  return `M0 0 C${baseDx * 0.12 + curveOffset} ${baseDy * 0.34}, ${baseDx * 0.78 + curveOffset * 0.35} ${baseDy * 0.72}, ${baseDx} ${baseDy}`;
}

type WrappingVisualType = "none" | "paper" | "kraft" | "box" | "vase";

function getWrappingVisual(wrapping: { id: string; name: string; description: string; color: string } | undefined): WrappingVisualType {
  const text = optionText(wrapping);
  if (!wrapping || includesAny(text, ["ไม่ห่อ", "no wrap", "none"])) return "none";
  if (includesAny(text, ["กล่อง", "box"])) return "box";
  if (includesAny(text, ["แจกัน", "vase"])) return "vase";
  if (includesAny(text, ["คราฟ", "kraft"])) return "kraft";
  return "paper";
}

function ArrangementWrap({ type, color }: { type: WrappingVisualType; color: string }) {
  if (type === "none") return null;

  if (type === "box") {
    return (
      <g>
        <path d="M112 342 H308 L286 482 H134Z" fill="#FFFFFF" stroke="#D56A91" strokeWidth="3" opacity="0.94" />
        <path d="M112 342 H308 L286 374 H134Z" fill={color} stroke="#D56A91" strokeWidth="3" opacity="0.78" />
        <path d="M134 374 H286 V482 H134Z" fill={color} opacity="0.5" />
        <path d="M146 392 H274" stroke="#FFFFFF" strokeWidth="3" opacity="0.55" />
      </g>
    );
  }

  if (type === "vase") {
    return (
      <g>
        <path d="M148 326 C164 348 256 348 272 326 L248 482 C232 498 188 498 172 482Z" fill="#FFFFFF" stroke="#D56A91" strokeWidth="3" opacity="0.5" />
        <path d="M154 350 C178 365 242 365 266 350 L248 482 C232 498 188 498 172 482Z" fill={color} opacity="0.38" />
        <ellipse cx="210" cy="326" rx="63" ry="15" fill="#FFFFFF" stroke="#D56A91" strokeWidth="3" opacity="0.72" />
        <path d="M180 366 C194 374 226 374 240 366" fill="none" stroke="#FFFFFF" strokeWidth="3" opacity="0.5" />
      </g>
    );
  }

  if (type === "kraft") {
    return (
      <g>
        <path d="M94 288 C138 260 282 260 326 288 L282 482 C246 500 174 500 138 482Z" fill="#C9A46B" stroke="#D56A91" strokeWidth="3" opacity="0.96" />
        <path d="M104 288 L198 384 L138 482Z" fill="#FFFFFF" opacity="0.14" />
        <path d="M316 288 L222 384 L282 482Z" fill="#7A4E20" opacity="0.12" />
      </g>
    );
  }

  return (
    <g>
      <path d="M96 286 C138 262 282 262 324 286 L282 482 C246 500 174 500 138 482Z" fill={color} stroke="#D56A91" strokeWidth="3" opacity="0.94" />
      <path d="M102 286 L198 385 L137 482Z" fill="#FFFFFF" opacity="0.24" />
      <path d="M318 286 L222 385 L283 482Z" fill="#AD5576" opacity="0.08" />
    </g>
  );
}

type DecorationVisualType = "message" | "tag" | "bow" | "bead" | "leaf" | "led" | "qr";

function getDecorationVisual(option: CatalogOption): DecorationVisualType {
  const text = optionText(option);
  if (includesAny(text, ["qr", "คิวอาร์", "เพลง", "ข้อความ"])) return "qr";
  if (includesAny(text, ["ป้าย", "ชื่อ", "tag", "label"])) return "tag";
  if (includesAny(text, ["โบ", "bow"])) return "bow";
  if (includesAny(text, ["ลูกปัด", "bead", "มุก", "pearl"])) return "bead";
  if (includesAny(text, ["ใบไม้", "leaf", "leaves"])) return "leaf";
  if (includesAny(text, ["ไฟ", "led", "light"])) return "led";
  return "message";
}

function DecorationLayer({ decorations, messageText }: { decorations: CatalogOption[]; messageText: string }) {
  const types = decorations.map(getDecorationVisual);
  if (!types.length) return null;

  return (
    <g>
      {types.includes("leaf") ? (
        <g fill="#7CB342" stroke="#33691E" strokeWidth="1.4" opacity="0.68">
          <path d="M116 244 C84 226 62 204 54 172 C91 175 116 202 116 244Z" />
          <path d="M304 254 C338 232 358 208 365 176 C330 181 306 210 304 254Z" />
          <path d="M120 300 C90 286 68 270 56 242 C88 238 112 264 120 300Z" opacity="0.75" />
        </g>
      ) : null}

      {types.includes("bead") ? (
        <g fill="#F8BBD0" stroke="#AD5576" strokeWidth="1.2">
          {[
            [156, 168],
            [258, 178],
            [184, 132],
            [232, 136],
            [210, 206]
          ].map(([cx, cy], index) => <circle key={`bead-${index}`} cx={cx} cy={cy} r="6" />)}
        </g>
      ) : null}

      {types.includes("led") ? (
        <g>
          <path d="M130 154 C170 122 244 124 286 158" fill="none" stroke="#FFF59D" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
          {[132, 168, 210, 250, 286].map((cx, index) => (
            <circle key={`led-${index}`} cx={cx} cy={index % 2 ? 138 : 154} r="5" fill="#FFF176" stroke="#F9A825" strokeWidth="1.2" />
          ))}
        </g>
      ) : null}

      {types.includes("tag") ? (
        <g transform="translate(266 318) rotate(8)">
          <path d="M0 0 H70 L78 32 L66 64 H0Z" fill="#FFFFFF" stroke="#D56A91" strokeWidth="2" />
          <circle cx="13" cy="14" r="4" fill="#F8BBD0" />
          <path d="M25 19 H58 M15 36 H62 M15 48 H48" stroke="#AD5576" strokeWidth="2" strokeLinecap="round" opacity="0.55" />
        </g>
      ) : null}

      {types.includes("message") ? (
        <g transform="translate(78 324) rotate(-7)">
          <rect x="0" y="0" width="86" height="58" rx="8" fill="#FFFFFF" stroke="#D56A91" strokeWidth="2" />
          <path d="M10 18 H64 M10 32 H70 M10 46 H48" stroke="#AD5576" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
          {messageText ? <text x="12" y="16" fontSize="8" fontWeight="700" fill="#AD5576">{messageText.slice(0, 12)}</text> : null}
        </g>
      ) : null}

      {types.includes("qr") ? (
        <g transform="translate(84 392)">
          <rect width="56" height="56" rx="8" fill="#FFFFFF" stroke="#D56A91" strokeWidth="2" />
          <path d="M10 10 H22 V22 H10Z M34 10 H46 V22 H34Z M10 34 H22 V46 H10Z" fill="#2B2B2B" />
          <path d="M27 12 H31 V18 H27Z M26 26 H34 V30 H26Z M38 31 H44 V36 H38Z M28 39 H34 V46 H28Z" fill="#2B2B2B" />
        </g>
      ) : null}

      {types.includes("bow") ? (
        <g transform="translate(210 354)">
          <path d="M-10 0 C-44 -22 -62 -14 -78 4 C-51 21 -29 24 -10 0Z" fill="#F48BB0" stroke="#AD5576" strokeWidth="2.4" />
          <path d="M10 0 C44 -22 62 -14 78 4 C51 21 29 24 10 0Z" fill="#F48BB0" stroke="#AD5576" strokeWidth="2.4" />
          <circle cx="0" cy="0" r="12" fill="#F48BB0" stroke="#AD5576" strokeWidth="2.4" />
        </g>
      ) : null}
    </g>
  );
}

export function ProductPreview({ compact = false, config: explicitConfig, sampleMode }: ProductPreviewProps) {
  const context = useOptionalConfigurator();
  const hasContext = Boolean(context);
  const [standaloneCatalog, setStandaloneCatalog] = useState<ConfiguratorCatalog>(() => getDefaultConfiguratorCatalog());
  const [randomPreviewConfig, setRandomPreviewConfig] = useState<ConfiguratorState | null>(null);
  const catalog = context?.catalog ?? standaloneCatalog;
  const previewId = useId().replaceAll(":", "");
  const bgId = `${previewId}-preview-bg`;
  const shadowId = `${previewId}-soft-shadow`;
  const [zoomLevel, setZoomLevel] = useState(0);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (hasContext) return;

    let cancelled = false;
    const localCatalog = readAdminConfiguratorCatalog();
    if (hasConfiguratorCatalogData(localCatalog)) {
      setStandaloneCatalog(localCatalog);
    }

    fetchConfiguratorCatalog()
      .then((remoteCatalog) => {
        if (cancelled) return;
        const nextCatalog = hasConfiguratorCatalogData(remoteCatalog) || !hasConfiguratorCatalogData(localCatalog)
          ? remoteCatalog
          : localCatalog;
        setStandaloneCatalog(nextCatalog);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [hasContext]);

  useEffect(() => {
    if (hasContext || explicitConfig || randomPreviewConfig || sampleMode !== "random" || !hasConfiguratorCatalogData(standaloneCatalog)) return;
    setRandomPreviewConfig(createRandomPreviewConfig(standaloneCatalog));
  }, [explicitConfig, hasContext, randomPreviewConfig, sampleMode, standaloneCatalog]);

  const config = explicitConfig ?? context?.config ?? randomPreviewConfig ?? defaultConfig;
  const colors = catalog.colors;
  const flowerTypes = catalog.flowerTypes;
  const wrappingOptions = catalog.wrappingOptions;
  const ribbonOptions = catalog.ribbonOptions;
  const stems = catalog.stems;
  const selectedDecorations = config.decorations.map((id) => catalog.decorationOptions[id]).filter(Boolean);
  const activeColors: ColorId[] = config.flowerColors.length ? config.flowerColors : (colors[0]?.id ? [colors[0].id as ColorId] : []);
  const visibleColors = activeColors.slice(0, Math.min(config.quantity || activeColors.length, 7));
  const stemCount = Math.max(1, Math.min(config.quantity || 1, 12));
  const wrapping = wrappingOptions[config.wrapping];
  const ribbon = ribbonOptions[config.ribbon];
  const wrappingVisual = getWrappingVisual(wrapping);
  const configuredStemColor = stems.colors[config.stem.color] ?? Object.values(stems.colors)[0];
  const stemColor = configuredStemColor ?? { id: "preview-stem", name: "ตัวอย่าง", hex: "#2E7D32", price: 0 };
  const flower = flowerTypes.find((item) => item.id === config.flowerType);
  const hasFlower = Boolean(flower);
  const hasConfiguredStemColor = Boolean(configuredStemColor);
  const selectedStemStrength = stems.strengths[config.stem.strength];
  const selectedStemStyle = stems.styles[config.stem.style];
  const selectedStemLength = stems.lengths[String(config.stem.length)] ?? Object.values(stems.lengths).find((item) => item.id === String(config.stem.length) || optionText(item).includes(String(config.stem.length)));
  const stemVisual = getStemVisual(selectedStemStrength, selectedStemStyle, selectedStemLength, config.stem.length);
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
      y: 124 + depth + stemVisual.headYShift,
      baseX: 210 + centerOffset * 9,
      baseY: stemVisual.placeholderBaseY,
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
      y: 74 + depth + stemVisual.headYShift,
      scale: Math.max(0.48, (isCenter ? 0.82 : 0.72) - visibleColors.length * 0.018),
      rotate: spread * 0.23
    };
  }).filter(Boolean);
  const fittedScale = hasFlower ? 0.78 : 0.86;
  const zoomScale = [fittedScale, fittedScale * 1.16, fittedScale * 1.34][zoomLevel] ?? fittedScale;
  const previewMotionStyle = {
    transform: `rotate(${rotation}deg) scale(${zoomScale})`
  } as React.CSSProperties;

  function toggleZoom() {
    setZoomLevel((current) => (current + 1) % 3);
  }

  function rotatePreview() {
    setRotation((current) => (current + 30) % 360);
  }

  return (
    <div className="relative overflow-hidden rounded-bloom bg-white p-2 shadow-sm sm:p-4">
      <div className="absolute right-5 top-5 z-10 flex gap-2 sm:right-7 sm:top-6">
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
              className="preview-motion"
              style={previewMotionStyle}
            >
              {placeholderStems.map((item) => {
                const baseDx = (item.baseX - item.x) / item.scale;
                const baseDy = (item.baseY - item.y) / item.scale;
                const pathD = previewStemPath(baseDx, baseDy, stemVisual.curveOffset);
                const doubleOffset = Math.max(3, stemVisual.width * 0.72);

                return (
                  <g key={item.id} transform={`translate(${item.x} ${item.y}) rotate(${item.rotate}) scale(${item.scale})`}>
                    <path d={pathD} fill="none" stroke="#1B5E20" strokeWidth={stemVisual.width + 3} strokeLinecap="round" opacity="0.16" />
                    {stemVisual.style === "ribbon" ? <path d={pathD} fill="none" stroke="#F48BB0" strokeWidth={stemVisual.width + 4.5} strokeLinecap="round" opacity="0.42" /> : null}
                    {stemVisual.style === "double" ? (
                      <>
                        <path d={pathD} fill="none" stroke={stemColor.hex} strokeWidth={stemVisual.width * 0.72} strokeLinecap="round" transform={`translate(${-doubleOffset} 0)`} />
                        <path d={pathD} fill="none" stroke={stemColor.hex} strokeWidth={stemVisual.width * 0.72} strokeLinecap="round" transform={`translate(${doubleOffset} 0)`} />
                      </>
                    ) : (
                      <path d={pathD} fill="none" stroke={stemColor.hex} strokeWidth={stemVisual.width} strokeLinecap="round" />
                    )}
                    {stemVisual.style === "spiral" ? (
                      <path d={pathD} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={Math.max(1.2, stemVisual.width * 0.3)} strokeLinecap="round" transform="translate(-2.4 0)" opacity="0.72" />
                    ) : null}
                    {stemVisual.style === "ribbon" ? (
                      <path d={pathD} fill="none" stroke="rgba(255,255,255,0.36)" strokeWidth={Math.max(1.2, stemVisual.width * 0.24)} strokeLinecap="round" transform="translate(-2 0)" opacity="0.75" />
                    ) : null}
                    {item.showLeaf ? (
                      <path
                        d={item.leafSide < 0 ? "M0 0 C-20 -10 -36 -28 -45 -54 C-19 -49 -4 -25 0 0Z" : "M0 0 C20 -12 36 -31 46 -58 C20 -52 5 -25 0 0Z"}
                          fill={stemColor.hex}
                        opacity="0.5"
                        stroke="#1B5E20"
                        strokeWidth="1.5"
                        transform={`translate(${getStemCurvePoint(baseDx, baseDy, item.leafSide < 0 ? 0.36 : 0.48).x} ${getStemCurvePoint(baseDx, baseDy, item.leafSide < 0 ? 0.36 : 0.48).y}) rotate(${item.leafSide < 0 ? -8 : 8}) scale(0.86)`}
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
            className="preview-motion"
            style={previewMotionStyle}
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
                baseY={stemVisual.flowerBaseY}
                stemWidth={stemVisual.width}
                stemStyle={stemVisual.style}
                stemCurveOffset={stemVisual.curveOffset}
                stemLengthScale={stemVisual.lengthScale}
              />
            ) : null) : null}

            {hasFlower ? <ArrangementWrap type={wrappingVisual} color={wrapping?.color ?? "#FCE4EC"} /> : null}

            {hasFlower && ribbon && wrappingVisual !== "none" ? (
              <g transform="translate(210 365)">
                <path d="M-12 0 C-60 -30 -82 -20 -104 4 C-70 26 -42 31 -12 0Z" fill={ribbon.color} stroke="#AD5576" strokeWidth="3" />
                <path d="M12 0 C60 -30 82 -20 104 4 C70 26 42 31 12 0Z" fill={ribbon.color} stroke="#AD5576" strokeWidth="3" />
                <circle cx="0" cy="0" r="17" fill={ribbon.color} stroke="#AD5576" strokeWidth="3" />
                <path d="M-10 15 C-24 48 -31 72 -30 100" fill="none" stroke={ribbon.color} strokeWidth="14" strokeLinecap="round" />
                <path d="M10 15 C24 48 31 72 30 100" fill="none" stroke={ribbon.color} strokeWidth="14" strokeLinecap="round" />
              </g>
            ) : null}

            {hasFlower ? <DecorationLayer decorations={selectedDecorations} messageText={config.cardMessage.message} /> : null}
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
