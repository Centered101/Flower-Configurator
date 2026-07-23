"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, PackageCheck, Search } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ProductPreview } from "@/components/configurator/ProductPreview";
import { EmptyState } from "@/components/EmptyState";
import { HelpTooltip } from "@/components/HelpTooltip";
import { StatusTimeline } from "@/components/StatusTimeline";
import { formatThaiIsoDate } from "@/lib/date-format";
import { findOrder, getStoredOrders, listenForOrderUpdates, sortOrdersByOrderNumber } from "@/lib/orders";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { CustomerOrder, OrderStatus } from "@/lib/types";

const orderStatusLabels: Record<OrderStatus, string> = {
  pending_review: "รอตรวจสอบ",
  design_confirmed: "ยืนยันแบบแล้ว",
  awaiting_payment: "รอชำระเงิน",
  preparing_materials: "เตรียมวัสดุ",
  in_production: "กำลังผลิต",
  quality_check: "ตรวจคุณภาพ",
  ready: "พร้อมรับสินค้า",
  completed: "สำเร็จ",
  cancelled: "ยกเลิก"
};

const paymentStatusLabels: Record<CustomerOrder["paymentStatus"], string> = {
  pending: "รอตรวจสอบ",
  deposit_due: "รอมัดจำ",
  awaiting_slip_review: "รอตรวจสลิป",
  paid: "ชำระแล้ว",
  failed: "ไม่สำเร็จ",
  refunded: "คืนเงินแล้ว"
};

function getPhoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

function getOrderSerial(value: string) {
  return value.replace(/\D/g, "").slice(0, 3);
}

function getOrderDateNumber(value: string) {
  return value.replaceAll("-", "");
}

function normalizeOrderNumberInput(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 28);
}

function getInputDateFromOrderNumber(value: string) {
  const match = /^FLOWER-(\d{8})(?:-(\d{1,3}))?$/i.exec(value.trim());
  if (!match) return { date: "", serial: "" };

  return {
    date: `${match[1].slice(0, 4)}-${match[1].slice(4, 6)}-${match[1].slice(6, 8)}`,
    serial: match[2] ?? ""
  };
}

function buildOrderSearchNumber(date: string, serial: string) {
  const dateNumber = date ? getOrderDateNumber(date) : "";
  if (dateNumber && serial) return `FLOWER-${dateNumber}-${serial}`;
  if (dateNumber) return `FLOWER-${dateNumber}`;
  return serial;
}

function isDeliveryOrder(order: CustomerOrder) {
  return Boolean(order.estimatedDeliveryDate || order.pickupMethod.includes("จัดส่ง"));
}

function fulfillmentText(order: CustomerOrder) {
  if (isDeliveryOrder(order)) {
    return `จัดส่งประมาณ ${formatThaiIsoDate(order.estimatedDeliveryDate ?? order.pickupDate)}`;
  }

  return `${formatThaiIsoDate(order.pickupDate)} ${order.pickupTime}`;
}

function mergeOrders(left: CustomerOrder[], right: CustomerOrder[]) {
  const map = new Map<string, CustomerOrder>();
  for (const order of [...left, ...right]) {
    map.set(order.orderNumber || order.id, order);
  }
  return sortOrdersByOrderNumber(Array.from(map.values()));
}

