import type { OrderSourceItem } from "./types";

export const QUICK_ORDER_KEY = "flower-quick-order";

export function saveQuickOrder(item: OrderSourceItem) {
  if (typeof window === "undefined") return false;

  try {
    window.localStorage.setItem(QUICK_ORDER_KEY, JSON.stringify(item));
    return true;
  } catch {
    return false;
  }
}

export function readQuickOrder() {
  if (typeof window === "undefined") return null;

  try {
    const value = JSON.parse(window.localStorage.getItem(QUICK_ORDER_KEY) ?? "null");
    if (!value || typeof value !== "object") return null;

    const item = value as Partial<OrderSourceItem>;
    if (!item.id || !item.title || !item.sourceType) return null;

    return {
      sourceType: item.sourceType,
      id: item.id,
      title: item.title,
      description: item.description ?? "",
      price: Number(item.price ?? 0),
      productionScore: Math.max(1, Number(item.productionScore ?? 1)),
      imageUrl: item.imageUrl,
      details: Array.isArray(item.details) ? item.details.filter((detail): detail is string => typeof detail === "string" && Boolean(detail.trim())) : []
    } satisfies OrderSourceItem;
  } catch {
    return null;
  }
}

export function clearQuickOrder() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(QUICK_ORDER_KEY);
  } catch {
    // Ignore storage failures so checkout completion is not blocked.
  }
}
