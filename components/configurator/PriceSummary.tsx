"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { priceBreakdown } from "@/lib/configurator";
import { getConfigMaterialSummary } from "@/lib/material-availability";
import { useConfigurator } from "./ConfiguratorProvider";

export function PriceSummary({ canCheckout = false }: { canCheckout?: boolean }) {
  const { config, catalog } = useConfigurator();
  const rows = priceBreakdown(config, catalog).filter((row) => row.value || !row.label.startsWith("ยัง"));
  const materialRows = getConfigMaterialSummary(config, catalog);

  return (
    <aside className="rounded-bloom border border-pink-100 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-bold text-ink">สรุปราคา</h2>
      <div className="mt-4 space-y-3 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start justify-between gap-4">
            <span className="text-zinc-600">{row.label}</span>
            <span className="font-semibold text-ink">{row.value} บาท</span>
          </div>
        ))}
      </div>
      <div className="mt-4 border-t border-pink-100 pt-4">
        <div className="flex items-center justify-between">
          <span className="font-bold text-ink">ยอดรวม</span>
          <span className="text-2xl font-bold text-blossom">{config.totalPrice} บาท</span>
        </div>
        <p className="mt-2 text-xs leading-5 text-zinc-500">{catalog.reviewNote}</p>
      </div>
      {materialRows.length ? (
        <div className="mt-4 rounded-soft bg-blush p-3">
          <h3 className="text-sm font-bold text-ink">วัสดุที่ใช้</h3>
          <div className="mt-2 space-y-2 text-xs">
            {materialRows.map((row) => (
              <div key={row.material.id} className="flex items-start justify-between gap-3">
                <span className="text-zinc-600">{row.material.name}</span>
                <span className={`font-bold ${row.available ? "text-stem" : "text-red-600"}`}>
                  {row.required.toLocaleString("th-TH")} {row.material.unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {canCheckout ? (
        <Link href="/checkout" className="touch-target mt-4 inline-flex w-full items-center justify-center gap-2 rounded-soft bg-blossom px-4 py-3 font-semibold text-white">
          ไปยืนยันคำสั่งซื้อ
          <ArrowRight size={18} />
        </Link>
      ) : null}
    </aside>
  );
}
