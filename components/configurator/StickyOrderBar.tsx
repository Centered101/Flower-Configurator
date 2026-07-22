"use client";

import type { ReactNode } from "react";
import { useConfigurator } from "./ConfiguratorProvider";

export function StickyOrderBar({ children }: { children: ReactNode }) {
  const { config } = useConfigurator();
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-pink-100 bg-white p-3 shadow-[0_-12px_30px_rgba(0,0,0,0.08)] md:hidden">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-zinc-500">ยอดรวม</p>
          <p className="text-xl font-bold text-blossom">{config.totalPrice} บาท</p>
        </div>
        <div className="flex gap-2">{children}</div>
      </div>
    </div>
  );
}