export default function TrackPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [orderDate, setOrderDate] = useState("");
  const [orderSerial, setOrderSerial] = useState("");
  const [lastFour, setLastFour] = useState("");
  const [order, setOrder] = useState<CustomerOrder | null | undefined>(undefined);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [searchResults, setSearchResults] = useState<CustomerOrder[]>([]);
  const [customerKey, setCustomerKey] = useState<{ userId?: string; email?: string; phone?: string }>({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextOrderNumber = params.get("order") ?? "";
    const nextLastFour = params.get("phone") ?? "";

    if (!nextOrderNumber) return;

    const parsedOrderNumber = getInputDateFromOrderNumber(nextOrderNumber);
    setOrderNumber(nextOrderNumber);
    setOrderDate(parsedOrderNumber.date);
    setOrderSerial(parsedOrderNumber.serial);
    setLastFour(nextLastFour);
    setOrder(findOrder(nextOrderNumber, nextLastFour) ?? null);
  }, []);

  useEffect(() => {
    function syncOrders() {
      setOrders((current) => mergeOrders(getStoredOrders(), current));
    }

    syncOrders();
    return listenForOrderUpdates(syncOrders);
  }, []);

  useEffect(() => {
    let isMounted = true;

    try {
      const supabase = createSupabaseBrowserClient();

      supabase.auth.getUser()
        .then(({ data }) => {
          if (!isMounted || !data.user) return;

          setCustomerKey({
            userId: data.user.id,
            email: data.user.email?.toLowerCase(),
            phone: typeof data.user.user_metadata?.phone === "string" ? data.user.user_metadata.phone : undefined
          });
          fetch("/api/profile/orders", { cache: "no-store" })
            .then((response) => response.ok ? response.json() : [])
            .then((remoteOrders: CustomerOrder[]) => {
              if (!isMounted) return;
              setOrders((current) => mergeOrders(current, remoteOrders));
            })
            .catch(() => undefined);
        })
        .catch(() => {
          if (isMounted) setCustomerKey({});
        });
    } catch {
      setCustomerKey({});
    }

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!orderNumber.trim()) return;
    const normalizedOrder = orderNumber.trim().toLowerCase();
    const normalizedPhone = getPhoneDigits(lastFour).slice(-4);
    const matchedOrder = orders.find((item) => {
      const orderMatches = item.orderNumber.toLowerCase() === normalizedOrder;
      const phoneMatches = normalizedPhone ? getPhoneDigits(item.phone).endsWith(normalizedPhone) : true;
      return orderMatches && phoneMatches;
    });

    if (matchedOrder && matchedOrder !== order) setOrder(matchedOrder);
    if (!matchedOrder && order === undefined) setOrder(null);
  }, [lastFour, order, orderNumber, orders]);

  const quickOrders = useMemo(() => {
    const customerPhoneDigits = customerKey.phone ? getPhoneDigits(customerKey.phone) : "";
    const matchedOrders = orders.filter((item) => {
      if (customerKey.userId && item.authUserId === customerKey.userId) return true;
      if (customerKey.email && item.email?.toLowerCase() === customerKey.email) return true;
      if (customerPhoneDigits && getPhoneDigits(item.phone) === customerPhoneDigits) return true;
      return false;
    });

    return (matchedOrders.length ? matchedOrders : orders).slice(0, 8);
  }, [customerKey, orders]);

  function selectOrder(nextOrder: CustomerOrder) {
    const phoneSuffix = getPhoneDigits(nextOrder.phone).slice(-4);
    const parsedOrderNumber = getInputDateFromOrderNumber(nextOrder.orderNumber);

    setOrderNumber(nextOrder.orderNumber);
    setOrderDate(parsedOrderNumber.date);
    setOrderSerial(parsedOrderNumber.serial);
    setLastFour(phoneSuffix);
    setOrder(nextOrder);
    setSearchResults([]);
    window.history.replaceState(null, "", `/track?order=${encodeURIComponent(nextOrder.orderNumber)}${phoneSuffix ? `&phone=${encodeURIComponent(phoneSuffix)}` : ""}`);
  }

  function handleSearch() {
    const directOrderNumber = orderNumber.trim();
    const filterOrderNumber = buildOrderSearchNumber(orderDate, orderSerial);
    const normalizedDirectOrderNumber = directOrderNumber.toLowerCase();
    const normalizedFilterOrderNumber = filterOrderNumber.trim().toLowerCase();
    const normalizedPhone = getPhoneDigits(lastFour).slice(-4);

    if (!normalizedDirectOrderNumber && !normalizedFilterOrderNumber && !normalizedPhone) {
      setOrder(null);
      setSearchResults([]);
      return;
    }

    function matchesSearch(item: CustomerOrder) {
      const orderNumberText = item.orderNumber.toLowerCase();
      const directMatches = normalizedDirectOrderNumber ? orderNumberText.includes(normalizedDirectOrderNumber) : true;
      const filterMatches = normalizedFilterOrderNumber ? orderNumberText.includes(normalizedFilterOrderNumber) : true;
      const phoneMatches = normalizedPhone ? getPhoneDigits(item.phone).endsWith(normalizedPhone) : true;
      return directMatches && filterMatches && phoneMatches;
    }

    const exactSearchOrderNumber = directOrderNumber || filterOrderNumber;
    const exactOrder = exactSearchOrderNumber ? findOrder(exactSearchOrderNumber, normalizedPhone) : undefined;
    if (exactOrder) {
      if (matchesSearch(exactOrder)) selectOrder(exactOrder);
      return;
    }

    const results = orders.filter(matchesSearch).slice(0, 10);

    if (results.length === 1) {
      selectOrder(results[0]);
      return;
    }

    setOrder(results.length ? undefined : null);
    setSearchResults(results);
  }

  const filterPreview = buildOrderSearchNumber(orderDate, orderSerial);
  const orderPreview = orderNumber.trim() || filterPreview;

  return (
    <>
      <Navbar />
      <main className="container-page min-h-screen py-8">
        <section className="w-full rounded-bloom border border-pink-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Search size={24} className="text-blossom" aria-hidden="true" />
            <h1 className="text-3xl font-bold text-ink">ติดตามคำสั่งซื้อ</h1>
            <HelpTooltip content="ใส่เลขคำสั่งซื้อเต็มในช่องหลัก หรือใช้ตัวกรองวันที่ เลขท้าย และเบอร์โทรเพื่อช่วยค้นหา" />
          </div>
          <label className="mt-5 block">
            <span className="inline-flex items-center gap-2 text-sm font-bold text-ink">
              เลขคำสั่งซื้อ
              <HelpTooltip content="ใส่เลขเต็ม เช่น FLOWER-20260722-278 ถ้าจำไม่ได้ให้ใช้ตัวกรองด้านล่างช่วยค้นหา" />
            </span>
            <span className="mt-2 flex items-center gap-2 rounded-soft border border-pink-100 bg-white px-4 py-3 focus-within:border-blossom">
              <Search size={18} className="shrink-0 text-blossom" aria-hidden="true" />
              <input
                suppressHydrationWarning
                value={orderNumber}
                onChange={(event) => setOrderNumber(normalizeOrderNumberInput(event.target.value))}
                placeholder="FLOWER-YYYYMMDD-XXX"
                className="min-w-0 flex-1 border-0 bg-transparent text-lg font-bold uppercase outline-none placeholder:text-base placeholder:font-semibold"
              />
            </span>
          </label>

          <div className="mt-4 rounded-bloom border border-pink-100 bg-blush/35 p-3">
            <p className="text-sm font-bold text-ink">ตัวกรองการค้นหา</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_minmax(180px,240px)_minmax(180px,240px)_120px]">
            <label className="block">
              <span className="inline-flex items-center gap-2 text-sm font-bold text-ink">
                วันที่สั่งซื้อ
                <HelpTooltip content="เลือกวันที่จากเลขคำสั่งซื้อ เช่น FLOWER-20260722-278 คือวันที่ 22 กรกฎาคม 2026" />
              </span>
              <input
                suppressHydrationWarning
                type="date"
                value={orderDate}
                onChange={(event) => {
                  setOrderDate(event.target.value);
                }}
                className="mt-2 w-full rounded-soft border border-pink-100 p-3 outline-none transition-colors focus:border-blossom"
              />
            </label>
            <label className="block">
              <span className="inline-flex items-center gap-2 text-sm font-bold text-ink">
                เลขท้าย 3 ตัว
                <HelpTooltip content="ใส่เฉพาะเลขหลังขีดสุดท้าย เช่น FLOWER-20260722-278 ให้ใส่ 278" />
              </span>
              <input
                suppressHydrationWarning
                value={orderSerial}
                onChange={(event) => {
                  setOrderSerial(getOrderSerial(event.target.value));
                }}
                inputMode="numeric"
                placeholder="เช่น 828"
                maxLength={3}
                className="mt-2 w-full rounded-soft border border-pink-100 p-3 outline-none transition-colors focus:border-blossom"
              />
            </label>
            <label className="block">
              <span className="inline-flex items-center gap-2 text-sm font-bold text-ink">
                เบอร์โทร 4 ตัวท้าย
                <HelpTooltip content="ใช้ยืนยันว่าเป็นคำสั่งซื้อของลูกค้าคนนั้น ไม่ต้องใส่เบอร์เต็ม" />
              </span>
              <input
                suppressHydrationWarning
                value={lastFour}
                onChange={(event) => setLastFour(getPhoneDigits(event.target.value).slice(0, 4))}
                inputMode="numeric"
                placeholder="เช่น 1234"
                maxLength={4}
                className="mt-2 w-full rounded-soft border border-pink-100 p-3 outline-none transition-colors focus:border-blossom"
              />
            </label>
            <button suppressHydrationWarning type="button" onClick={handleSearch} className="touch-target w-full self-end rounded-soft bg-blossom px-5 py-3 font-bold text-white transition-colors hover:bg-blossom-dark focus:outline-none focus:ring-2 focus:ring-blossom/30 md:col-span-2 xl:col-span-1">ค้นหา</button>
            </div>
          </div>
          <div className="mt-3 rounded-soft bg-blush/60 px-4 py-3 text-sm text-zinc-600">
            <span className="font-bold text-ink">เลขที่ใช้ค้นหา: </span>
            <span className="font-bold text-blossom">{orderPreview || "พิมพ์เลขคำสั่งซื้อในช่องหลัก หรือใช้ตัวกรองด้านบน"}</span>
            {orderNumber.trim() && filterPreview ? (
              <span className="ml-2 text-zinc-500">ตัวกรอง: {filterPreview}</span>
            ) : null}
          </div>
        </section>

        {quickOrders.length ? (
          <section className="mt-5 w-full rounded-bloom border border-pink-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <PackageCheck size={20} className="text-blossom" aria-hidden="true" />
              <h2 className="font-bold text-ink">{customerKey.userId ? "คำสั่งซื้อของฉัน" : "คำสั่งซื้อล่าสุดในเครื่องนี้"}</h2>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {quickOrders.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectOrder(item)}
                  className="rounded-soft border border-pink-100 bg-blush/40 p-4 text-left transition-colors hover:border-blossom hover:bg-blush focus:outline-none focus:ring-2 focus:ring-blossom/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-zinc-500">{item.orderNumber}</p>
                      <p className="mt-1 text-lg font-bold text-ink">{item.customerName}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-white px-3 py-1 text-sm font-bold text-blossom">{orderStatusLabels[item.orderStatus]}</span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-zinc-600 sm:grid-cols-2">
                    <p className="flex items-center gap-2">
                      <CalendarCheck size={16} className="text-stem" aria-hidden="true" />
                      {fulfillmentText(item)}
                    </p>
                    <p>ยอดรวม: <span className="font-bold text-ink">{item.total} บาท</span></p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {searchResults.length ? (
          <section className="mt-5 w-full rounded-bloom border border-pink-100 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-ink">พบหลายรายการ</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {searchResults.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectOrder(item)}
                  className="rounded-soft border border-pink-100 bg-white p-4 text-left transition-colors hover:border-blossom hover:bg-blush/60 focus:outline-none focus:ring-2 focus:ring-blossom/30"
                >
                  <p className="font-bold text-ink">{item.orderNumber}</p>
                  <p className="mt-1 text-sm text-zinc-600">{item.customerName} · {orderStatusLabels[item.orderStatus]}</p>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {order === null ? <div className="mt-6"><EmptyState title="ไม่พบคำสั่งซื้อ" message="ตรวจสอบเลขคำสั่งซื้อและเบอร์โทร 4 ตัวท้ายอีกครั้ง" /></div> : null}
        {order ? (
          <section className="mt-6 grid w-full gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
            <div className="rounded-bloom border border-pink-100 bg-white p-5 shadow-sm">
              <p className="text-sm text-zinc-500">เลขคำสั่งซื้อ</p>
              <h2 className="text-2xl font-bold">{order.orderNumber}</h2>
              <div className="mt-5">
                <StatusTimeline status={order.orderStatus} />
              </div>
              <div className="mt-5 rounded-soft bg-blush p-4">
                <p className="font-bold">
                  {isDeliveryOrder(order) ? "วันจัดส่งโดยประมาณ" : "วันรับ"}: {fulfillmentText(order)}
                </p>
                {isDeliveryOrder(order) ? (
                  order.trackingNumber ? (
                    <p className="text-zinc-600">
                      เลขพัสดุ: <span className="font-bold text-ink">{order.trackingCarrier ? `${order.trackingCarrier} ` : ""}{order.trackingNumber}</span>
                      {order.trackingUrl ? <a href={order.trackingUrl} target="_blank" rel="noreferrer" className="ml-2 font-bold text-blossom">ตรวจสอบพัสดุ</a> : null}
                    </p>
                  ) : (
                    <p className="text-zinc-600">เลขพัสดุจะแสดงที่นี่เมื่อร้านส่งของแล้ว</p>
                  )
                ) : null}
                <p className="text-zinc-600">ยอดคงเหลือ: {order.total - order.depositAmount} บาท</p>
                <p className="text-zinc-600">ชำระเงิน: <span className="font-bold text-ink">{paymentStatusLabels[order.paymentStatus]}</span></p>
                <p className="mt-2 text-sm text-zinc-600">รูปความคืบหน้าจากร้านจะแสดงที่นี่เมื่อมีการอัปโหลด</p>
              </div>
            </div>
            <ProductPreview config={order.config} />
          </section>
        ) : null}
      </main>
      <Footer />
    </>
  );
}
