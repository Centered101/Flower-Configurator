"use client";

import { useEffect, useState } from "react";
import { Clock3, PackageCheck, Plus, Save, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { HelpTooltip } from "@/components/HelpTooltip";
import type { FulfillmentMethod, FulfillmentSettings } from "@/lib/fulfillment-settings";

const emptySettings: FulfillmentSettings = {
  methods: [],
  pickupTimeSlots: [],
  deliveryLeadDays: 2,
  deliveryNote: "",
  fullDateNote: ""
};

function updateMethod(methods: FulfillmentMethod[], id: string, patch: Partial<FulfillmentMethod>) {
  return methods.map((method) => method.id === id ? { ...method, ...patch } : method);
}

function normalizeTimeInput(value: string) {
  return value.trim().slice(0, 5);
}

export function FulfillmentSettingsForm() {
  const [settings, setSettings] = useState<FulfillmentSettings>(emptySettings);
  const [newTimeSlot, setNewTimeSlot] = useState("19:00");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/fulfillment-settings", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: FulfillmentSettings) => setSettings({ ...emptySettings, ...data }))
      .catch(() => {
        setError("โหลดการตั้งค่าวิธีรับสินค้าไม่สำเร็จ");
        toast.error("โหลดการตั้งค่าวิธีรับสินค้าไม่สำเร็จ");
      });
  }, []);

  function addTimeSlot() {
    const slot = normalizeTimeInput(newTimeSlot);
    if (!/^\d{2}:\d{2}$/.test(slot)) {
      toast.error("เวลาไม่ถูกต้อง");
      return;
    }

    setSettings((current) => ({
      ...current,
      pickupTimeSlots: [...new Set([...current.pickupTimeSlots, slot])].sort()
    }));
    toast.success("เพิ่มเวลาแล้ว");
  }

  function removeTimeSlot(slot: string) {
    setSettings((current) => ({
      ...current,
      pickupTimeSlots: current.pickupTimeSlots.filter((item) => item !== slot)
    }));
  }

  async function saveSettings() {
    setError("");
    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/fulfillment-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(settings)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "บันทึกวิธีรับสินค้าไม่สำเร็จ");
      }

      setSettings({ ...emptySettings, ...(data as FulfillmentSettings) });
      toast.success("บันทึกวิธีรับสินค้าแล้ว");
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "บันทึกวิธีรับสินค้าไม่สำเร็จ";
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
          <PackageCheck size={20} />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-ink">วิธีรับสินค้าและเงื่อนไข</h2>
            <HelpTooltip
              title="วิธีรับสินค้า"
              content="ตั้งค่าว่าลูกค้าเลือกแบบไหนได้บ้าง เช่น รับที่ร้าน รับที่โรงเรียน นัดรับ หรือจัดส่ง และกำหนดว่าต้องเลือกวัน เวลา หรือกรอกสถานที่หรือไม่"
            />
          </div>
          <p className="mt-1 text-sm leading-6 text-zinc-600">
            กำหนดวิธีรับสินค้า เวลาที่เปิดให้เลือก และข้อความอธิบายวันที่คิวเต็มหรือการจัดส่ง
          </p>
        </div>
      </div>

      <fieldset disabled={isSaving} className="mt-5 grid gap-5 disabled:opacity-75">
        <section className="rounded-soft border border-pink-100 bg-blush/35 p-4">
          <div className="flex items-center gap-2 font-bold text-ink">
            <Clock3 size={18} className="text-blossom" />
            เวลาที่ลูกค้าเลือกได้
            <HelpTooltip content="เวลานี้จะแสดงในหน้าสั่งซื้อ เฉพาะวิธีรับสินค้าที่ต้องเลือกเวลา เช่น รับที่ร้านหรือรับที่โรงเรียน" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {settings.pickupTimeSlots.map((slot) => (
              <span key={slot} className="inline-flex items-center gap-2 rounded-full border border-pink-100 bg-white px-3 py-2 text-sm font-bold text-ink">
                {slot}
                <button
                  type="button"
                  suppressHydrationWarning
                  onClick={() => removeTimeSlot(slot)}
                  className="text-zinc-400 hover:text-red-600"
                  aria-label={`ลบเวลา ${slot}`}
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-[180px_auto]">
            <input
              suppressHydrationWarning
              type="time"
              value={newTimeSlot}
              onChange={(event) => setNewTimeSlot(event.target.value)}
              className="touch-target rounded-soft border border-pink-100 bg-white px-3 font-bold text-ink"
            />
            <button
              type="button"
              suppressHydrationWarning
              onClick={addTimeSlot}
              className="touch-target inline-flex items-center justify-center gap-2 rounded-soft border border-pink-200 bg-white px-4 py-2 font-bold text-ink hover:bg-blush"
            >
              <Plus size={17} />
              เพิ่มเวลา
            </button>
          </div>
        </section>

        <section className="grid gap-3 lg:grid-cols-2">
          {settings.methods.map((method) => (
            <article key={method.id} className="rounded-soft border border-pink-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <label className="flex min-w-0 items-center gap-2 font-bold text-ink">
                  <input
                    suppressHydrationWarning
                    type="checkbox"
                    checked={method.enabled}
                    onChange={(event) => setSettings((current) => ({
                      ...current,
                      methods: updateMethod(current.methods, method.id, { enabled: event.target.checked })
                    }))}
                    className="size-4 accent-blossom"
                  />
                  <span className="truncate">{method.label}</span>
                </label>
                <div className="flex shrink-0 items-center gap-2">
                  <HelpTooltip
                    content={method.id === "delivery" ? "การจัดส่งไม่ต้องเลือกวันรับ ระบบจะคำนวณวันจัดส่งโดยประมาณจากคิวผลิตและจำนวนวันที่เผื่อจัดส่ง" : "ถ้าเปิดใช้งาน ลูกค้าจะเห็นตัวเลือกนี้ในหน้าสั่งซื้อ"}
                    side="left"
                  />
                  <span className="rounded-full bg-blush px-3 py-1 text-xs font-bold text-blossom">
                    {method.id === "delivery" ? "จัดส่ง" : "รับสินค้า"}
                  </span>
                </div>
              </div>

              <div className="mt-3 grid gap-3">
                <TextField
                  label="ชื่อที่แสดง"
                  value={method.label}
                  onChange={(value) => setSettings((current) => ({
                    ...current,
                    methods: updateMethod(current.methods, method.id, { label: value })
                  }))}
                />
                <TextField
                  label="รายละเอียด"
                  value={method.description}
                  onChange={(value) => setSettings((current) => ({
                    ...current,
                    methods: updateMethod(current.methods, method.id, { description: value })
                  }))}
                />
                <div className="grid gap-2 sm:grid-cols-3">
                  <Toggle label="เลือกวัน" help="เปิดเมื่อวิธีนี้ต้องให้ลูกค้าเลือกวันที่รับสินค้า" checked={method.requiresDate} disabled={method.id === "delivery"} onChange={(checked) => setSettings((current) => ({
                    ...current,
                    methods: updateMethod(current.methods, method.id, { requiresDate: checked })
                  }))} />
                  <Toggle label="เลือกเวลา" help="เปิดเมื่อวิธีนี้ต้องให้ลูกค้าเลือกเวลารับสินค้า" checked={method.requiresTime} disabled={method.id === "delivery"} onChange={(checked) => setSettings((current) => ({
                    ...current,
                    methods: updateMethod(current.methods, method.id, { requiresTime: checked })
                  }))} />
                  <Toggle label="กรอกสถานที่" help="เปิดเมื่อวิธีนี้ต้องมีสถานที่รับหรือที่อยู่จัดส่ง" checked={method.requiresLocation} onChange={(checked) => setSettings((current) => ({
                    ...current,
                    methods: updateMethod(current.methods, method.id, { requiresLocation: checked })
                  }))} />
                </div>
                <TextField
                  label="สถานที่เริ่มต้น"
                  value={method.defaultLocation}
                  placeholder={method.id === "delivery" ? "ปล่อยว่างเพื่อให้ลูกค้ากรอกที่อยู่" : "เช่น หน้าร้าน"}
                  onChange={(value) => setSettings((current) => ({
                    ...current,
                    methods: updateMethod(current.methods, method.id, { defaultLocation: value })
                  }))}
                />
              </div>
            </article>
          ))}
        </section>

        <section className="grid gap-4 rounded-soft border border-pink-100 p-4 lg:grid-cols-[160px_1fr]">
          <TextField
            label="เผื่อจัดส่งกี่วัน"
            help="จำนวนวันที่บวกเพิ่มหลังคิวผลิต เพื่อคาดเดาวันส่งสำหรับวิธีจัดส่ง"
            type="number"
            value={settings.deliveryLeadDays}
            onChange={(value) => setSettings((current) => ({ ...current, deliveryLeadDays: Number(value || 0) }))}
          />
          <TextField
            label="ข้อความสำหรับจัดส่ง"
            help="ข้อความนี้จะแสดงในหน้าสั่งซื้อ เมื่อลูกค้าเลือกจัดส่ง"
            value={settings.deliveryNote}
            onChange={(value) => setSettings((current) => ({ ...current, deliveryNote: value }))}
          />
          <div className="lg:col-span-2">
            <TextField
              label="ข้อความเมื่อวันที่รับเต็ม"
              help="ข้อความนี้ใช้บอกลูกค้าว่าวันที่รับเต็มแล้ว เช่น ให้เลือกวันอื่นหรือทักร้านก่อน"
              value={settings.fullDateNote}
              onChange={(value) => setSettings((current) => ({ ...current, fullDateNote: value }))}
            />
          </div>
        </section>

        {settings.updatedAt ? (
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
          <Save size={18} />
          {isSaving ? "กำลังบันทึก..." : "บันทึกวิธีรับสินค้า"}
        </button>
      </fieldset>
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  help,
  type = "text"
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  help?: string;
  type?: string;
}) {
  return (
    <div className="block">
      <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink">
        {label}
        {help ? <HelpTooltip content={help} /> : null}
      </div>
      <input
        suppressHydrationWarning
        aria-label={label}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="touch-target w-full rounded-soft border border-pink-100 bg-white px-3"
        autoComplete="off"
      />
    </div>
  );
}

function Toggle({ label, help, checked, disabled, onChange }: { label: string; help?: string; checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="touch-target flex items-center justify-between gap-2 rounded-soft border border-pink-100 bg-blush px-3 text-sm font-bold text-ink">
      <span className="inline-flex items-center gap-2">
        {label}
        {help ? <HelpTooltip content={help} /> : null}
      </span>
      <input
        suppressHydrationWarning
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 accent-blossom disabled:opacity-40"
        aria-label={label}
      />
    </div>
  );
}
