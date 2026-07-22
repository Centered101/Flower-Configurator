"use client";

import { useEffect, useState } from "react";
import { Globe2, Save, Search, Share2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { HelpTooltip } from "@/components/HelpTooltip";

type SeoSettings = {
  siteTitle: string;
  siteDescription: string;
  siteKeywords: string;
  siteUrl: string;
  canonicalPath: string;
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImageUrl: string;
  themeColor: string;
  robotsIndex: boolean;
  robotsFollow: boolean;
  updatedAt?: string;
};

const emptySettings: SeoSettings = {
  siteTitle: "",
  siteDescription: "",
  siteKeywords: "",
  siteUrl: "",
  canonicalPath: "/",
  ogTitle: "",
  ogDescription: "",
  ogImageUrl: "",
  twitterTitle: "",
  twitterDescription: "",
  twitterImageUrl: "",
  themeColor: "#F48FB1",
  robotsIndex: true,
  robotsFollow: true
};

function updateField<K extends keyof SeoSettings>(settings: SeoSettings, key: K, value: SeoSettings[K]) {
  return { ...settings, [key]: value };
}

export function SeoSettingsForm() {
  const [settings, setSettings] = useState<SeoSettings>(emptySettings);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/seo-settings", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: SeoSettings) => setSettings({ ...emptySettings, ...data }))
      .catch(() => {
        setError("โหลดการตั้งค่า Meta Tags ไม่สำเร็จ");
        toast.error("โหลดการตั้งค่า Meta Tags ไม่สำเร็จ");
      });
  }, []);

  async function saveSettings() {
    setError("");
    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/seo-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(settings)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "บันทึก Meta Tags ไม่สำเร็จ");
      }

      setSettings({ ...emptySettings, ...(data as SeoSettings) });
      toast.success("บันทึก Meta Tags แล้ว");
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "บันทึก Meta Tags ไม่สำเร็จ";
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
          <Search size={20} />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-ink">SEO และ Meta Tags</h2>
            <HelpTooltip
              title="SEO และ Meta Tags"
              content="ใช้กำหนดชื่อเว็บ คำอธิบาย รูปตอนแชร์ลิงก์ และสี theme ของ browser เพื่อให้เว็บอ่านง่ายใน Google และ social preview"
            />
          </div>
          <p className="mt-1 text-sm leading-6 text-zinc-600">
            ใช้กับ Google, Meta Tags Toolkit, Open Graph, Twitter Card และสีแถบบราวเซอร์
          </p>
        </div>
      </div>

      <fieldset disabled={isSaving} className="mt-5 grid gap-5 disabled:opacity-75">
        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <div className="grid gap-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <TextField
                label="ชื่อเว็บไซต์"
                value={settings.siteTitle}
                maxHint={60}
                help="ข้อความหลักที่แสดงบนแท็บ browser และผลค้นหา Google"
                onChange={(value) => setSettings((current) => updateField(current, "siteTitle", value))}
              />
              <TextField
                label="Site URL"
                value={settings.siteUrl}
                placeholder="https://example.com"
                help="โดเมนจริงของเว็บ ใช้สร้าง canonical และรูปแชร์ลิงก์ให้ถูก URL"
                onChange={(value) => setSettings((current) => updateField(current, "siteUrl", value))}
              />
            </div>

            <TextareaField
              label="คำอธิบายเว็บไซต์"
              value={settings.siteDescription}
              maxHint={160}
              help="คำอธิบายสั้น ๆ ที่ช่วยให้คนเข้าใจเว็บจากผลค้นหา"
              onChange={(value) => setSettings((current) => updateField(current, "siteDescription", value))}
            />

            <TextareaField
              label="Keywords คั่นด้วยเครื่องหมาย comma"
              value={settings.siteKeywords}
              placeholder="ดอกไม้ลวดกำมะหยี่, พรีออเดอร์ดอกไม้, ออกแบบดอกไม้"
              help="คำค้นที่เกี่ยวกับร้าน คั่นด้วย comma ไม่ต้องใส่เยอะเกินไป"
              onChange={(value) => setSettings((current) => updateField(current, "siteKeywords", value))}
            />

            <div className="grid gap-4 lg:grid-cols-[1fr_180px]">
              <TextField
                label="Canonical URL หรือ path"
                value={settings.canonicalPath}
                placeholder="/"
                help="URL หลักของหน้า ถ้าไม่แน่ใจให้ใช้ / สำหรับหน้าแรก"
                onChange={(value) => setSettings((current) => updateField(current, "canonicalPath", value))}
              />
              <div className="block">
                <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink">
                  Theme color
                  <HelpTooltip content="สีหลักของ browser/tab ในมือถือ และเป็นสี meta theme-color ของเว็บไซต์" />
                </div>
                <div className="flex items-center gap-2 rounded-soft border border-pink-100 bg-white px-3">
                  <input
                    suppressHydrationWarning
                    type="color"
                    value={settings.themeColor}
                    onChange={(event) => setSettings((current) => updateField(current, "themeColor", event.target.value.toUpperCase()))}
                    className="size-9 shrink-0 rounded-full border-0 bg-transparent p-0"
                    aria-label="เลือกสี Theme color"
                  />
                  <input
                    suppressHydrationWarning
                    aria-label="รหัสสี Theme color"
                    value={settings.themeColor}
                    onChange={(event) => setSettings((current) => updateField(current, "themeColor", event.target.value.toUpperCase()))}
                    className="touch-target min-w-0 flex-1 border-0 bg-transparent font-bold text-ink outline-none"
                    autoComplete="off"
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-3 rounded-soft border border-pink-100 bg-blush/45 p-4 sm:grid-cols-2">
              <div className="flex items-center gap-2 font-semibold text-ink">
                <input
                  suppressHydrationWarning
                  type="checkbox"
                  checked={settings.robotsIndex}
                  onChange={(event) => setSettings((current) => updateField(current, "robotsIndex", event.target.checked))}
                  aria-label="ให้ Google เก็บหน้าเว็บ"
                />
                ให้ Google เก็บหน้าเว็บ
                <HelpTooltip content="ถ้าปิด Google จะถูกบอกว่าไม่ควรเก็บหน้านี้ในผลค้นหา" />
              </div>
              <div className="flex items-center gap-2 font-semibold text-ink">
                <input
                  suppressHydrationWarning
                  type="checkbox"
                  checked={settings.robotsFollow}
                  onChange={(event) => setSettings((current) => updateField(current, "robotsFollow", event.target.checked))}
                  aria-label="ให้ bot ตามลิงก์ในเว็บ"
                />
                ให้ bot ตามลิงก์ในเว็บ
                <HelpTooltip content="ถ้าปิด bot จะถูกบอกว่าไม่ควรตามลิงก์จากหน้านี้ไปหน้าอื่น" />
              </div>
            </div>

            <section className="grid gap-4 rounded-soft border border-pink-100 p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-blossom">
                <Share2 size={16} />
                ข้อมูลตอนแชร์ลิงก์
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <TextField label="Open Graph Title" value={settings.ogTitle} maxHint={60} help="ชื่อที่แสดงเมื่อแชร์ลิงก์ใน LINE, Facebook หรือแอปอื่น" onChange={(value) => setSettings((current) => updateField(current, "ogTitle", value))} />
                <TextField label="Open Graph Image" value={settings.ogImageUrl} placeholder="/favicon.png หรือ https://..." help="รูปตัวอย่างเมื่อแชร์ลิงก์ แนะนำ 1200x630 px" onChange={(value) => setSettings((current) => updateField(current, "ogImageUrl", value))} />
              </div>
              <TextareaField label="Open Graph Description" value={settings.ogDescription} maxHint={160} help="คำอธิบายที่แสดงใต้ชื่อเมื่อแชร์ลิงก์" onChange={(value) => setSettings((current) => updateField(current, "ogDescription", value))} />
              <div className="grid gap-4 lg:grid-cols-2">
                <TextField label="Twitter Title" value={settings.twitterTitle} maxHint={60} help="ชื่อที่แสดงใน Twitter/X Card" onChange={(value) => setSettings((current) => updateField(current, "twitterTitle", value))} />
                <TextField label="Twitter Image" value={settings.twitterImageUrl} placeholder="/favicon.png หรือ https://..." help="รูปสำหรับ Twitter/X Card ถ้าไม่ใส่จะใช้ Open Graph Image" onChange={(value) => setSettings((current) => updateField(current, "twitterImageUrl", value))} />
              </div>
              <TextareaField label="Twitter Description" value={settings.twitterDescription} maxHint={160} help="คำอธิบายสำหรับ Twitter/X Card" onChange={(value) => setSettings((current) => updateField(current, "twitterDescription", value))} />
            </section>
          </div>

          <aside className="space-y-3">
            <div className="rounded-soft border border-pink-100 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-sm font-bold text-blossom">
                <Globe2 size={16} />
                ตัวอย่างผลค้นหา
                <HelpTooltip content="ตัวอย่างคร่าว ๆ ว่าชื่อเว็บและคำอธิบายจะดูเป็นอย่างไรในผลค้นหา" side="left" />
              </div>
              <p className="text-xs text-green-700">{settings.siteUrl || "https://example.com"}</p>
              <p className="mt-1 text-lg font-bold leading-6 text-blue-700">{settings.siteTitle || "ชื่อเว็บไซต์"}</p>
              <p className="mt-1 text-sm leading-6 text-zinc-600">{settings.siteDescription || "คำอธิบายเว็บไซต์"}</p>
            </div>

            <div className="overflow-hidden rounded-soft border border-pink-100 bg-white shadow-sm">
              <div className="grid aspect-[1.91/1] place-items-center bg-blush text-sm font-bold text-blossom">
                {settings.ogImageUrl ? "รูปแชร์ลิงก์" : "ยังไม่ได้ใส่รูปแชร์"}
              </div>
              <div className="p-4">
                <p className="text-sm font-bold text-ink">{settings.ogTitle || settings.siteTitle || "Open Graph Title"}</p>
                <p className="mt-1 text-xs leading-5 text-zinc-600">{settings.ogDescription || settings.siteDescription || "Open Graph Description"}</p>
              </div>
            </div>

            {settings.updatedAt ? (
              <p className="inline-flex items-center gap-2 text-sm text-zinc-600">
                <ShieldCheck size={16} className="text-stem" />
                อัปเดตล่าสุด {new Date(settings.updatedAt).toLocaleString("th-TH")}
              </p>
            ) : null}
          </aside>
        </div>

        {error ? <p className="rounded-soft bg-red-50 p-3 text-sm text-red-600">{error}</p> : null}

        <button
          type="button"
          suppressHydrationWarning
          onClick={saveSettings}
          disabled={isSaving}
          className="touch-target inline-flex items-center justify-center gap-2 rounded-soft bg-blossom px-4 py-2 font-bold text-white disabled:opacity-50"
        >
          <Save size={18} />
          {isSaving ? "กำลังบันทึก..." : "บันทึก Meta Tags"}
        </button>
      </fieldset>
    </section>
  );
}

