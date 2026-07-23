import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const FAVORITE_GALLERY_KEY = "flower-favorite-gallery";
const FAVORITE_PRODUCT_KEY = "flower-favorite-products";
const FAVORITES_UPDATED_EVENT = "flower-favorites-updated";

type FavoriteType = "gallery" | "product";
type FavoriteState = {
  galleryIds: string[];
  productIds: string[];
};

const favoriteKeys: Record<FavoriteType, string> = {
  gallery: FAVORITE_GALLERY_KEY,
  product: FAVORITE_PRODUCT_KEY
};

function readFavoriteIds(key: string) {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function uniqueIds(ids: string[]) {
  return Array.from(new Set(ids.filter(Boolean)));
}

function writeFavoriteIds(key: string, ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(uniqueIds(ids)));
}

function writeFavoriteState(state: FavoriteState) {
  writeFavoriteIds(FAVORITE_GALLERY_KEY, state.galleryIds);
  writeFavoriteIds(FAVORITE_PRODUCT_KEY, state.productIds);
  window.dispatchEvent(new Event(FAVORITES_UPDATED_EVENT));
}

function readFavoriteState(): FavoriteState {
  return {
    galleryIds: getFavoriteGalleryIds(),
    productIds: getFavoriteProductIds()
  };
}

async function getAccessToken() {
  try {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? "";
  } catch {
    return "";
  }
}

async function requestFavoriteState(init?: RequestInit) {
  const token = await getAccessToken();
  if (!token) return null;
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Content-Type", "application/json");

  const response = await fetch("/api/favorites", {
    ...init,
    headers,
    cache: "no-store"
  });

  if (response.status === 401) return null;
  if (!response.ok) throw new Error("ซิงก์รายการถูกใจไม่สำเร็จ");
  return response.json() as Promise<FavoriteState>;
}

function mergeFavoriteState(left: FavoriteState, right: FavoriteState): FavoriteState {
  return {
    galleryIds: uniqueIds([...left.galleryIds, ...right.galleryIds]),
    productIds: uniqueIds([...left.productIds, ...right.productIds])
  };
}

async function persistFavoriteChange(type: FavoriteType, id: string, favorite: boolean) {
  const remote = await requestFavoriteState({
    method: "POST",
    body: JSON.stringify({ itemType: type, itemId: id, favorite })
  });

  if (remote) writeFavoriteState(remote);
}

function toggleFavoriteId(key: string, id: string) {
  const current = readFavoriteIds(key);
  const next = current.includes(id) ? current.filter((item) => item !== id) : [id, ...current];
  window.localStorage.setItem(key, JSON.stringify(next));
  window.dispatchEvent(new Event(FAVORITES_UPDATED_EVENT));
  return next;
}

function toggleFavorite(type: FavoriteType, id: string) {
  const next = toggleFavoriteId(favoriteKeys[type], id);
  persistFavoriteChange(type, id, next.includes(id)).catch(() => undefined);
  return next;
}

function clearFavoriteIds(key: string) {
  window.localStorage.setItem(key, JSON.stringify([]));
  window.dispatchEvent(new Event(FAVORITES_UPDATED_EVENT));
}

export async function syncFavoritesWithSupabase() {
  const local = readFavoriteState();

  try {
    const remote = await requestFavoriteState();
    if (!remote) return local;

    const merged = mergeFavoriteState(local, remote);
    if (
      merged.galleryIds.length !== remote.galleryIds.length ||
      merged.productIds.length !== remote.productIds.length
    ) {
      const saved = await requestFavoriteState({
        method: "PUT",
        body: JSON.stringify(merged)
      });
      if (saved) {
        writeFavoriteState(saved);
        return saved;
      }
    }

    writeFavoriteState(merged);
    return merged;
  } catch {
    return local;
  }
}

export function getFavoriteGalleryIds() {
  return readFavoriteIds(FAVORITE_GALLERY_KEY);
}

export function isFavoriteGalleryItem(id: string) {
  return getFavoriteGalleryIds().includes(id);
}

export function toggleFavoriteGalleryItem(id: string) {
  return toggleFavorite("gallery", id);
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
  return toggleFavorite("product", id);
}

export function clearFavoriteProducts() {
  clearFavoriteIds(FAVORITE_PRODUCT_KEY);
}

export function clearAllFavorites() {
  clearFavoriteIds(FAVORITE_GALLERY_KEY);
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
