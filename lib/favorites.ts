const FAVORITE_GALLERY_KEY = "flower-favorite-gallery";
const FAVORITE_PRODUCT_KEY = "flower-favorite-products";
const FAVORITES_UPDATED_EVENT = "flower-favorites-updated";

function readFavoriteIds(key: string) {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function toggleFavoriteId(key: string, id: string) {
  const current = readFavoriteIds(key);
  const next = current.includes(id) ? current.filter((item) => item !== id) : [id, ...current];
  window.localStorage.setItem(key, JSON.stringify(next));
  window.dispatchEvent(new Event(FAVORITES_UPDATED_EVENT));
  return next;
}

function clearFavoriteIds(key: string) {
  window.localStorage.setItem(key, JSON.stringify([]));
  window.dispatchEvent(new Event(FAVORITES_UPDATED_EVENT));
}

export function getFavoriteGalleryIds() {
  return readFavoriteIds(FAVORITE_GALLERY_KEY);
}

export function isFavoriteGalleryItem(id: string) {
  return getFavoriteGalleryIds().includes(id);
}

export function toggleFavoriteGalleryItem(id: string) {
  return toggleFavoriteId(FAVORITE_GALLERY_KEY, id);
}

export function clearFavoriteGalleryItems() {
  clearFavoriteIds(FAVORITE_GALLERY_KEY);
}

export function getFavoriteProductIds() {
  return readFavoriteIds(FAVORITE_PRODUCT_KEY);
}

export function isFavoriteProduct(id: string) {
  return getFavoriteProductIds().includes(id);
}

export function toggleFavoriteProduct(id: string) {
  return toggleFavoriteId(FAVORITE_PRODUCT_KEY, id);
}

export function clearFavoriteProducts() {
  clearFavoriteIds(FAVORITE_PRODUCT_KEY);
}

export function listenForFavoriteUpdates(callback: () => void) {
  function handleStorage(event: StorageEvent) {
    if (event.key === FAVORITE_GALLERY_KEY || event.key === FAVORITE_PRODUCT_KEY) callback();
  }

  window.addEventListener(FAVORITES_UPDATED_EVENT, callback);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(FAVORITES_UPDATED_EVENT, callback);
    window.removeEventListener("storage", handleStorage);
  };
}
