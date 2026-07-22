import { colors, decorationOptions, flowerTypes, productTypes, ribbonOptions, stems, wrappingOptions } from "./catalog";
import { getDefaultConfiguratorCatalog, type ConfiguratorCatalog } from "./configurator-catalog";
import type { ColorId, ConfiguratorState, DecorationId, FlowerTypeId, ProductTypeId } from "./types";

export const STORAGE_KEY = "flower-configurator-state-v2";
export const ORDER_STORAGE_KEY = "flower-configurator-orders";
export const LAST_ORDER_KEY = "flower-configurator-last-order";

export const defaultConfig: ConfiguratorState = {
  productType: "",
  flowerType: "",
  quantity: 1,
  colorMode: "single",
  flowerColors: [],
  stem: {
    strength: "",
    style: "",
    length: 0,
    color: ""
  },
  wrapping: "",
  ribbon: "",
  decorations: [],
  cardMessage: {
    to: "",
    message: "",
    from: ""
  },
  pickupDate: "",
  totalPrice: 0
};

export function getProductType(id: ProductTypeId | "", catalog: ConfiguratorCatalog = getDefaultConfiguratorCatalog()) {
  return catalog.productTypes.find((item) => item.id === id);
}

export function getFlowerType(id: FlowerTypeId | "", catalog: ConfiguratorCatalog = getDefaultConfiguratorCatalog()) {
  return catalog.flowerTypes.find((item) => item.id === id);
}

export function getColor(id: ColorId, catalog: ConfiguratorCatalog = getDefaultConfiguratorCatalog()) {
  return catalog.colors.find((item) => item.id === id) ?? catalog.colors[0];
}

export function normalizeColors(next: ConfiguratorState, catalog: ConfiguratorCatalog = getDefaultConfiguratorCatalog()) {
  const quantity = Math.max(1, next.quantity);
  const fallbackColor = next.flowerColors[0] ?? catalog.colors[0]?.id;
  if (!fallbackColor) return [];

  if (next.colorMode === "single") {
    return Array.from({ length: quantity }, () => fallbackColor) as ColorId[];
  }
  return Array.from({ length: quantity }, (_, index) => next.flowerColors[index] ?? fallbackColor) as ColorId[];
}

export function updateConfigPrice(config: ConfiguratorState, catalog: ConfiguratorCatalog = getDefaultConfiguratorCatalog()): ConfiguratorState {
  const flowerColors = normalizeColors(config, catalog);
  const product = getProductType(config.productType, catalog);
  const flower = getFlowerType(config.flowerType, catalog);
  const base = product?.price ?? 0;
  const quantity = product?.baseQuantity ?? config.quantity;
  const flowerPrice = (flower?.price ?? 0) * quantity;
  const colorPrice = flowerColors.reduce((sum, colorId) => sum + (getColor(colorId, catalog)?.price ?? 0), 0);
  const stemPrice =
    (catalog.stems.strengths[config.stem.strength]?.price ?? 0) +
    (catalog.stems.styles[config.stem.style]?.price ?? 0) +
    (catalog.stems.lengths[String(config.stem.length)]?.price ?? 0) +
    (catalog.stems.colors[config.stem.color]?.price ?? 0);
  const wrappingPrice = (catalog.wrappingOptions[config.wrapping]?.price ?? 0) + (catalog.ribbonOptions[config.ribbon]?.price ?? 0);
  const decorationPrice = config.decorations.reduce((sum, id) => sum + (catalog.decorationOptions[id]?.price ?? 0), 0);

  return {
    ...config,
    quantity,
    flowerColors,
    totalPrice: base + flowerPrice + colorPrice + stemPrice + wrappingPrice + decorationPrice
  };
}

export function createConfigPatch(config: ConfiguratorState, patch: Partial<ConfiguratorState>, catalog: ConfiguratorCatalog = getDefaultConfiguratorCatalog()) {
  const merged = { ...config, ...patch };
  if (patch.productType) {
    const product = getProductType(patch.productType, catalog);
    if (product) merged.quantity = product.baseQuantity;
  }
  return updateConfigPrice(merged, catalog);
}

export function priceBreakdown(config: ConfiguratorState, catalog: ConfiguratorCatalog = getDefaultConfiguratorCatalog()) {
  const priced = updateConfigPrice(config, catalog);
  const product = getProductType(priced.productType, catalog);
  const flower = getFlowerType(priced.flowerType, catalog);
  const decorations = priced.decorations.map((id: DecorationId) => catalog.decorationOptions[id]).filter(Boolean);
  return [
    { label: product ? product.name : "ยังไม่ได้เลือกรูปแบบ", value: product?.price ?? 0 },
    { label: flower ? `${flower.name} ${priced.quantity} ดอก` : "ยังไม่ได้เลือกชนิดดอกไม้", value: (flower?.price ?? 0) * priced.quantity },
    { label: "ค่าสีดอกไม้", value: priced.flowerColors.reduce((sum, colorId) => sum + (getColor(colorId, catalog)?.price ?? 0), 0) },
    { label: `${catalog.stems.strengths[priced.stem.strength]?.name ?? "ก้าน"} / ${catalog.stems.styles[priced.stem.style]?.name ?? "รูปแบบ"}`, value: (catalog.stems.strengths[priced.stem.strength]?.price ?? 0) + (catalog.stems.styles[priced.stem.style]?.price ?? 0) },
    { label: `${catalog.wrappingOptions[priced.wrapping]?.name ?? "ยังไม่ได้เลือกการจัดช่อ"} + ริบบิ้น${catalog.ribbonOptions[priced.ribbon]?.name ?? "ยังไม่ได้เลือก"}`, value: (catalog.wrappingOptions[priced.wrapping]?.price ?? 0) + (catalog.ribbonOptions[priced.ribbon]?.price ?? 0) },
    ...decorations.map((item) => ({ label: item.name, value: item.price }))
  ];
}

export function productionScore(config: ConfiguratorState, catalog: ConfiguratorCatalog = getDefaultConfiguratorCatalog()) {
  const product = getProductType(config.productType, catalog);
  return product?.productionScore ?? Math.max(1, config.quantity);
}

export function isStepComplete(step: number, config: ConfiguratorState) {
  if (step === 0) return Boolean(config.productType);
  if (step === 1) return Boolean(config.flowerType);
  if (step === 2) return config.flowerColors.length >= config.quantity;
  return true;
}
