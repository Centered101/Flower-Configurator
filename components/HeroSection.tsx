import Link from "next/link";
import { ArrowRight, CalendarCheck, Paintbrush, PackageCheck, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { HeroPreviewStatic } from "@/components/HeroPreviewStatic";

const orderSteps: [LucideIcon, string][] = [
  [Paintbrush, "เลือกรูปแบบ"],
  [Sparkles, "ออกแบบดอกไม้"],
  [CalendarCheck, "เลือกวันรับ"],
  [PackageCheck, "รอรับผลงาน"]
];

export function HeroSection() {
  return (
    <section className="container-page grid min-h-[calc(100vh-4rem)] items-center gap-8 py-10 lg:grid-cols-[0.95fr_1.05fr]">
      <div className="space-y-6" data-aos="fade-right">
        <p className="inline-flex rounded-full bg-blush px-4 py-2 text-sm font-semibold text-blossom">ดอกไม้ลวดกำมะหยี่สั่งทำพิเศษ</p>
        <div className="space-y-4">
          <h1 className="max-w-2xl text-4xl font-bold leading-tight text-ink md:text-6xl">ออกแบบดอกไม้ในแบบของคุณ</h1>
          <p className="max-w-xl text-lg leading-8 text-zinc-700">เลือกดอกไม้ สี ก้าน และการจัดช่อได้เอง แล้วให้เราทำตามแบบของคุณ</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/design" className="touch-target inline-flex items-center justify-center gap-2 rounded-soft bg-blossom px-5 py-3 font-semibold text-white shadow-soft">
            เริ่มออกแบบ
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
          <Link href="/gallery" className="touch-target inline-flex items-center justify-center rounded-soft border border-pink-200 bg-white px-5 py-3 font-semibold text-ink">
            ดูผลงานที่ผ่านมา
          </Link>
        </div>
        <div className="grid gap-3 pt-2 sm:grid-cols-2">
          {orderSteps.map(([Icon, label], index) => (
            <div key={String(label)} className="flex items-center gap-3 rounded-soft bg-white p-3 shadow-sm">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-blush text-blossom">
                <Icon size={18} />
              </span>
              <span className="text-sm font-semibold text-ink">{index + 1}. {String(label)}</span>
            </div>
          ))}
        </div>
      </div>
      <HeroPreviewStatic />
    </section>
  );
}
