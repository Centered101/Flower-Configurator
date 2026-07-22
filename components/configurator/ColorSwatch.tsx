"use client";

import { Check } from "lucide-react";
import type { FlowerColor } from "@/lib/types";

export function ColorSwatch({ color, selected, onSelect }: { color: FlowerColor; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      disabled={!color.inStock}
      onClick={onSelect}
      className="touch-target flex items-center gap-3 rounded-soft border border-pink-100 bg-white p-2 text-left disabled:cursor-not-allowed disabled:opacity-45"
      aria-pressed={selected}
    >
      <span className="grid size-9 place-items-center rounded-full border border-zinc-200" style={{ background: color.hex }}>
        {selected ? <Check size={17} className={color.id === "white" ? "text-ink" : "text-white"} /> : null}
      </span>
      <span>
        <span className="block text-sm font-semibold text-ink">{color.name}</span>
        <span className="block text-xs text-zinc-500">{color.price ? `+${color.price} บาท` : "รวมในราคา"}</span>
      </span>
    </button>
  );
}
