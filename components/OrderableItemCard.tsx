"use client";

import Image from "next/image";
import { Heart, ShoppingBag } from "lucide-react";
import { HelpTooltip } from "@/components/HelpTooltip";

type CardImage = {
  url: string;
};

type OrderableItemCardProps = {
  title: string;
  details: string;
  priceText: string;
  productionScore: number;
  image?: CardImage;
  isFavorite: boolean;
  favoriteLabel: string;
  unfavoriteLabel: string;
  orderLabel: string;
  onToggleFavorite: () => void;
  onOrder: () => void;
};

export function OrderableItemCard({
  title,
  details,
  priceText,
  productionScore,
  image,
  isFavorite,
  favoriteLabel,
  unfavoriteLabel,
  orderLabel,
  onToggleFavorite,
  onOrder
}: OrderableItemCardProps) {
  return (
    <article className="flex h-full flex-col rounded-bloom border border-pink-100 bg-white p-4 shadow-sm">
      {image ? (
        <div className="relative h-52 overflow-hidden rounded-soft bg-blush">
          <Image
            src={image.url}
            alt={title}
            fill
            sizes="(min-width: 1024px) 22vw, (min-width: 768px) 45vw, 100vw"
            draggable={false}
            onContextMenu={(event) => event.preventDefault()}
            className="select-none object-cover"
          />
        </div>
      ) : (
        <div className="h-52 rounded-soft bg-gradient-to-br from-blush via-white to-pink-100" />
      )}
      <h2 className="mt-4 font-bold text-ink">{title}</h2>
      <p className="mt-1 text-sm text-zinc-600">{details}</p>
      <p className="mt-2 font-bold text-blossom">{priceText}</p>
      <p className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-zinc-600">
        คะแนนการผลิต {Math.max(1, Number(productionScore || 1)).toLocaleString("th-TH")} คะแนน
        <HelpTooltip content="คะแนนนี้ใช้ประเมินคิวและวันรับสินค้า ยิ่งคะแนนสูงยิ่งใช้เวลาผลิตมากขึ้น" />
      </p>
      <div className="mt-4 grid grid-cols-[4fr_1fr] gap-2">
        <button
          type="button"
          suppressHydrationWarning
          onClick={onOrder}
          className="touch-target inline-flex min-w-0 items-center justify-center gap-2 rounded-soft bg-ink px-4 py-2 font-bold text-white shadow-[0_12px_26px_rgba(43,43,43,0.24)] transition hover:-translate-y-0.5 hover:bg-blossom hover:shadow-[0_14px_30px_rgba(244,139,176,0.36)] active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blossom"
        >
          <ShoppingBag size={17} aria-hidden="true" />
          <span className="truncate">{orderLabel}</span>
        </button>
        <button
          type="button"
          suppressHydrationWarning
          onClick={onToggleFavorite}
          className={`touch-target inline-flex items-center justify-center rounded-soft border-2 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blossom ${
            isFavorite
              ? "border-blossom bg-blossom text-white shadow-[0_10px_24px_rgba(244,139,176,0.34)] hover:bg-blossom hover:text-white"
              : "border-pink-200 bg-blush text-ink hover:border-blossom hover:bg-white hover:text-blossom"
          }`}
          aria-label={isFavorite ? unfavoriteLabel : favoriteLabel}
        >
          <Heart size={18} fill={isFavorite ? "currentColor" : "none"} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}
