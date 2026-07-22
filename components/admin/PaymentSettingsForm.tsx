"use client";

import { useEffect, useState } from "react";
import { CreditCard, QrCode, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { HelpTooltip } from "@/components/HelpTooltip";

type PaymentSettings = {
  promptPayId: string;
  accountName: string;
  qrImageUrl: string;
  updatedAt?: string;
};

export function PaymentSettingsForm() {
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [promptPayId, setPromptPayId] = useState("");
  const [accountName, setAccountName] = useState("");
  const [qrImageUrl, setQrImageUrl] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/payment-settings", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: PaymentSettings) => {
        setSettings(data);
        setPromptPayId(data.promptPayId);
        setAccountName(data.accountName);
        setQrImageUrl(data.qrImageUrl);
      })
      .catch(() => {
        setError("โหลดการตั้งค่า PromptPay ไม่สำเร็จ");
        toast.error("โหลดการตั้งค่า PromptPay ไม่สำเร็จ");
      });
  }, []);

  async function saveSettings() {
    setError("");
    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/payment-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          promptPayId,
          accountName,
          qrImageUrl
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "บันทึกการตั้งค่า PromptPay ไม่สำเร็จ");
      }

      setSettings(data as PaymentSettings);
      toast.success("บันทึกการตั้งค่า PromptPay แล้ว");
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "บันทึกการตั้งค่า PromptPay ไม่สำเร็จ";
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-bloom border border-pink-100 bg-white p-4 shadow-sm sm:p-5" data-aos="fade-up">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-soft bg-blush text-blossom">
          <QrCode size={20} />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-ink">บัญชีรับเงิน PromptPay</h2>
            <HelpTooltip
              title="PromptPay"
              content="ข้อมูลนี้ใช้สร้าง QR มัดจำ 50% ในหน้าชำระเงิน และใช้เทียบกับข้อมูลในสลิปที่ลูกค้าอัปโหลด"
            />
          </div>
          <p className="mt-1 text-sm leading-6 text-zinc-600">
            ใช้สร้าง QR มัดจำ 50% และใช้ตรวจบัญชีผู้รับตอนลูกค้าอัปโหลดสลิป
          </p>
        </div>
      </div>

      <fieldset disabled={isSaving} className="mt-5 grid gap-4 disabled:opacity-75">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="block">
            <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink">
              เลข PromptPay
              <HelpTooltip content="ใส่เบอร์โทร เลขบัตรประชาชน หรือ e-Wallet ID ที่ต้องการรับเงินผ่าน PromptPay" />
            </div>
            <input
              suppressHydrationWarning
              aria-label="เลข PromptPay"
              value={promptPayId}
              onChange={(event) => setPromptPayId(event.target.value)}
              placeholder="เบอร์โทร, เลขบัตรประชาชน หรือ e-Wallet ID"
              className="touch-target w-full rounded-soft border border-pink-100 px-3"
              autoComplete="off"
            />
          </div>

          <div className="block">
            <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink">
              ชื่อบัญชีรับเงิน
              <HelpTooltip content="ใช้ช่วยตรวจว่าสลิปที่ลูกค้าอัปโหลดโอนเข้าบัญชีร้านถูกบัญชีหรือไม่" />
            </div>
            <input
              suppressHydrationWarning
              aria-label="ชื่อบัญชีรับเงิน"
              value={accountName}
              onChange={(event) => setAccountName(event.target.value)}
              placeholder="เช่น นาย พงศ์พล พรมผา"
              className="touch-target w-full rounded-soft border border-pink-100 px-3"
              autoComplete="off"
            />
          </div>
        </div>

        <div className="block">
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink">
            ลิงก์รูป QR สำรอง ไม่บังคับ
            <HelpTooltip content="ใช้เฉพาะกรณีต้องการแสดงรูป QR ที่เตรียมเอง ถ้าไม่ใส่ ระบบจะสร้าง QR จากเลข PromptPay ให้อัตโนมัติ" />
          </div>
          <input
            suppressHydrationWarning
            aria-label="ลิงก์รูป QR สำรอง"
            value={qrImageUrl}
            onChange={(event) => setQrImageUrl(event.target.value)}
            placeholder="https://example.com/promptpay-qr.png"
            className="touch-target w-full rounded-soft border border-pink-100 px-3"
            autoComplete="off"
          />
          <span className="mt-1 block text-xs text-zinc-500">ถ้าไม่ใส่ ระบบจะสร้าง QR จากเลข PromptPay ให้อัตโนมัติ</span>
        </div>

        {settings?.updatedAt ? (
          <p className="inline-flex items-center gap-2 text-sm text-zinc-600">
            <ShieldCheck size={16} className="text-stem" />
            อัปเดตล่าสุด {new Date(settings.updatedAt).toLocaleString("th-TH")}
          </p>
        ) : null}

        {error ? <p className="rounded-soft bg-red-50 p-3 text-sm text-red-600">{error}</p> : null}

        <button
          type="button"
          suppressHydrationWarning
          onClick={saveSettings}
          disabled={isSaving}
          className="touch-target inline-flex items-center justify-center gap-2 rounded-soft bg-blossom px-4 py-2 font-bold text-white disabled:opacity-50"
        >
          <CreditCard size={18} />
          {isSaving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า PromptPay"}
        </button>
      </fieldset>
    </section>
  );
}
