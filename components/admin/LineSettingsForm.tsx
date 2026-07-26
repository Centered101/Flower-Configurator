"use client";

import { useEffect, useState } from "react";
import { Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { HelpTooltip } from "@/components/HelpTooltip";

type PublicLineSettings = {
  hasChannelAccessToken: boolean;
  maskedChannelAccessToken: string;
  adminGroupId: string;
  updatedAt?: string;
};

export function LineSettingsForm() {
  const [settings, setSettings] = useState<PublicLineSettings | null>(null);
  const [channelAccessToken, setChannelAccessToken] = useState("");
  const [adminGroupId, setAdminGroupId] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    fetch("/api/admin/line-settings")
      .then((response) => response.json())
      .then((data: PublicLineSettings) => {
        setSettings(data);
        setAdminGroupId(data.adminGroupId);
      })
      .catch(() => {
        setError("โหลดการตั้งค่า LINE ไม่สำเร็จ");
        toast.error("โหลดการตั้งค่า LINE ไม่สำเร็จ");
      });
  }, []);

  async function saveSettings() {
    setError("");
    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/line-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          channelAccessToken,
          adminGroupId
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "บันทึกการตั้งค่า LINE ไม่สำเร็จ");
      }

      setSettings(data as PublicLineSettings);
      setChannelAccessToken("");
      toast.success("บันทึกการตั้งค่า LINE แล้ว");
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "บันทึกการตั้งค่า LINE ไม่สำเร็จ";
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function testLine() {
    setError("");
    setIsTesting(true);

    try {
      const response = await fetch("/api/admin/line-test", {
        method: "POST"
      });
      const data = await response.json() as { ok?: boolean; error?: string };

      if (!response.ok || data.ok === false) {
        throw new Error(data.error ?? "ทดสอบส่ง LINE ไม่สำเร็จ");
      }

      toast.success("ส่งข้อความทดสอบไปยังผู้รับ LINE แล้ว");
    } catch (testError) {
      const message = testError instanceof Error ? testError.message : "ทดสอบส่ง LINE ไม่สำเร็จ";
      setError(message);
      toast.error(message);
    } finally {
      setIsTesting(false);
    }
  }

  return (
    <section className="rounded-bloom border border-pink-100 bg-white p-4 shadow-sm sm:p-5" data-aos="fade-up">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-soft bg-blush text-blossom">
          <Send size={20} />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-ink">แจ้งเตือนร้านผ่าน LINE</h2>
            <HelpTooltip
              title="LINE แจ้งเตือน"
              content="ระบบส่งแจ้งเตือนหลักตอนลูกค้าอัปโหลดสลิป โดยรวมเลขออร์เดอร์ รายละเอียดสำคัญ และรูปสลิปไว้ในข้อความเดียวเพื่อลดจำนวนครั้งที่ส่ง LINE"
            />
          </div>
          <p className="mt-1 text-sm leading-6 text-zinc-600">
            ระบบจะส่งข้อความไปยังผู้รับ LINE ตอนลูกค้าอัปโหลดสลิปเป็นหลัก จะใช้ User ID, Group ID หรือ Room ID ก็ได้
          </p>
        </div>
      </div>

      <fieldset disabled={isSaving || isTesting} className="mt-5 grid gap-4 disabled:opacity-75">
        <div className="block">
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink">
            รหัสเชื่อมต่อ LINE
            <HelpTooltip content="ใช้รหัสเชื่อมต่อจาก LINE Developers หน้า Messaging API ใส่เฉพาะรหัสยาว ๆ ไม่ต้องใส่คำอื่นนำหน้า" />
          </div>
          <input
            suppressHydrationWarning
            type="password"
            aria-label="รหัสเชื่อมต่อ LINE"
            value={channelAccessToken}
            onChange={(event) => setChannelAccessToken(event.target.value)}
            placeholder={settings?.hasChannelAccessToken ? `ตั้งค่าแล้ว: ${settings.maskedChannelAccessToken}` : "ใส่รหัสจาก LINE Developers"}
            className="touch-target w-full rounded-soft border border-pink-100 px-3"
            autoComplete="off"
          />
          <span className="mt-1 block text-xs text-zinc-500">ปล่อยว่างไว้ถ้าต้องการใช้รหัสเดิม ถ้าทดสอบแล้วขึ้น 401 ให้สร้างรหัสเชื่อมต่อใหม่แล้วบันทึกทับ</span>
        </div>

        <div className="block">
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink">
            รหัสผู้รับ LINE
            <HelpTooltip content="ใส่รหัสผู้รับจาก LINE ถ้าเป็นกลุ่มต้องเป็นรหัสที่ขึ้นต้นด้วย C และบอทต้องอยู่ในกลุ่มนั้นแล้ว" />
          </div>
          <input
            suppressHydrationWarning
            aria-label="รหัสผู้รับ LINE"
            value={adminGroupId}
            onChange={(event) => setAdminGroupId(event.target.value)}
            placeholder="เช่น Uxxxxxxxx, Cxxxxxxxx หรือ Rxxxxxxxx"
            className="touch-target w-full rounded-soft border border-pink-100 px-3"
            autoComplete="off"
          />
        </div>

        {settings?.updatedAt ? (
          <p className="inline-flex items-center gap-2 text-sm text-zinc-600">
            <ShieldCheck size={16} className="text-stem" />
            อัปเดตล่าสุด {new Date(settings.updatedAt).toLocaleString("th-TH")}
          </p>
        ) : null}

        {error ? <p className="rounded-soft bg-red-50 p-3 text-sm text-red-600">{error}</p> : null}
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <button
            type="button"
            suppressHydrationWarning
            onClick={saveSettings}
            disabled={isSaving}
            className="touch-target rounded-soft bg-blossom px-4 py-2 font-bold text-white disabled:opacity-50"
          >
            {isSaving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า LINE"}
          </button>
          <button
            type="button"
            suppressHydrationWarning
            onClick={testLine}
            disabled={isTesting || !settings?.hasChannelAccessToken || !adminGroupId}
            className="touch-target rounded-soft border border-pink-200 bg-white px-4 py-2 font-bold text-ink disabled:opacity-50"
          >
            {isTesting ? "กำลังทดสอบ..." : "ส่งข้อความทดสอบ"}
          </button>
        </div>
      </fieldset>
    </section>
  );
}
