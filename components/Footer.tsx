import Link from "next/link";
import { ExternalLink, ReceiptText, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { BRAND_NAME } from "@/lib/brand";

const mainLinks = [
  { href: "/", label: "หน้าแรก" },
  { href: "/design", label: "ออกแบบดอกไม้" },
  { href: "/gallery", label: "ผลงาน" },
  { href: "/track", label: "ติดตามคำสั่งซื้อ" },
  { href: "/login", label: "บัญชีลูกค้า" }
];

const legalLinks = [
  { href: "/privacy-policy", label: "นโยบายความเป็นส่วนตัว" },
  { href: "/terms-of-service", label: "ข้อกำหนดการใช้บริการ" },
  { href: "/data-deletion", label: "คำขอลบข้อมูล" }
];

const serviceNotes = [
  { icon: ReceiptText, label: "รับมัดจำ 50%" },
  { icon: ShieldCheck, label: "ยืนยันราคาก่อนผลิต" },
  { icon: Truck, label: "เลือกวันรับสินค้าได้" }
];

export function Footer() {
  return (
    <footer className="mt-14 border-t border-pink-100 bg-white">
      <div className="container-page py-7">
        <div className="grid gap-7 md:grid-cols-[minmax(0,1.35fr)_minmax(150px,0.55fr)_minmax(220px,0.75fr)] md:items-start">
          <section>
            <div className="flex items-center gap-3">
              <BrandLogo size={42} />
              <div className="min-w-0">
                <p className="text-lg font-bold text-ink">{BRAND_NAME}</p>
                <p className="text-sm font-semibold text-blossom">ดอกไม้ลวดกำมะหยี่ทำมือ</p>
              </div>
            </div>
            <p className="mt-3 max-w-lg text-sm leading-6 text-zinc-600">
              ระบบพรีออเดอร์ดอกไม้ลวดกำมะหยี่แบบทำมือ ตั้งแต่ออกแบบ เลือกวันรับสินค้า ไปจนถึงติดตามคำสั่งซื้อ
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {serviceNotes.map(({ icon: Icon, label }) => (
                <div key={label} className="inline-flex items-center gap-2 rounded-full border border-pink-100 bg-blush px-3 py-2 text-xs font-bold text-ink">
                  <Icon size={15} className="shrink-0 text-blossom" aria-hidden="true" />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </section>

          <nav aria-label="เมนูท้ายเว็บ">
            <h2 className="text-sm font-bold text-blossom">เมนู</h2>
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm md:grid-cols-1">
              {mainLinks.map((link) => (
                <Link key={link.href} href={link.href} className="inline-flex w-fit font-semibold text-zinc-600 transition hover:text-ink">
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>

          <nav aria-label="เอกสารและนโยบาย">
            <h2 className="text-sm font-bold text-blossom">เอกสาร</h2>
            <div className="mt-3 grid gap-2 text-sm">
              {legalLinks.map((link) => (
                <Link key={link.href} href={link.href} className="inline-flex w-fit font-semibold text-zinc-600 transition hover:text-ink">
                  {link.label}
                </Link>
              ))}
            </div>
            <Link
              href="/design"
              className="mt-4 inline-flex touch-target items-center justify-center gap-2 rounded-soft bg-ink px-4 py-2 text-sm font-bold text-white shadow-[0_12px_26px_rgba(43,43,43,0.18)] transition hover:-translate-y-0.5 hover:bg-blossom focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blossom"
            >
              <Sparkles size={16} aria-hidden="true" />
              เริ่มออกแบบ
            </Link>
          </nav>
        </div>
      </div>

      <div className="border-t border-pink-100 bg-blush/35">
        <div className="container-page flex flex-col gap-2 py-3 text-xs text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 {BRAND_NAME}. สงวนลิขสิทธิ์.</p>
          <a
            href="https://centered101.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-fit items-center gap-1 font-bold text-blossom transition hover:text-ink"
          >
            Powered by centered101
            <ExternalLink size={13} aria-hidden="true" />
          </a>
        </div>
      </div>
    </footer>
  );
}
