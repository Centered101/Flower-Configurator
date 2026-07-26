"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Copy, FileDown, Loader2, Search } from "lucide-react";
import QRCode from "qrcode";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ProductPreview } from "@/components/configurator/ProductPreview";
import { DepositPaymentCard } from "@/components/DepositPaymentCard";
import { LAST_ORDER_KEY } from "@/lib/configurator";
import { formatThaiIsoDate } from "@/lib/date-format";
import { findOrder, updateStoredOrder } from "@/lib/orders";
import { createPromptPayPayload } from "@/lib/promptpay";
import type { CustomerOrder, OrderSourceItem } from "@/lib/types";

type PublicPaymentSettings = {
  promptPayId: string;
  accountName: string;
  qrImageUrl: string;
};

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
  const [isPrintingSummary, setIsPrintingSummary] = useState(false);
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

  async function downloadOrderSummaryImage() {
    if (isPrintingSummary) return;

    setIsPrintingSummary(true);
    try {
      const trackUrl = createOrderTrackingUrl(order);
      const paymentSettings = await readPublicPaymentSettings();
      const imageUrl = await createOrderSummaryImage(order, fulfillmentLabel, fulfillmentValue, trackUrl, paymentSettings);
      downloadDataUrl(imageUrl, `order-summary-${order.orderNumber}.png`);
    } finally {
      setIsPrintingSummary(false);
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
        <button
          type="button"
          onClick={() => void downloadOrderSummaryImage()}
          disabled={isPrintingSummary}
          className="touch-target inline-flex items-center justify-center gap-2 rounded-soft border border-pink-200 bg-white px-4 py-2 font-semibold transition hover:border-blossom hover:bg-blush disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPrintingSummary ? <Loader2 size={18} className="animate-spin" /> : <FileDown size={18} />}
          ดาวน์โหลดรูปสรุป
        </button>
      </div>
    </section>
  );
}

function downloadDataUrl(dataUrl: string, fileName: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = fileName;
  link.click();
}

function createOrderTrackingUrl(order: CustomerOrder) {
  const url = new URL("/track", window.location.origin);
  url.searchParams.set("order", order.orderNumber);
  const phoneSuffix = order.phone.replace(/\D/g, "").slice(-4);
  if (phoneSuffix) url.searchParams.set("phone", phoneSuffix);
  return url.toString();
}

async function readPublicPaymentSettings(): Promise<PublicPaymentSettings> {
  try {
    const response = await fetch("/api/payment-settings", { cache: "no-store" });
    if (!response.ok) throw new Error("load payment settings failed");
    const data = await response.json() as Partial<PublicPaymentSettings>;

    return {
      promptPayId: typeof data.promptPayId === "string" ? data.promptPayId : "",
      accountName: typeof data.accountName === "string" ? data.accountName : "",
      qrImageUrl: typeof data.qrImageUrl === "string" ? data.qrImageUrl : ""
    };
  } catch {
    return { promptPayId: "", accountName: "", qrImageUrl: "" };
  }
}

function loadCanvasImage(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function drawRoundRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function fillRoundRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number, color: string) {
  drawRoundRect(context, x, y, width, height, radius);
  context.fillStyle = color;
  context.fill();
}

function strokeRoundRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number, color: string, lineWidth = 2) {
  drawRoundRect(context, x, y, width, height, radius);
  context.strokeStyle = color;
  context.lineWidth = lineWidth;
  context.stroke();
}

function drawText(context: CanvasRenderingContext2D, text: string, x: number, y: number, options: {
  size?: number;
  weight?: number;
  color?: string;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
  maxWidth?: number;
} = {}) {
  context.font = `${options.weight ?? 600} ${options.size ?? 24}px Kanit, Arial, sans-serif`;
  context.fillStyle = options.color ?? "#25232A";
  context.textAlign = options.align ?? "left";
  context.textBaseline = options.baseline ?? "top";
  context.fillText(text, x, y, options.maxWidth);
}

