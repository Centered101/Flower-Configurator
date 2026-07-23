"use client";

import { CheckCircle2 } from "lucide-react";

export function OptionCard({
  selected,
  title,
  subtitle,
  meta,
  price,
  disabled = false,
  onClick
}: {
  selected: boolean;
  title: string;
  subtitle: string;
  meta?: string;
  price: number;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`relative min-h-[156px] rounded-bloom border bg-white p-4 text-left shadow-sm transition disabled:cursor-not-allowed disabled:opacity-55 ${selected ? "border-blossom ring-2 ring-blossom/30" : "border-pink-100 hover:border-blossom/60"}`}
    >
      {selected ? <CheckCircle2 className="absolute right-4 top-4 text-stem" size={22} /> : null}
      <span className="block font-bold text-ink">{title}</span>
      <span className="mt-1 block text-sm leading-6 text-zinc-600">{subtitle}</span>
      {meta ? <span className="mt-3 block text-sm leading-5 text-zinc-500">{meta}</span> : null}
      <span className="mt-2 block text-sm font-bold text-blossom">{price ? `+${price} บาท` : "รวมแล้ว"}</span>
    </button>
  );
}
