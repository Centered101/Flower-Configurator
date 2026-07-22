"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Edit3, Eye, X } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { HelpTooltip } from "@/components/HelpTooltip";
import { ImageUploader } from "@/components/ImageUploader";
import { ADMIN_GALLERY_KEY, deleteAdminGalleryItem, fetchAdminGalleryItems, persistAdminGalleryItem, readAdminItems, saveAdminItems, type AdminGalleryItem } from "@/lib/admin-data";
import type { ProcessedImage } from "@/lib/image-processing";

export function AdminGalleryManager() {
  const [items, setItems] = useState<AdminGalleryItem[]>([]);
  const [image, setImage] = useState<ProcessedImage | undefined>();
  const [form, setForm] = useState({ title: "", flower: "", color: "", size: "", price: "", productionScore: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [uploaderKey, setUploaderKey] = useState(0);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    const localItems = readAdminItems<AdminGalleryItem>(ADMIN_GALLERY_KEY);
    setItems(localItems);

    fetchAdminGalleryItems()
      .then((remoteItems) => {
        setItems(remoteItems.length ? remoteItems : localItems);
        saveAdminItems(ADMIN_GALLERY_KEY, remoteItems.length ? remoteItems : localItems);
      })
      .catch((error) => {
        setItems(localItems);
        toast.error(error instanceof Error ? error.message : "โหลดผลงานจาก Supabase ไม่สำเร็จ");
      });
  }, []);

  function resetForm() {
    setForm({ title: "", flower: "", color: "", size: "", price: "", productionScore: "" });
    setImage(undefined);
    setEditingId(null);
    setUploaderKey((current) => current + 1);
  }

  function startEdit(item: AdminGalleryItem) {
    if (isBusy) return;
    setEditingId(item.id);
    setDetailId(item.id);
    setForm({
      title: item.title,
      flower: item.flower,
      color: item.color,
      size: item.size,
      price: String(item.price || ""),
      productionScore: String(item.productionScore || "")
    });
    setImage(item.image);
    setUploaderKey((current) => current + 1);
  }

  async function saveItem() {
    if (isBusy) return;
    if (!form.title.trim()) {
      toast.warning("กรุณาใส่ชื่อผลงาน");
      return;
    }
    setIsBusy(true);

    const galleryItem: AdminGalleryItem = {
      id: editingId ?? crypto.randomUUID(),
      title: form.title.trim(),
      flower: form.flower.trim(),
      color: form.color.trim(),
      size: form.size.trim(),
      price: Number(form.price || 0),
      productionScore: Math.max(1, Number(form.productionScore || 1)),
      image
    };
    try {
      const savedItem = await persistAdminGalleryItem(galleryItem);
      const next = editingId
        ? items.map((item) => item.id === editingId ? savedItem : item)
        : [savedItem, ...items];

      setItems(next);
      saveAdminItems(ADMIN_GALLERY_KEY, next);
      setDetailId(savedItem.id);
      resetForm();
      toast.success(editingId ? "อัปเดตผลงานแล้ว" : "บันทึกผลงานแล้ว");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "บันทึกผลงานไม่สำเร็จ");
    } finally {
      setIsBusy(false);
    }
  }

  async function removeItem(id: string) {
    if (isBusy) return;
    setIsBusy(true);

    try {
      await deleteAdminGalleryItem(id);
      const next = items.filter((item) => item.id !== id);
      setItems(next);
      saveAdminItems(ADMIN_GALLERY_KEY, next);
      if (editingId === id) resetForm();
      if (detailId === id) setDetailId(null);
      toast.success("ลบผลงานแล้ว");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ลบผลงานไม่สำเร็จ");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <fieldset disabled={isBusy} className="grid gap-4 disabled:opacity-75 xl:grid-cols-[420px_1fr]">
      <section className="rounded-bloom border border-pink-100 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-bold text-ink">{editingId ? "แก้ไขผลงาน" : "เพิ่มผลงาน"}</h2>
            {editingId ? <p className="mt-1 text-sm font-semibold text-blossom">กำลังแก้ไขรายการเดิม</p> : null}
          </div>
          {editingId ? (
            <button
              type="button"
              suppressHydrationWarning
              onClick={resetForm}
              className="inline-flex items-center gap-1 rounded-soft border border-pink-200 bg-white px-3 py-2 text-sm font-bold text-ink transition hover:border-blossom hover:bg-blush"
            >
              <X size={16} aria-hidden="true" />
              ยกเลิก
            </button>
          ) : null}
        </div>
        <div className="mt-4 grid gap-3">
          {image ? (
            <div className="rounded-soft border border-pink-100 bg-blush p-3">
              <p className="mb-2 text-sm font-bold text-ink">รูปที่ใช้อยู่</p>
              <div className="relative h-40 overflow-hidden rounded-soft bg-white">
                <Image
                  src={image.url}
                  alt={form.title || "รูปผลงาน"}
                  fill
                  sizes="420px"
                  draggable={false}
                  onContextMenu={(event) => event.preventDefault()}
                  className="select-none object-cover"
                />
              </div>
            </div>
          ) : null}
          <ImageUploader key={uploaderKey} bucket="gallery-images" folder="gallery" onUploaded={setImage} />
          <Input label="ชื่อผลงาน" value={form.title} onChange={(value) => setForm({ ...form, title: value })} />
          <Input label="ชนิดดอกไม้" value={form.flower} onChange={(value) => setForm({ ...form, flower: value })} />
          <Input label="สี" value={form.color} onChange={(value) => setForm({ ...form, color: value })} />
          <Input label="ขนาดช่อ" value={form.size} onChange={(value) => setForm({ ...form, size: value })} />
          <Input label="ราคา" help="ราคาที่ใช้เมื่อกดสั่งซื้อผลงานนี้โดยตรง" value={form.price} onChange={(value) => setForm({ ...form, price: value })} type="number" />
          <Input label="คะแนนการผลิต" help="ใช้คำนวณคิวผลิตและวันรับสินค้าเมื่อสั่งซื้อผลงานนี้" value={form.productionScore} onChange={(value) => setForm({ ...form, productionScore: value })} type="number" />
          <button type="button" suppressHydrationWarning onClick={saveItem} className="touch-target rounded-soft bg-blossom px-4 py-2 font-bold text-white disabled:opacity-60">
            {isBusy ? "กำลังบันทึก..." : editingId ? "บันทึกการแก้ไข" : "บันทึกผลงาน"}
          </button>
        </div>
      </section>

      <section className="space-y-3">
        {items.length ? items.map((item) => (
          <article key={item.id} className={`rounded-bloom border bg-white p-4 shadow-sm ${editingId === item.id ? "border-blossom" : "border-pink-100"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 gap-3">
                {item.image ? (
                  <div className="relative hidden size-20 shrink-0 overflow-hidden rounded-soft bg-blush sm:block">
                    <Image
                      src={item.image.url}
                      alt={item.title}
                      fill
                      sizes="80px"
                      draggable={false}
                      onContextMenu={(event) => event.preventDefault()}
                      className="select-none object-cover"
                    />
                  </div>
                ) : null}
                <div className="min-w-0">
                  <h3 className="font-bold text-ink">{item.title}</h3>
                  <p className="mt-1 text-sm text-zinc-600">{[item.flower, item.color, item.size].filter(Boolean).join(" / ") || "ไม่มีรายละเอียด"}</p>
                  <p className="mt-2 text-sm font-semibold text-blossom">{item.price.toLocaleString("th-TH")} บาท / {Math.max(1, Number(item.productionScore ?? 1)).toLocaleString("th-TH")} คะแนน</p>
                  {item.image ? <p className="mt-1 text-xs text-zinc-500">มีรูปผลงานแล้ว</p> : null}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap justify-end gap-2">
                <button
                  type="button"
                  suppressHydrationWarning
                  onClick={() => setDetailId(detailId === item.id ? null : item.id)}
                  className="inline-flex items-center gap-1 rounded-soft border border-pink-200 px-3 py-2 text-sm font-semibold text-ink transition hover:border-blossom hover:bg-blush disabled:opacity-60"
                >
                  <Eye size={16} aria-hidden="true" />
                  {detailId === item.id ? "ซ่อน" : "ดูรายละเอียด"}
                </button>
                <button
                  type="button"
                  suppressHydrationWarning
                  onClick={() => startEdit(item)}
                  className="inline-flex items-center gap-1 rounded-soft bg-blush px-3 py-2 text-sm font-semibold text-ink transition hover:bg-blossom hover:text-white disabled:opacity-60"
                >
                  <Edit3 size={16} aria-hidden="true" />
                  แก้ไข
                </button>
                <button type="button" suppressHydrationWarning onClick={() => removeItem(item.id)} className="rounded-soft border border-pink-200 px-3 py-2 text-sm font-semibold text-ink disabled:opacity-60">
                  ลบ
                </button>
              </div>
            </div>
            {detailId === item.id ? (
              <div className="mt-4 grid gap-4 rounded-soft border border-pink-100 bg-blush/45 p-4 md:grid-cols-[220px_1fr]">
                {item.image ? (
                  <div className="relative h-52 overflow-hidden rounded-soft bg-white">
                    <Image
                      src={item.image.url}
                      alt={item.title}
                      fill
                      sizes="220px"
                      draggable={false}
                      onContextMenu={(event) => event.preventDefault()}
                      className="select-none object-cover"
                    />
                  </div>
                ) : (
                  <div className="grid h-52 place-items-center rounded-soft bg-white text-sm font-semibold text-zinc-500">
                    ยังไม่มีรูปผลงาน
                  </div>
                )}
                <dl className="grid content-start gap-3 text-sm sm:grid-cols-2">
                  <Detail label="ชื่อผลงาน" value={item.title} />
                  <Detail label="ราคา" value={`${item.price.toLocaleString("th-TH")} บาท`} />
                  <Detail label="คะแนนการผลิต" value={`${Math.max(1, Number(item.productionScore ?? 1)).toLocaleString("th-TH")} คะแนน`} />
                  <Detail label="รายละเอียด" value={[item.flower, item.color, item.size].filter(Boolean).join(" / ") || "ไม่มีรายละเอียด"} wide />
                  {item.image ? (
                    <>
                      <Detail label="ลิงก์รูปภาพ" value={item.image.url} wide />
                      <Detail label="ขนาดรูป" value={`${item.image.width} x ${item.image.height}px`} />
                      <Detail label="ไฟล์" value={`${item.image.format} / ${Math.round(item.image.size / 1024).toLocaleString("th-TH")} KB`} />
                    </>
                  ) : null}
                </dl>
              </div>
            ) : null}
          </article>
        )) : <EmptyState title="ยังไม่มีผลงาน" message="เพิ่มข้อมูลผลงานจากฟอร์มด้านซ้าย" />}
      </section>
    </fieldset>
  );
}

function Detail({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <dt className="text-xs font-semibold text-zinc-500">{label}</dt>
      <dd className="mt-1 break-words font-bold text-ink">{value}</dd>
    </div>
  );
}

function Input({ label, help, value, onChange, type = "text" }: { label: string; help?: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <div className="block">
      <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink">
        {label}
        {help ? <HelpTooltip content={help} /> : null}
      </div>
      <input suppressHydrationWarning aria-label={label} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="touch-target w-full rounded-soft border border-pink-100 px-3" />
    </div>
  );
}
