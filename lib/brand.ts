export const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME?.trim() || "Flower Configurator";
export const CREATOR_NAME = process.env.NEXT_PUBLIC_CREATOR_NAME?.trim() || "centered101";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";

export function withBrandTitle(title: string) {
  return `${title} | ${BRAND_NAME}`;
}