function TextField({
  label,
  value,
  placeholder,
  maxHint,
  help,
  onChange
}: {
  label: string;
  value: string;
  placeholder?: string;
  maxHint?: number;
  help?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="block">
      <div className="mb-1 flex items-center justify-between gap-3 text-sm font-semibold text-ink">
        <span className="inline-flex items-center gap-2">
          {label}
          {help ? <HelpTooltip content={help} /> : null}
        </span>
        {maxHint ? <span className="text-xs text-zinc-500">{value.length}/{maxHint}</span> : null}
      </div>
      <input
        suppressHydrationWarning
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="touch-target w-full rounded-soft border border-pink-100 px-3"
        autoComplete="off"
      />
    </div>
  );
}

function TextareaField({
  label,
  value,
  placeholder,
  maxHint,
  help,
  onChange
}: {
  label: string;
  value: string;
  placeholder?: string;
  maxHint?: number;
  help?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="block">
      <div className="mb-1 flex items-center justify-between gap-3 text-sm font-semibold text-ink">
        <span className="inline-flex items-center gap-2">
          {label}
          {help ? <HelpTooltip content={help} /> : null}
        </span>
        {maxHint ? <span className="text-xs text-zinc-500">{value.length}/{maxHint}</span> : null}
      </div>
      <textarea
        suppressHydrationWarning
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-24 w-full rounded-soft border border-pink-100 p-3"
      />
    </div>
  );
}
