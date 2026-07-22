"use client";

import { CheckCircle2 } from "lucide-react";

export function OptionCard({
  selected,
  title,
  subtitle,
  meta,
  price,
  tone = "#FCE4EC",
  disabled = false,
  onClick
}: {
  selected: boolean;
  title: string;
  subtitle: string;
  meta?: string;
  price: number;
  tone?: string;
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
      <span className="mb-4 block h-16 rounded-soft" style={{ background: `linear-gradient(135deg, ${tone}, #ffffff)` }} />
      {selected ? <CheckCircle2 className="absolute right-4 top-4 text-stem" size={22} /> : null}
      <span className="block font-bold text-ink">{title}</span>
      <span className="mt-1 block text-sm leading-6 text-zinc-600">{subtitle}</span>
      <span className="mt-3 flex items-center justify-between gap-3 text-sm">
        <span className="text-zinc-500">{meta}</span>
        <span className="font-bold text-blossom">{price ? `+${price} บาท` : "รวมแล้ว"}</span>
      </span>
    </button>
  );
}
