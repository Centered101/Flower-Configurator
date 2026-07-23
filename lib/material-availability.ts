import type { ConfiguratorCatalog, ConfiguratorMaterial, ConfiguratorMaterialLink } from "@/lib/configurator-catalog";
import type { ConfiguratorState } from "@/lib/types";

export type OptionMaterialStatus = {
  links: Array<{
    link: ConfiguratorMaterialLink;
    material?: ConfiguratorMaterial;
    required: number;
    shortage: number;
  }>;
  available: boolean;
  availableSets: number | null;
  label: string;
};

function normalizeUnits(units: number) {
  return Number.isFinite(units) && units > 0 ? units : 1;
}

function normalizeQuantity(quantity: number) {
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
}

export function getOptionMaterialStatus(
  catalog: ConfiguratorCatalog,
  optionType: ConfiguratorMaterialLink["optionType"],
  optionId: string,
  units = 1
): OptionMaterialStatus | null {
  const links = catalog.materialLinks.filter((link) => link.optionType === optionType && link.optionId === optionId);
  if (!links.length) return null;

  const materialById = new Map(catalog.materials.map((material) => [material.id, material]));
  const unitCount = normalizeUnits(units);
  const rows = links.map((link) => {
    const material = materialById.get(link.materialId);
    const quantity = normalizeQuantity(link.quantityPerUnit);
    const required = quantity * unitCount;
    const stock = material?.stock ?? 0;

    return {
      link,
      material,
      required,
      shortage: Math.max(0, required - stock)
    };
  });

  const available = rows.every((row) => row.material && row.shortage <= 0);
  const availableSets = rows.every((row) => row.material)
    ? Math.min(...rows.map((row) => Math.floor((row.material?.stock ?? 0) / normalizeQuantity(row.link.quantityPerUnit))))
    : null;
  const missingNames = rows.filter((row) => !row.material).length;

  if (!available) {
    const shortages = rows
      .filter((row) => row.shortage > 0 || !row.material)
      .map((row) => row.material ? `${row.material.name} ขาด ${row.shortage.toLocaleString("th-TH")} ${row.material.unit}` : "วัสดุที่ผูกไว้ถูกลบ")
      .join(", ");

    return {
      links: rows,
      available,
      availableSets,
      label: shortages || `วัสดุไม่ครบ ${missingNames.toLocaleString("th-TH")} รายการ`
    };
  }

  const materialNames = rows
    .map((row) => row.material?.name)
    .filter(Boolean)
    .slice(0, 2)
    .join(", ");

  return {
    links: rows,
    available,
    availableSets,
    label: materialNames
      ? `ใช้วัสดุ ${materialNames} / พอทำ ${Math.max(0, availableSets ?? 0).toLocaleString("th-TH")} ชุด`
      : "ผูกวัสดุแล้ว"
  };
}

export function getOptionMaterialMeta(
  catalog: ConfiguratorCatalog,
  optionType: ConfiguratorMaterialLink["optionType"],
  optionId: string,
  units = 1
) {
  return getOptionMaterialStatus(catalog, optionType, optionId, units)?.label;
}

export function isOptionMaterialAvailable(
  catalog: ConfiguratorCatalog,
  optionType: ConfiguratorMaterialLink["optionType"],
  optionId: string,
  units = 1
) {
  return getOptionMaterialStatus(catalog, optionType, optionId, units)?.available ?? true;
}

export function joinOptionMeta(...parts: Array<string | undefined | null | false>) {
  return parts.filter(Boolean).join(" / ");
}

export function getConfigMaterialSummary(config: ConfiguratorState, catalog: ConfiguratorCatalog) {
  const materialById = new Map(catalog.materials.map((material) => [material.id, material]));
  const requirements = new Map<string, { material: ConfiguratorMaterial; required: number }>();

  function add(optionType: ConfiguratorMaterialLink["optionType"], optionId: string | number | undefined, units = 1) {
    if (!optionId) return;

    for (const link of catalog.materialLinks.filter((item) => item.optionType === optionType && item.optionId === String(optionId))) {
      const material = materialById.get(link.materialId);
      if (!material) continue;
      const current = requirements.get(material.id) ?? { material, required: 0 };
      current.required += normalizeQuantity(link.quantityPerUnit) * normalizeUnits(units);
      requirements.set(material.id, current);
    }
  }

  add("product_type", config.productType, 1);
  add("flower_type", config.flowerType, config.quantity);

  const colorCounts = new Map<string, number>();
  for (const colorId of config.flowerColors) {
    colorCounts.set(colorId, (colorCounts.get(colorId) ?? 0) + 1);
  }
  for (const [colorId, count] of colorCounts.entries()) {
    add("color", colorId, count);
  }

  add("stem", config.stem.strength, config.quantity);
  add("stem", config.stem.style, config.quantity);
  add("stem", config.stem.length, config.quantity);
  add("stem", config.stem.color, config.quantity);
  add("wrapping", config.wrapping, 1);
  add("ribbon", config.ribbon, 1);

  for (const decoration of config.decorations) {
    add("decoration", decoration, 1);
  }

  return Array.from(requirements.values()).map((row) => ({
    ...row,
    available: row.material.stock >= row.required
  }));
}
