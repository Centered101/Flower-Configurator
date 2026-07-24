"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, Copy, Loader2, QrCode, Send, Upload } from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { formatThaiDateTime } from "@/lib/date-format";
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
  lineNotification?: {
    ok: boolean;
    error?: string;
    skipped?: boolean;
    reason?: string;
  };
};

type NotifySlipResponse = {
  ok?: boolean;
  skipped?: boolean;
  notifiedAt?: string;
  error?: string;
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
  const [selectedSlip, setSelectedSlip] = useState<File | null>(null);
  const [selectedSlipPreviewUrl, setSelectedSlipPreviewUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);
  const [hasNotifiedLine, setHasNotifiedLine] = useState(false);
  const promptPayId = paymentSettings.promptPayId;
  const accountName = paymentSettings.accountName;
  const fallbackQrUrl = paymentSettings.qrImageUrl;
  const isPaid = order.paymentStatus === "paid";
  const isReviewing = order.paymentStatus === "awaiting_slip_review";
  const uploadedSlipUrl = order.paymentSlip?.url ?? "";
  const hasUploadedSlip = Boolean(uploadedSlipUrl);
  const previewSlipUrl = selectedSlipPreviewUrl || uploadedSlipUrl;
  const isBusy = isUploading || isNotifying;
  const canUsePrimaryAction = Boolean(selectedSlip || uploadedSlipUrl) && !isBusy && !hasNotifiedLine;
  const primaryActionText = isUploading
    ? "กำลังอัปโหลดสลิป..."
    : isNotifying
      ? "กำลังส่งให้ร้าน..."
      : hasNotifiedLine
        ? "ส่งให้ร้านแล้ว"
        : selectedSlip
          ? "อัปโหลดสลิป"
          : uploadedSlipUrl
            ? "ส่งสลิปให้ร้านตรวจ"
            : "เลือกสลิปก่อน";
  const primaryActionIcon = selectedSlip ? <Upload size={18} /> : <Send size={18} />;
  const slipStatus = isPaid
    ? {
      title: "ชำระมัดจำแล้ว",
      description: "ร้านตรวจสลิปแล้ว คำสั่งซื้อเข้าสู่ขั้นตอนถัดไป",
      className: "border-green-100 bg-green-50 text-green-800",
      icon: <CheckCircle2 size={20} className="text-green-600" />
    }
    : order.paymentStatus === "failed"
      ? {
        title: hasUploadedSlip ? "สลิปนี้ตรวจไม่ผ่าน" : "ยังไม่ได้อัปโหลดสลิป",
        description: hasUploadedSlip ? (order.paymentSlip?.message || "กรุณาเลือกสลิปใหม่แล้วอัปโหลดอีกครั้ง") : "สแกนจ่ายแล้วเลือกไฟล์สลิปเพื่อบันทึกเข้าระบบ",
        className: "border-red-100 bg-red-50 text-red-800",
        icon: <AlertCircle size={20} className="text-red-600" />
      }
      : hasUploadedSlip
        ? {
          title: "อัปโหลดสลิปแล้ว",
          description: `${order.paymentSlip?.uploadedAt ? `อัปโหลดเมื่อ ${formatThaiDateTime(order.paymentSlip.uploadedAt)} ` : ""}สถานะตอนนี้คือรอร้านตรวจ`,
          className: "border-yellow-100 bg-yellow-50 text-yellow-800",
          icon: <Clock3 size={20} className="text-yellow-700" />
        }
        : {
          title: "ยังไม่ได้อัปโหลดสลิป",
          description: "หลังโอนมัดจำแล้ว เลือกไฟล์สลิปและกดอัปโหลดสลิป",
          className: "border-pink-100 bg-blush text-ink",
          icon: <Upload size={20} className="text-blossom" />
        };

  useEffect(() => {
    let isMounted = true;

    fetch("/api/payment-settings", { cache: "no-store" })
      .then(async (response) => {
        const settings = await response.json().catch(() => null) as PublicPaymentSettings | null;
        if (!response.ok || !settings) {
          throw new Error("โหลดข้อมูลบัญชีรับเงินไม่สำเร็จ");
        }
        return settings;
      })
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
      try {
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
      } catch {
        if (!cancelled) {
          setQrDataUrl("");
          setMessage("สร้าง QR อัตโนมัติไม่สำเร็จ กรุณาใช้รูป QR ที่ร้านตั้งค่าไว้หรือคัดลอก PromptPay");
        }
      }
    }

    void createQr();

    return () => {
      cancelled = true;
    };
  }, [order.depositAmount, promptPayId]);

  useEffect(() => {
    return () => {
      if (selectedSlipPreviewUrl) URL.revokeObjectURL(selectedSlipPreviewUrl);
    };
  }, [selectedSlipPreviewUrl]);

  async function copyText(value: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(successMessage);
    } catch {
      toast.error("คัดลอกไม่สำเร็จ กรุณาคัดลอกด้วยตัวเอง");
    }
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

  function chooseSlip(file: File | undefined) {
    if (!file) return;

    if (selectedSlipPreviewUrl) URL.revokeObjectURL(selectedSlipPreviewUrl);
    setSelectedSlip(file);
    setSelectedSlipPreviewUrl(URL.createObjectURL(file));
    setHasNotifiedLine(false);
    setMessage("เลือกสลิปแล้ว กดอัปโหลดสลิปเพื่อบันทึกเข้าระบบ");
  }

  async function uploadSlip() {
    if (!selectedSlip) {
      toast.error("กรุณาเลือกไฟล์สลิปก่อน");
      return;
    }

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
      formData.set("file", selectedSlip);

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
      setSelectedSlip(null);
      setSelectedSlipPreviewUrl("");
      setHasNotifiedLine(false);
      setMessage(`${paymentResult.verification.message} กดส่งสลิปให้ร้านตรวจเพื่อแจ้งเตือน LINE`);

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

  async function notifySlip() {
    if (!order.paymentSlip?.path && !order.paymentSlip?.url) {
      toast.error("กรุณาอัปโหลดสลิปก่อนส่งให้ร้านตรวจ");
      return;
    }

    setIsNotifying(true);
    setMessage("");

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        throw new Error("กรุณาเข้าสู่ระบบก่อนส่งสลิปให้ร้านตรวจ");
      }

      const response = await fetch("/api/payments/slip/notify", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          orderNumber: order.orderNumber
        })
      });
      const result = await response.json().catch(() => null) as NotifySlipResponse | null;

      if (!response.ok || result?.ok === false) {
        throw new Error(result?.error ?? "ส่งสลิปให้ร้านตรวจไม่สำเร็จ");
      }

      setHasNotifiedLine(true);
      if (result?.skipped) {
        setMessage("สลิปนี้เคยส่งให้ร้านตรวจแล้ว ระบบจึงไม่ส่ง LINE ซ้ำ");
        toast.info("สลิปนี้เคยส่งให้ร้านตรวจแล้ว");
      } else {
        setMessage("ส่งสลิปให้ร้านตรวจแล้ว");
        toast.success("ส่งสลิปให้ร้านตรวจแล้ว");
      }
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : "ส่งสลิปให้ร้านตรวจไม่สำเร็จ";
      setMessage(nextMessage);
      toast.error(nextMessage);
    } finally {
      setIsNotifying(false);
    }
  }

  function handlePrimaryPaymentAction() {
    if (selectedSlip) {
      void uploadSlip();
      return;
    }

    if (uploadedSlipUrl) {
      void notifySlip();
      return;
    }

    toast.error("กรุณาเลือกไฟล์สลิปก่อน");
  }

  return (
    <section className="rounded-bloom border border-pink-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-blossom">มัดจำ 50%</p>
          <h2 className="mt-1 text-2xl font-bold text-ink">สแกนจ่าย แล้วส่งสลิป</h2>
          <p className="mt-1 text-sm text-zinc-600">
            {hasUploadedSlip ? "สลิปถูกบันทึกไว้แล้ว สามารถกลับมาหน้านี้เพื่อดูสถานะได้" : "เลือกไฟล์สลิปก่อน แล้วกดปุ่มหลักด้านล่าง"}
          </p>
        </div>
        <span className={`rounded-full px-4 py-2 text-sm font-bold ${isPaid ? "bg-green-50 text-green-700" : isReviewing ? "bg-yellow-50 text-yellow-700" : "bg-blush text-blossom"}`}>
          {isPaid ? "ชำระมัดจำแล้ว" : isReviewing ? "รอตรวจสลิป" : "รอมัดจำ"}
        </span>
      </div>

      <div className={`mt-4 flex items-start gap-3 rounded-soft border p-4 ${slipStatus.className}`}>
        <span className="mt-0.5 shrink-0">{slipStatus.icon}</span>
        <div className="min-w-0">
          <p className="font-bold">{slipStatus.title}</p>
          <p className="mt-1 text-sm leading-6">{slipStatus.description}</p>
          {hasUploadedSlip && !isPaid ? (
            <p className="mt-1 text-xs font-semibold">ถ้าส่งผิดรูป ให้กด “เปลี่ยนสลิป” แล้วอัปโหลดใหม่ได้</p>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[260px_1fr]">
        <div className="rounded-bloom bg-blush/60 p-3">
          <div className="grid min-h-[260px] place-items-center rounded-soft bg-white p-3">
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
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-zinc-500">ยอดมัดจำ</p>
              <p className="font-bold text-blossom">{order.depositAmount.toLocaleString("th-TH")} บาท</p>
              {accountName ? <p className="truncate text-xs font-semibold text-ink">{accountName}</p> : null}
            </div>
            {promptPayId ? (
              <button
                type="button"
                onClick={() => copyText(promptPayId, "คัดลอกเลข PromptPay แล้ว")}
                className="touch-target inline-flex shrink-0 items-center justify-center gap-2 rounded-soft bg-white px-3 py-2 text-sm font-bold text-ink"
              >
                <Copy size={16} />
                คัดลอก
              </button>
            ) : null}
          </div>
        </div>

        <div className="space-y-3">
          <label className="touch-target flex cursor-pointer items-center justify-center gap-2 rounded-soft border border-pink-200 bg-white px-5 py-3 font-bold text-ink has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
            <input
              suppressHydrationWarning
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,.jpg,.jpeg,.png,.webp,.avif"
              disabled={isBusy || isPaid}
              onChange={(event) => chooseSlip(event.target.files?.[0])}
              className="sr-only"
            />
            <Upload size={18} />
            {selectedSlip ? "เลือกสลิปแล้ว" : uploadedSlipUrl ? "เปลี่ยนสลิป" : "เลือกไฟล์สลิป"}
          </label>

          <button
            type="button"
            suppressHydrationWarning
            onClick={handlePrimaryPaymentAction}
            disabled={!canUsePrimaryAction}
            className="touch-target inline-flex w-full items-center justify-center gap-2 rounded-soft bg-ink px-5 py-3 font-bold text-white shadow-lg shadow-zinc-900/10 transition hover:bg-blossom disabled:opacity-50"
          >
            {isBusy ? <Loader2 size={18} className="animate-spin" /> : primaryActionIcon}
            {primaryActionText}
          </button>

          {previewSlipUrl ? (
            <div className="rounded-soft border border-pink-100 bg-white p-3">
              <p className="mb-2 text-sm font-bold text-ink">{selectedSlip ? "สลิปที่เลือก" : "สลิปที่อัปโหลด"}</p>
              <img
                src={previewSlipUrl}
                alt={selectedSlip ? "สลิปที่เลือก" : "สลิปมัดจำ"}
                draggable={false}
                onContextMenu={(event) => event.preventDefault()}
                className="max-h-80 w-full select-none rounded-soft object-contain"
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
