"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { EmptyState } from "@/components/EmptyState";
import { OrderableItemCard } from "@/components/OrderableItemCard";
import { ADMIN_GALLERY_KEY, fetchPublicGalleryItems, readAdminItems, saveAdminItems, type AdminGalleryItem } from "@/lib/admin-data";
import { getFavoriteGalleryIds, listenForFavoriteUpdates, toggleFavoriteGalleryItem } from "@/lib/favorites";
import { saveQuickOrder } from "@/lib/quick-order";

function GalleryContent() {
  const router = useRouter();
  const [galleryItems, setGalleryItems] = useState<AdminGalleryItem[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [filter, setFilter] = useState("ทั้งหมด");
  const filterOptions = useMemo(() => {
    const values = galleryItems.flatMap((item) => [item.flower, item.color, item.size]).filter(Boolean);
    return ["ทั้งหมด", ...Array.from(new Set(values))];
  }, [galleryItems]);
  const visible = filter === "ทั้งหมด" ? galleryItems : galleryItems.filter((item) => item.flower === filter || item.color === filter || item.size === filter);

  useEffect(() => {
    const localItems = readAdminItems<AdminGalleryItem>(ADMIN_GALLERY_KEY);
    setGalleryItems(localItems);
    fetchPublicGalleryItems()
      .then((items) => {
        setGalleryItems(items);
        saveAdminItems(ADMIN_GALLERY_KEY, items);
      })
      .catch(() => setGalleryItems(localItems));
    setFavoriteIds(getFavoriteGalleryIds());
  }, []);

  useEffect(() => {
    return listenForFavoriteUpdates(() => setFavoriteIds(getFavoriteGalleryIds()));
  }, []);

  function handleToggleFavorite(item: AdminGalleryItem) {
    const next = toggleFavoriteGalleryItem(item.id);
    setFavoriteIds(next);
    toast.success(next.includes(item.id) ? "เพิ่มผลงานที่ถูกใจแล้ว" : "นำออกจากรายการถูกใจแล้ว");
  }

  function handleOrder(item: AdminGalleryItem) {
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
    <>
      <Navbar />
      <main className="container-page min-h-screen py-8">
        <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold text-blossom">แกลเลอรี</p>
            <h1 className="text-3xl font-bold text-ink">ผลงานที่ผ่านมา</h1>
          </div>
          {galleryItems.length ? (
            <select value={filter} onChange={(event) => setFilter(event.target.value)} className="touch-target rounded-soft border border-pink-100 bg-white px-3">
              {filterOptions.map((item) => <option key={item}>{item}</option>)}
            </select>
          ) : null}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {visible.length ? visible.map((item) => (
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
              onToggleFavorite={() => handleToggleFavorite(item)}
              onOrder={() => handleOrder(item)}
            />
          )) : <div className="md:col-span-2 lg:col-span-4"><EmptyState title="ยังไม่มีผลงาน" message="เมื่อเพิ่มผลงานในหน้าผู้ดูแลร้านแล้ว จะแสดงในหน้านี้" /></div>}
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function GalleryPage() {
  return <GalleryContent />;
}