function wrapText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines = 3, options: {
  size?: number;
  weight?: number;
  color?: string;
} = {}) {
  context.font = `${options.weight ?? 600} ${options.size ?? 22}px Kanit, Arial, sans-serif`;
  context.fillStyle = options.color ?? "#25232A";

  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const word of words.length ? words : [text]) {
    const next = line ? `${line} ${word}` : word;
    if (context.measureText(next).width <= maxWidth) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    line = word;
    if (lines.length >= maxLines - 1) break;
  }

  if (line && lines.length < maxLines) lines.push(line);
  lines.forEach((item, index) => context.fillText(index === maxLines - 1 && words.length > lines.length ? `${item}...` : item, x, y + index * lineHeight, maxWidth));
}

function drawInfoRow(context: CanvasRenderingContext2D, label: string, value: string, y: number) {
  drawText(context, label, 42, y, { size: 22, weight: 500, color: "#746A72" });
  wrapText(context, value || "-", 250, y - 2, 500, 30, 2, { size: 24, weight: 800, color: "#25232A" });
}

async function createQrImage(value: string, color = "#25232A") {
  if (!value) return null;

  const dataUrl = await QRCode.toDataURL(value, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 360,
    color: {
      dark: color,
      light: "#FFFFFF"
    }
  });

  return loadCanvasImage(dataUrl);
}

async function createDepositQrImage(order: CustomerOrder, paymentSettings: PublicPaymentSettings) {
  if (paymentSettings.promptPayId) {
    return createQrImage(createPromptPayPayload(paymentSettings.promptPayId, order.depositAmount), "#25232A");
  }

  if (paymentSettings.qrImageUrl) {
    return loadCanvasImage(paymentSettings.qrImageUrl);
  }

  return null;
}

function drawQrCard(context: CanvasRenderingContext2D, input: {
  x: number;
  y: number;
  title: string;
  subtitle: string;
  qrImage: HTMLImageElement | null;
  footer: string;
  accent?: string;
}) {
  const cardWidth = 350;
  const qrBoxSize = 200;
  const qrBoxX = input.x + (cardWidth - qrBoxSize) / 2;

  fillRoundRect(context, input.x, input.y, cardWidth, 330, 24, "#FFF8FB");
  strokeRoundRect(context, input.x, input.y, cardWidth, 330, 24, "#F8BBD0", 2);
  drawText(context, input.title, input.x + 24, input.y + 22, { size: 25, weight: 900, color: input.accent ?? "#25232A" });
  wrapText(context, input.subtitle, input.x + 24, input.y + 58, cardWidth - 48, 26, 2, { size: 18, weight: 600, color: "#746A72" });

  fillRoundRect(context, qrBoxX, input.y + 110, qrBoxSize, qrBoxSize, 22, "#FFFFFF");
  strokeRoundRect(context, qrBoxX, input.y + 110, qrBoxSize, qrBoxSize, 22, "#F8BBD0", 2);

  if (input.qrImage) {
    context.imageSmoothingEnabled = false;
    context.drawImage(input.qrImage, qrBoxX + 14, input.y + 124, 172, 172);
    context.imageSmoothingEnabled = true;
  } else {
    drawText(context, "ยังไม่มี", input.x + 135, input.y + 182, { size: 22, weight: 900, color: "#9A8F98" });
    drawText(context, "QR", input.x + 161, input.y + 214, { size: 22, weight: 900, color: "#9A8F98" });
  }

  drawText(context, input.footer, input.x + cardWidth / 2, input.y + 294, { size: 16, weight: 900, color: "#746A72", align: "center", maxWidth: cardWidth - 32 });
}

