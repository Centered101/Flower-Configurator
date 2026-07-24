export const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME?.trim() || "Flower Configurator";
export const CREATOR_NAME = process.env.NEXT_PUBLIC_CREATOR_NAME?.trim() || "centered101";

function withHttps(value: string) {
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

function resolveSiteUrl() {
  const explicitSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicitSiteUrl) return explicitSiteUrl;

  const vercelUrl = (
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
    || process.env.VERCEL_URL?.trim()
    || process.env.NEXT_PUBLIC_VERCEL_URL?.trim()
  );

  return vercelUrl ? withHttps(vercelUrl) : "http://localhost:3000";
}

export const SITE_URL = resolveSiteUrl();

export function withBrandTitle(title: string) {
  return `${title} | ${BRAND_NAME}`;
}
