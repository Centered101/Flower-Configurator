import type { ProcessedImage } from "@/lib/image-processing";

export type AdminProduct = {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  productionScore: number;
  image?: ProcessedImage;
};

export type AdminMaterial = {
  id: string;
  name: string;
  color: string;
  stock: number;
  unit: string;
  alertAt: number;
  cost: number;
  supplier?: string;
  status?: string;
};

export type DesignOptionMaterialLink = {
  id?: string;
  optionType: "product_type" | "flower_type" | "color" | "stem" | "wrapping" | "ribbon" | "decoration";
  optionId: string;
  materialId: string;
  quantityPerUnit: number;
};

export class OptionalSchemaMissingError extends Error {
  code = "OPTIONAL_SCHEMA_MISSING" as const;
}

export type AdminGalleryItem = {
  id: string;
  title: string;
  flower: string;
  color: string;
  size: string;
  price: number;
  productionScore?: number;
  image?: ProcessedImage;
};

export const ADMIN_PRODUCTS_KEY = "flower-admin-products";
export const ADMIN_MATERIALS_KEY = "flower-admin-materials";
export const ADMIN_GALLERY_KEY = "flower-admin-gallery";

export function readAdminItems<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "[]") as T[];
  } catch {
    return [];
  }
}

export function saveAdminItems<T>(key: string, items: T[]) {
  window.localStorage.setItem(key, JSON.stringify(items));
}

async function readResponse<T>(response: Response, fallbackMessage: string) {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(typeof data?.error === "string" ? data.error : fallbackMessage);
  }

  return data as T;
}

export async function fetchPublicProducts() {
  const response = await fetch("/api/products", { cache: "no-store" });
  return readResponse<AdminProduct[]>(response, "โหลดสินค้าไม่สำเร็จ");
}

export async function fetchAdminProducts() {
  const response = await fetch("/api/admin/products", { cache: "no-store" });
  return readResponse<AdminProduct[]>(response, "โหลดสินค้าไม่สำเร็จ");
}

export async function persistAdminProduct(product: AdminProduct) {
  const response = await fetch("/api/admin/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product)
  });

  return readResponse<AdminProduct>(response, "บันทึกสินค้าไม่สำเร็จ");
}

export async function deleteAdminProduct(id: string) {
  const response = await fetch(`/api/admin/products?id=${encodeURIComponent(id)}`, {
    method: "DELETE"
  });

  return readResponse<{ ok: true }>(response, "ลบสินค้าไม่สำเร็จ");
}

export async function fetchAdminMaterials() {
  const response = await fetch("/api/admin/materials", { cache: "no-store" });
  return readResponse<AdminMaterial[]>(response, "โหลดวัสดุไม่สำเร็จ");
}

export async function persistAdminMaterial(material: AdminMaterial) {
  const response = await fetch("/api/admin/materials", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(material)
  });

  return readResponse<AdminMaterial>(response, "บันทึกวัสดุไม่สำเร็จ");
}

export async function deleteAdminMaterial(id: string) {
  const response = await fetch(`/api/admin/materials?id=${encodeURIComponent(id)}`, {
    method: "DELETE"
  });

  return readResponse<{ ok: true }>(response, "ลบวัสดุไม่สำเร็จ");
}

export async function fetchOptionMaterialLinks() {
  const result = await fetchOptionMaterialLinksState();
  return result.links;
}

export async function fetchOptionMaterialLinksState() {
  const response = await fetch("/api/admin/option-materials", { cache: "no-store" });
  const links = await readResponse<DesignOptionMaterialLink[]>(response, "โหลดการผูกวัสดุไม่สำเร็จ");
  return {
    links,
    schemaReady: response.headers.get("x-schema-ready") !== "false"
  };
}

export async function persistOptionMaterialLinks(links: DesignOptionMaterialLink[]) {
  const response = await fetch("/api/admin/option-materials", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(links)
  });

  try {
    return await readResponse<DesignOptionMaterialLink[]>(response, "บันทึกการผูกวัสดุไม่สำเร็จ");
  } catch (error) {
    if (error instanceof Error && error.message.includes("design_option_materials")) {
      throw new OptionalSchemaMissingError(error.message);
    }

    throw error;
  }
}

export async function fetchPublicGalleryItems() {
  const response = await fetch("/api/gallery", { cache: "no-store" });
  return readResponse<AdminGalleryItem[]>(response, "โหลดผลงานไม่สำเร็จ");
}

export async function fetchAdminGalleryItems() {
  const response = await fetch("/api/admin/gallery", { cache: "no-store" });
  return readResponse<AdminGalleryItem[]>(response, "โหลดผลงานไม่สำเร็จ");
}

export async function persistAdminGalleryItem(item: AdminGalleryItem) {
  const response = await fetch("/api/admin/gallery", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item)
  });

  return readResponse<AdminGalleryItem>(response, "บันทึกผลงานไม่สำเร็จ");
}

export async function deleteAdminGalleryItem(id: string) {
  const response = await fetch(`/api/admin/gallery?id=${encodeURIComponent(id)}`, {
    method: "DELETE"
  });

  return readResponse<{ ok: true }>(response, "ลบผลงานไม่สำเร็จ");
}