async function createOrderSummaryImage(
  order: CustomerOrder,
  fulfillmentLabel: string,
  fulfillmentValue: string,
  trackUrl: string,
  paymentSettings: PublicPaymentSettings
) {
  const canvas = document.createElement("canvas");
  const scale = 2;
  const width = 800;
  const height = 1460;
  canvas.width = width * scale;
  canvas.height = height * scale;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("สร้างรูปสรุปคำสั่งซื้อไม่ได้");

  context.scale(scale, scale);
  context.fillStyle = "#FFF8FB";
  context.fillRect(0, 0, width, height);

  context.fillStyle = "#FFFFFF";
  context.fillRect(0, 0, width, height);

  context.fillStyle = "#F48BB1";
  context.fillRect(0, 0, width, 244);

  const logo = await loadCanvasImage("/favicon.png");
  if (logo) {
    fillRoundRect(context, 34, 44, 76, 76, 20, "#FFFFFF");
    context.drawImage(logo, 41, 51, 62, 62);
  }

  drawText(context, "Cake Bloom", 132, 42, { size: 28, weight: 900, color: "#FFFFFF" });
  drawText(context, "ใบสั่งซื้อ", 132, 80, { size: 52, weight: 900, color: "#FFFFFF" });
  drawText(context, order.orderNumber, 132, 164, { size: 31, weight: 900, color: "#FFFFFF" });

  const statusText = order.paymentStatus === "paid" ? "ชำระแล้ว" : order.paymentStatus === "awaiting_slip_review" ? "รอตรวจสลิป" : "รอมัดจำ";
  fillRoundRect(context, 604, 58, 154, 48, 24, "#FFF8FB");
  drawText(context, statusText, 681, 70, { size: 18, weight: 900, color: "#EC70A0", align: "center" });

  fillRoundRect(context, 36, 278, 340, 100, 20, "#FFF1F7");
  fillRoundRect(context, 424, 278, 340, 100, 20, "#F3FAF3");
  drawText(context, "ยอดรวม", 62, 306, { size: 20, weight: 500, color: "#746A72" });
  drawText(context, `${order.total.toLocaleString("th-TH")} บาท`, 62, 336, { size: 30, weight: 900, color: "#EC70A0" });
  drawText(context, "ยอดมัดจำ", 450, 306, { size: 20, weight: 500, color: "#746A72" });
  drawText(context, `${order.depositAmount.toLocaleString("th-TH")} บาท`, 450, 336, { size: 30, weight: 900, color: "#2E7D32" });

  const [trackQrImage, depositQrImage] = await Promise.all([
    createQrImage(trackUrl),
    createDepositQrImage(order, paymentSettings)
  ]);

  const title = order.sourceItem?.title || order.config.productType || "ออเดอร์ออกแบบเอง";
  const details = order.sourceItem?.details?.join(" / ") || [
    order.config.flowerType,
    `${order.config.quantity.toLocaleString("th-TH")} ดอก`,
    order.config.wrapping,
    order.config.ribbon
  ].filter(Boolean).join(" / ");

  drawInfoRow(context, "ลูกค้า", order.customerName, 420);
  drawInfoRow(context, "เบอร์โทร", order.phone, 480);
  drawInfoRow(context, "LINE ID", order.lineId || "-", 540);
  drawInfoRow(context, "แบบที่สั่ง", title, 600);
  drawInfoRow(context, "รายละเอียด", details || "-", 660);
  drawInfoRow(context, "วิธีรับ", order.pickupMethod, 740);
  drawInfoRow(context, fulfillmentLabel, fulfillmentValue, 800);
  drawInfoRow(context, "สถานที่", order.pickupLocation || "-", 860);

  context.strokeStyle = "#F8BBD0";
  context.setLineDash([10, 8]);
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(36, 966);
  context.lineTo(764, 966);
  context.stroke();
  context.setLineDash([]);

  drawQrCard(context, {
    x: 36,
    y: 1002,
    title: "จ่ายมัดจำ",
    subtitle: `สแกนจ่าย ${order.depositAmount.toLocaleString("th-TH")} บาท`,
    qrImage: depositQrImage,
    footer: paymentSettings.accountName || "PromptPay",
    accent: "#2E7D32"
  });
  drawQrCard(context, {
    x: 414,
    y: 1002,
    title: "ติดตามออเดอร์",
    subtitle: "สแกนดูสถานะคำสั่งซื้อ",
    qrImage: trackQrImage,
    footer: order.orderNumber,
    accent: "#EC70A0"
  });

  drawText(context, `สร้างเมื่อ ${new Intl.DateTimeFormat("th-TH-u-ca-gregory-nu-latn", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date())}`, 42, 1372, { size: 18, weight: 600, color: "#9A8F98" });

  return canvas.toDataURL("image/png", 0.95);
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
