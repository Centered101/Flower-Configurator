"use client";

import { getCapacity } from "@/lib/capacity";
import { formatThaiShortDate } from "@/lib/date-format";

export function CapacityCalendar({
  selected,
  requiredScore,
  fullDateNote,
  onSelect
}: {
  selected: string;
  requiredScore: number;
  fullDateNote?: string;
  onSelect: (date: string) => void;
}) {
  const today = new Date();
  const days = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index + 1);
    return getCapacity(date);
  });

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {days.map((day) => {
        const disabled = day.isBlocked || day.availableScore < requiredScore;
        return (
          <button
            key={day.date}
            type="button"
            disabled={disabled}
            title={disabled ? fullDateNote ?? "คิวเต็ม" : `เหลือ ${day.availableScore} คะแนน`}
            onClick={() => onSelect(day.date)}
            className={`touch-target rounded-soft border p-3 text-left disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400 ${selected === day.date ? "border-blossom bg-blush" : "border-pink-100 bg-white"}`}
          >
            <span className="block text-sm font-bold">{formatThaiShortDate(day.date)}</span>
            <span className="mt-1 block text-xs">{disabled ? "คิวเต็ม" : `เหลือ ${day.availableScore} คะแนน`}</span>
          </button>
        );
      })}
    </div>
  );
}
