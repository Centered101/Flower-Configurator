"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { OrderableItemCard } from "@/components/OrderableItemCard";
import type { AdminGalleryItem } from "@/lib/admin-data";
import { getFavoriteGalleryIds, listenForFavoriteUpdates, syncFavoritesWithSupabase, toggleFavoriteGalleryItem } from "@/lib/favorites";
import { saveQuickOrder } from "@/lib/quick-order";

export function HomeGallerySection({ initialItems = [] }: { initialItems?: AdminGalleryItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState<AdminGalleryItem[]>(initialItems);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  useEffect(() => {
    setFavoriteIds(getFavoriteGalleryIds());
    syncFavoritesWithSupabase().then((favorites) => setFavoriteIds(favorites.galleryIds)).catch(() => undefined);
  }, []);

  useEffect(() => {
    return listenForFavoriteUpdates(() => setFavoriteIds(getFavoriteGalleryIds()));
  }, []);

  function toggleFavorite(item: AdminGalleryItem) {
    const next = toggleFavoriteGalleryItem(item.id);
    setFavoriteIds(next);
    toast.success(next.includes(item.id) ? "เพิ่มผลงานที่ถูกใจแล้ว" : "นำออกจากรายการถูกใจแล้ว");
  }

  function orderGalleryItem(item: AdminGalleryItem) {
    saveQuickOrder({
      sourceType: "gallery",
      id: item.id,
      title: item.title,
      description: [item.flower, item.color, item.size].filter(Boolean).join(" / "),
      price: Number(item.price || 0),
      productionScore: Math.max(1, Number(item.productionScore ?? 1)),
      imageUrl: item.image?.url,
      details: [item.flower, item.color, item.size].filter(Boolean)
    });
    router.push(`/checkout?quickOrder=1&source=gallery&id=${encodeURIComponent(item.id)}`);
  }

  return (
    <section className="container-page py-8" data-aos="fade-up">
      <h2 className="mb-5 text-2xl font-bold text-ink">ผลงานที่ผ่านมา</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {items.length ? items.map((item) => (
          <OrderableItemCard
            key={item.id}
            title={item.title}
            details={[item.flower, item.color, item.size].filter(Boolean).join(" / ")}
            priceText={`${Number(item.price || 0).toLocaleString("th-TH")} บาท`}
            productionScore={Math.max(1, Number(item.productionScore ?? 1))}
            image={item.image}
            isFavorite={favoriteIds.includes(item.id)}
            favoriteLabel="ถูกใจผลงานนี้"
            unfavoriteLabel="ยกเลิกถูกใจผลงานนี้"
            orderLabel="สั่งซื้องานนี้"
            onToggleFavorite={() => toggleFavorite(item)}
            onOrder={() => orderGalleryItem(item)}
          />
        )) : <div className="md:col-span-2 lg:col-span-4"><EmptyState title="ยังไม่มีผลงาน" message="เมื่อเพิ่มผลงานในหน้าผู้ดูแลร้านแล้ว จะแสดงในส่วนนี้" /></div>}
      </div>
    </section>
  );
}
