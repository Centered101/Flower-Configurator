import type { CatalogOption, FlowerColor, FlowerType, ProductType, StemOption } from "@/lib/types";

export type ConfiguratorMaterial = {
  id: string;
  name: string;
  color: string;
  stock: number;
  unit: string;
  alertAt: number;
};

export type ConfiguratorMaterialLink = {
  id?: string;
  optionType: "product_type" | "flower_type" | "color" | "stem" | "wrapping" | "ribbon" | "decoration";
  optionId: string;
  materialId: string;
  quantityPerUnit: number;
};

export type EditableProductType = Omit<ProductType, "id"> & { id: string };
export type EditableFlowerType = Omit<FlowerType, "id"> & { id: string };
export type EditableFlowerColor = Omit<FlowerColor, "id"> & { id: string };
export type EditableStemOption = {
  strengths: Record<string, CatalogOption>;
  styles: Record<string, CatalogOption>;
  lengths: StemOption["lengths"];
  colors: Record<string, { id: string; name: string; hex: string; price: number }>;
};
export type EditableWrappingOption = { id: string; name: string; description: string; price: number; color: string };
export type EditableRibbonOption = { id: string; name: string; price: number; color: string };
export type EditableDecorationOption = CatalogOption;

export type ConfiguratorCatalog = {
  productTypes: EditableProductType[];
  flowerTypes: EditableFlowerType[];
  colors: EditableFlowerColor[];
  stems: EditableStemOption;
  wrappingOptions: Record<string, EditableWrappingOption>;
  ribbonOptions: Record<string, EditableRibbonOption>;
  decorationOptions: Record<string, EditableDecorationOption>;
  materials: ConfiguratorMaterial[];
  materialLinks: ConfiguratorMaterialLink[];
  reviewNote: string;
};

export const ADMIN_CONFIGURATOR_CATALOG_KEY = "flower-admin-configurator-catalog";

export function getDefaultConfiguratorCatalog(): ConfiguratorCatalog {
  return {
    productTypes: [],
    flowerTypes: [],
    colors: [],
    stems: {
      strengths: {},
      styles: {},
      lengths: {},
      colors: {}
    },
    wrappingOptions: {},
    ribbonOptions: {},
    decorationOptions: {},
    materials: [],
    materialLinks: [],
    reviewNote: "ราคานี้เป็นราคาประมาณการ ร้านจะตรวจสอบและยืนยันอีกครั้งก่อนเริ่มผลิต"
  };
}

export function hasConfiguratorCatalogData(catalog: ConfiguratorCatalog) {
  return (
    catalog.productTypes.length > 0 ||
    catalog.flowerTypes.length > 0 ||
    catalog.colors.length > 0 ||
    Object.keys(catalog.stems.strengths).length > 0 ||
    Object.keys(catalog.stems.styles).length > 0 ||
    Object.keys(catalog.stems.lengths).length > 0 ||
    Object.keys(catalog.stems.colors).length > 0 ||
    Object.keys(catalog.wrappingOptions).length > 0 ||
    Object.keys(catalog.ribbonOptions).length > 0 ||
    Object.keys(catalog.decorationOptions).length > 0
  );
}

export function readAdminConfiguratorCatalog(): ConfiguratorCatalog {
  const defaults = getDefaultConfiguratorCatalog();
  if (typeof window === "undefined") return defaults;

  try {
    const raw = window.localStorage.getItem(ADMIN_CONFIGURATOR_CATALOG_KEY);
    if (!raw) return defaults;
    const saved = JSON.parse(raw) as Partial<ConfiguratorCatalog>;

    return {
      ...defaults,
      ...saved,
      stems: {
        ...defaults.stems,
        ...saved.stems
      },
      wrappingOptions: {
        ...defaults.wrappingOptions,
        ...saved.wrappingOptions
      },
      ribbonOptions: {
        ...defaults.ribbonOptions,
        ...saved.ribbonOptions
      },
      decorationOptions: {
        ...defaults.decorationOptions,
        ...saved.decorationOptions
      }
    };
  } catch {
    return defaults;
  }
}

export function saveAdminConfiguratorCatalog(catalog: ConfiguratorCatalog) {
  window.localStorage.setItem(ADMIN_CONFIGURATOR_CATALOG_KEY, JSON.stringify(catalog));
}

export async function fetchConfiguratorCatalog() {
  const response = await fetch("/api/configurator-catalog", {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("โหลดตัวเลือกออกแบบไม่สำเร็จ");
  }

  return response.json() as Promise<ConfiguratorCatalog>;
}

export async function persistConfiguratorCatalog(catalog: ConfiguratorCatalog) {
  const response = await fetch("/api/configurator-catalog", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(catalog)
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error ?? "บันทึกตัวเลือกออกแบบไม่สำเร็จ");
  }

  return response.json() as Promise<ConfiguratorCatalog>;
}
