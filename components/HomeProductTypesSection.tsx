"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { OrderableItemCard } from "@/components/OrderableItemCard";
import { ADMIN_PRODUCTS_KEY, fetchPublicProducts, readAdminItems, saveAdminItems, type AdminProduct } from "@/lib/admin-data";
import { getFavoriteProductIds, listenForFavoriteUpdates, toggleFavoriteProduct } from "@/lib/favorites";
import { saveQuickOrder } from "@/lib/quick-order";

type HomeProductCard = {
  id: string;
  name: string;
  description: string;
  price: number;
  productionScore: number;
  image?: AdminProduct["image"];
};

export function HomeProductTypesSection() {
  const router = useRouter();
  const [adminProducts, setAdminProducts] = useState<AdminProduct[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  useEffect(() => {
    const localProducts = readAdminItems<AdminProduct>(ADMIN_PRODUCTS_KEY);
    setAdminProducts(localProducts);
    fetchPublicProducts()
      .then((products) => {
        setAdminProducts(products);
        saveAdminItems(ADMIN_PRODUCTS_KEY, products);
      })
      .catch(() => setAdminProducts(localProducts));
    setFavoriteIds(getFavoriteProductIds());
  }, []);

  useEffect(() => {
    return listenForFavoriteUpdates(() => setFavoriteIds(getFavoriteProductIds()));
  }, []);

  const products = useMemo<HomeProductCard[]>(() => {
    return adminProducts.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.basePrice,
      productionScore: Math.max(1, Number(item.productionScore || 1)),
      image: item.image
    }));
  }, [adminProducts]);

  function orderProduct(item: HomeProductCard) {
    saveQuickOrder({
      sourceType: "product",
      id: item.id,
      title: item.name,
      description: item.description,
      price: item.price,
      productionScore: item.productionScore,
      imageUrl: item.image?.url,
      details: [item.description]
    });
    router.push(`/checkout?quickOrder=1&source=product&id=${encodeURIComponent(item.id)}`);
  }

  function toggleFavorite(item: HomeProductCard) {
    const next = toggleFavoriteProduct(item.id);
    setFavoriteIds(next);
    toast.success(next.includes(item.id) ? "เพิ่มสินค้าในรายการถูกใจแล้ว" : "นำสินค้าออกจากรายการถูกใจแล้ว");
  }

  return (
    <section className="container-page py-8" data-aos="fade-up">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-ink">สินค้ายอดนิยม</h2>
        <Link href="/design" className="font-semibold text-blossom">ออกแบบเลย</Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {products.length ? products.map((item) => (
          <OrderableItemCard
            key={item.id}
            title={item.name}
            details={item.description}
            priceText={`เริ่มต้น ${item.price.toLocaleString("th-TH")} บาท`}
            productionScore={item.productionScore}
            image={item.image}
            isFavorite={favoriteIds.includes(item.id)}
            favoriteLabel="ถูกใจสินค้านี้"
            unfavoriteLabel="ยกเลิกถูกใจสินค้านี้"
            orderLabel="สั่งซื้อแบบนี้"
            onToggleFavorite={() => toggleFavorite(item)}
            onOrder={() => orderProduct(item)}
          />
        )) : (
          <div className="rounded-bloom border border-pink-100 bg-white p-5 text-sm text-zinc-600 shadow-sm md:col-span-2 lg:col-span-4">
            <p className="font-semibold text-ink">ยังไม่มีรายการแนะนำในตอนนี้</p>
            <p className="mt-1">คุณยังสามารถออกแบบดอกไม้ลวดกำมะหยี่แบบของคุณเองได้เลย</p>
            <Link href="/design" className="mt-4 inline-flex rounded-soft bg-blossom px-4 py-2 font-bold text-white shadow-soft">
              เริ่มออกแบบ
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
