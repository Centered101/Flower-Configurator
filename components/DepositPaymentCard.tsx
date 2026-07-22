"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Loader2, QrCode, Upload } from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { HelpTooltip } from "@/components/HelpTooltip";
import { createPromptPayPayload } from "@/lib/promptpay";
import { updateStoredOrder } from "@/lib/orders";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { CustomerOrder } from "@/lib/types";

type SlipApiResponse = {
  paymentStatus: CustomerOrder["paymentStatus"];
  slip: {
    url: string;
    path: string;
  };
  verification: {
    status: "awaiting_review" | "paid" | "failed";
    message: string;
    parsedAmount?: number;
    receiverMatched: boolean | null;
  };
};

type PublicPaymentSettings = {
  promptPayId: string;
  accountName: string;
  qrImageUrl: string;
};

export function DepositPaymentCard({
  order,
  onOrderUpdated
}: {
  order: CustomerOrder;
  onOrderUpdated: (order: CustomerOrder) => void;
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [message, setMessage] = useState(order.paymentSlip?.message ?? "");
  const [paymentSettings, setPaymentSettings] = useState<PublicPaymentSettings>({ promptPayId: "", accountName: "", qrImageUrl: "" });
  const [isUploading, setIsUploading] = useState(false);
  const promptPayId = paymentSettings.promptPayId;
  const accountName = paymentSettings.accountName;
  const fallbackQrUrl = paymentSettings.qrImageUrl;
  const isPaid = order.paymentStatus === "paid";
  const isReviewing = order.paymentStatus === "awaiting_slip_review";

  useEffect(() => {
    let isMounted = true;

    fetch("/api/payment-settings", { cache: "no-store" })
      .then((response) => response.json())
      .then((settings: PublicPaymentSettings) => {
        if (!isMounted) return;
        setPaymentSettings({
          promptPayId: settings.promptPayId ?? "",
          accountName: settings.accountName ?? "",
          qrImageUrl: settings.qrImageUrl ?? ""
        });
      })
      .catch(() => {
        if (!isMounted) return;
        setMessage("โหลดข้อมูลบัญชีรับเงินไม่สำเร็จ กรุณาแจ้งผู้ดูแลร้าน");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function createQr() {
      if (!promptPayId) {
        setQrDataUrl("");
        return;
      }

      const payload = createPromptPayPayload(promptPayId, order.depositAmount);
      const url = await QRCode.toDataURL(payload, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 280,
        color: {
          dark: "#2B2B2B",
          light: "#FFFFFF"
        }
      });

      if (!cancelled) setQrDataUrl(url);
    }

    void createQr();

    return () => {
      cancelled = true;
    };
  }, [order.depositAmount, promptPayId]);

  async function copyText(value: string, successMessage: string) {
    await navigator.clipboard.writeText(value);
    toast.success(successMessage);
  }

  async function syncOrderToDatabase(token: string) {
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(order)
    });
    const result = await response.json().catch(() => null) as { error?: string } | null;

    if (!response.ok) {
      throw new Error(result?.error ?? "บันทึกคำสั่งซื้อลงระบบไม่สำเร็จ");
    }
  }

  async function uploadSlip(file: File | undefined) {
    if (!file) return;

    setIsUploading(true);
    setMessage("");

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        throw new Error("กรุณาเข้าสู่ระบบก่อนอัปโหลดสลิป");
      }

      setMessage("กำลังบันทึกคำสั่งซื้อลงระบบ...");
      await syncOrderToDatabase(token);

      setMessage("กำลังอัปโหลดและตรวจสลิป...");
      const formData = new FormData();
      formData.set("orderNumber", order.orderNumber);
      formData.set("file", file);

      const response = await fetch("/api/payments/slip", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });
      const result = await response.json() as SlipApiResponse | { error?: string };

      if (!response.ok) {
        throw new Error("error" in result && result.error ? result.error : "อัปโหลดสลิปไม่สำเร็จ");
      }

      const paymentResult = result as SlipApiResponse;
      const patch: Partial<CustomerOrder> = {
        paymentStatus: paymentResult.paymentStatus,
        orderStatus: paymentResult.paymentStatus === "paid" ? "design_confirmed" : "awaiting_payment",
        paymentSlip: {
          url: paymentResult.slip.url,
          path: paymentResult.slip.path,
          amount: order.depositAmount,
          parsedAmount: paymentResult.verification.parsedAmount,
          status: paymentResult.verification.status,
          message: paymentResult.verification.message,
          uploadedAt: new Date().toISOString()
        }
      };
      const nextOrder = updateStoredOrder(order.orderNumber, patch) ?? { ...order, ...patch };
      onOrderUpdated(nextOrder);
      setMessage(paymentResult.verification.message);

      if (paymentResult.paymentStatus === "paid") {
        toast.success("ตรวจสลิปสำเร็จ ชำระมัดจำแล้ว");
      } else if (paymentResult.paymentStatus === "failed") {
        toast.error(paymentResult.verification.message);
      } else {
        toast.warning("รับสลิปแล้ว รอผู้ดูแลร้านตรวจสอบ");
      }
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : "อัปโหลดสลิปไม่สำเร็จ";
      setMessage(nextMessage);
      toast.error(nextMessage);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="rounded-bloom border border-pink-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-blossom">มัดจำ 50%</p>
          <h2 className="mt-1 inline-flex items-center gap-2 text-2xl font-bold text-ink">
            สแกน QR แล้วอัปโหลดสลิป
            <HelpTooltip content="หลังอัปโหลด ระบบจะอ่าน QR ในสลิปเพื่อตรวจยอดโอนและบัญชีผู้รับ ถ้าตรวจไม่ได้จะส่งให้ร้านตรวจเอง" />
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            ยอดที่ต้องชำระ {order.depositAmount.toLocaleString("th-TH")} บาท หลังอัปโหลดสลิป ระบบจะอ่าน QR ในสลิปเพื่อตรวจยอดและบัญชีผู้รับ
          </p>
        </div>
        <span className={`rounded-full px-4 py-2 text-sm font-bold ${isPaid ? "bg-green-50 text-green-700" : isReviewing ? "bg-yellow-50 text-yellow-700" : "bg-blush text-blossom"}`}>
          {isPaid ? "ชำระมัดจำแล้ว" : isReviewing ? "รอตรวจสลิป" : "รอมัดจำ"}
        </span>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[280px_1fr]">
        <div className="rounded-bloom border border-pink-100 bg-blush/50 p-4">
          <div className="grid min-h-[280px] place-items-center rounded-soft bg-white p-3">
            {qrDataUrl || fallbackQrUrl ? (
              <img
                src={qrDataUrl || fallbackQrUrl}
                alt="QR Code สำหรับชำระเงินมัดจำ"
                draggable={false}
                onContextMenu={(event) => event.preventDefault()}
                className="h-auto max-h-[260px] w-full select-none object-contain"
              />
            ) : (
              <div className="text-center text-sm text-zinc-600">
                <QrCode className="mx-auto mb-2 text-blossom" size={42} />
                ยังไม่ได้ตั้งค่าบัญชีรับเงิน
              </div>
            )}
          </div>
          {accountName ? <p className="mt-3 text-center text-sm font-bold text-ink">{accountName}</p> : null}
            {promptPayId ? (
            <button
              type="button"
              onClick={() => copyText(promptPayId, "คัดลอกเลข PromptPay แล้ว")}
              className="touch-target mt-3 inline-flex w-full items-center justify-center gap-2 rounded-soft bg-white px-4 py-2 font-bold text-ink"
            >
              <Copy size={16} />
              คัดลอก PromptPay
            </button>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Info label="เลขคำสั่งซื้อ" value={order.orderNumber} />
            <Info label="ยอดมัดจำ" value={`${order.depositAmount.toLocaleString("th-TH")} บาท`} />
          </div>

          <label className="touch-target flex cursor-pointer items-center justify-center gap-2 rounded-soft bg-blossom px-5 py-3 font-bold text-white has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
            <input
              suppressHydrationWarning
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,.jpg,.jpeg,.png,.webp,.avif"
              disabled={isUploading || isPaid}
              onChange={(event) => uploadSlip(event.target.files?.[0])}
              className="sr-only"
            />
            {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
            {isUploading ? "กำลังตรวจสลิป..." : isPaid ? "ชำระแล้ว" : "อัปโหลดสลิป"}
          </label>

          {order.paymentSlip?.url ? (
            <div className="rounded-soft border border-pink-100 bg-white p-3">
              <p className="mb-2 text-sm font-bold text-ink">สลิปที่อัปโหลด</p>
              <img
                src={order.paymentSlip.url}
                alt="สลิปมัดจำ"
                draggable={false}
                onContextMenu={(event) => event.preventDefault()}
                className="max-h-72 w-full select-none rounded-soft object-contain"
              />
            </div>
          ) : null}

          {message ? (
            <p className={`rounded-soft px-4 py-3 text-sm font-semibold ${order.paymentStatus === "failed" ? "bg-red-50 text-red-700" : isPaid ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}`}>
              {message}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-soft border border-pink-100 p-4">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-1 font-bold text-ink">{value}</p>
    </div>
  );
}
