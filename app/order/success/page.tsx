"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Copy, FileDown, Search } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ProductPreview } from "@/components/configurator/ProductPreview";
import { DepositPaymentCard } from "@/components/DepositPaymentCard";
import { LAST_ORDER_KEY } from "@/lib/configurator";
import { formatThaiIsoDate } from "@/lib/date-format";
import { findOrder, updateStoredOrder } from "@/lib/orders";
import type { CustomerOrder, OrderSourceItem } from "@/lib/types";

export default function SuccessPage() {
  const [order, setOrder] = useState<CustomerOrder | null>(null);

  useEffect(() => {
    const number = window.localStorage.getItem(LAST_ORDER_KEY) ?? "";
    const storedOrder = findOrder(number) ?? null;
    setOrder(storedOrder);

    if (!number) return;

    let cancelled = false;
    fetch("/api/profile/orders", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        return await response.json() as CustomerOrder[];
      })
      .then((orders) => {
        if (cancelled || !orders) return;
        const freshOrder = orders.find((item) => item.orderNumber === number);
        if (!freshOrder) return;
        setOrder(freshOrder);
        updateStoredOrder(number, freshOrder);
      })
      .catch(() => {
        // ใช้ข้อมูลในเครื่องต่อได้ ถ้า session หมดอายุหรือยังไม่ได้เข้าสู่ระบบ
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <Navbar />
      <main className="container-page min-h-screen py-4 sm:py-8">
        {order ? (
          <div className="mx-auto max-w-6xl space-y-4 sm:space-y-5">
            <section className="rounded-bloom border border-pink-100 bg-white p-4 shadow-soft sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-green-50 text-stem sm:size-11">
                    <CheckCircle2 size={24} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-blossom">คำสั่งซื้อพร้อมออเดอร์แล้ว</p>
                    <h1 className="mt-1 text-[1.35rem] font-bold leading-tight text-ink sm:text-3xl">ส่งคำสั่งพรีออเดอร์แล้ว</h1>
                    <p className="mt-2 max-w-full overflow-hidden rounded-soft bg-blush px-3 py-3 text-base font-bold leading-snug text-ink min-[380px]:text-lg sm:px-4 sm:text-xl">
                      {order.orderNumber}
                    </p>
                  </div>
                </div>
                <span className="w-fit rounded-full bg-yellow-50 px-4 py-2 text-sm font-bold text-yellow-700">
                  รอตรวจสอบคำสั่งซื้อ
                </span>
              </div>
            </section>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
              <div className="order-2 space-y-4 sm:space-y-5 lg:order-1">
                <OrderSummary order={order} />
                <DepositPaymentCard order={order} onOrderUpdated={setOrder} />
              </div>

              <aside className="order-1 lg:sticky lg:top-24 lg:order-2 lg:self-start">
                {order.sourceItem ? <SourceItemPreview item={order.sourceItem} /> : <ProductPreview compact config={order.config} />}
              </aside>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl rounded-bloom border border-pink-100 bg-white p-6 text-center shadow-soft">
            <p className="text-lg font-bold text-ink">ยังไม่พบคำสั่งซื้อในเครื่องนี้</p>
            <Link href="/track" className="mt-4 inline-flex touch-target items-center justify-center rounded-soft bg-blossom px-5 py-2 font-bold text-white">
              ไปหน้าติดตามคำสั่งซื้อ
            </Link>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

function OrderSummary({ order }: { order: CustomerOrder }) {
  const fulfillmentLabel = order.estimatedDeliveryDate || order.pickupMethod.includes("จัดส่ง")
    ? "วันจัดส่งโดยประมาณ"
    : "วันรับสินค้า";
  const fulfillmentValue = order.estimatedDeliveryDate || order.pickupMethod.includes("จัดส่ง")
    ? formatThaiIsoDate(order.estimatedDeliveryDate ?? order.pickupDate)
    : `${formatThaiIsoDate(order.pickupDate)} ${order.pickupTime}`;

  async function copyOrderNumber() {
    try {
      await navigator.clipboard.writeText(order.orderNumber);
    } catch {
      window.prompt("คัดลอกเลขคำสั่งซื้อ", order.orderNumber);
    }
  }

  return (
    <section className="rounded-bloom border border-pink-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 border-b border-pink-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-blossom">สรุปคำสั่งซื้อ</p>
          <h2 className="mt-1 text-xl font-bold text-ink">ตรวจข้อมูลสำคัญ</h2>
        </div>
        <div className="grid grid-cols-2 gap-2 text-right">
          <div className="rounded-soft bg-blush px-3 py-3 sm:px-4">
            <p className="text-xs text-zinc-500">ยอดรวม</p>
            <p className="text-lg font-bold text-ink">{order.total.toLocaleString("th-TH")} บาท</p>
          </div>
          <div className="rounded-soft bg-blush px-3 py-3 sm:px-4">
            <p className="text-xs text-zinc-500">มัดจำ 50%</p>
            <p className="text-lg font-bold text-blossom">{order.depositAmount.toLocaleString("th-TH")} บาท</p>
          </div>
        </div>
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <Info label={fulfillmentLabel} value={fulfillmentValue} />
        <Info label="วิธีรับสินค้า" value={order.pickupMethod} />
        <Info label="สถานที่รับ/จัดส่ง" value={order.pickupLocation} />
        <Info label="สถานะ" value="รอตรวจสอบคำสั่งซื้อ" />
      </dl>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <button type="button" onClick={() => void copyOrderNumber()} className="touch-target inline-flex items-center justify-center gap-2 rounded-soft bg-blossom px-4 py-2 font-semibold text-white transition hover:bg-ink"><Copy size={18} />คัดลอกเลข</button>
        <Link href={`/track?order=${encodeURIComponent(order.orderNumber)}&phone=${encodeURIComponent(order.phone.replace(/\D/g, "").slice(-4))}`} className="touch-target inline-flex items-center justify-center gap-2 rounded-soft border border-pink-200 bg-white px-4 py-2 font-semibold transition hover:border-blossom hover:bg-blush"><Search size={18} />ติดตามสถานะ</Link>
        <button type="button" onClick={() => window.print()} className="touch-target inline-flex items-center justify-center gap-2 rounded-soft border border-pink-200 bg-white px-4 py-2 font-semibold transition hover:border-blossom hover:bg-blush"><FileDown size={18} />พิมพ์สรุป</button>
      </div>
    </section>
  );
}

function SourceItemPreview({ item }: { item: OrderSourceItem }) {
  return (
    <aside className="rounded-bloom border border-pink-100 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-bold text-ink">แบบที่สั่งซื้อ</h2>
      {item.imageUrl ? (
        <div className="mt-4 aspect-[4/3] overflow-hidden rounded-soft border border-pink-100 bg-blush">
          <img
            src={item.imageUrl}
            alt={item.title}
            draggable={false}
            onContextMenu={(event) => event.preventDefault()}
            className="h-full w-full select-none object-cover"
          />
        </div>
      ) : null}
      <h3 className="mt-4 font-bold text-ink">{item.title}</h3>
      {item.description ? <p className="mt-1 text-sm text-zinc-600">{item.description}</p> : null}
      <div className="mt-3 grid gap-2 rounded-soft bg-blush/60 p-3 text-sm">
        <p className="font-semibold text-zinc-600">คะแนนการผลิต {item.productionScore.toLocaleString("th-TH")} คะแนน</p>
        <p className="text-xl font-bold text-blossom">{item.price.toLocaleString("th-TH")} บาท</p>
      </div>
    </aside>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-soft border border-pink-100 bg-white p-3 sm:p-4"><dt className="text-sm text-zinc-500">{label}</dt><dd className="mt-1 break-words font-bold text-ink">{value}</dd></div>;
}
