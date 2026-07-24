"use client";

import { useEffect, useState } from "react";
import { Copy, ImagePlus, LinkIcon, Upload } from "lucide-react";
import { toast } from "sonner";
import { HelpTooltip } from "@/components/HelpTooltip";
import type { ProcessedImage } from "@/lib/image-processing";

export function ImageUploader({ bucket = "order-reference-images", folder = "order-references", onUploaded }: { bucket?: string; folder?: string; onUploaded?: (image: ProcessedImage) => void }) {
  const [imageUrl, setImageUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [result, setResult] = useState<ProcessedImage | null>(null);
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  function normalizeImageUrl(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return "";
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  }

  useEffect(() => {
    const normalizedUrl = normalizeImageUrl(imageUrl);
    try {
      const url = new URL(normalizedUrl);
      setPreviewUrl(url.protocol === "http:" || url.protocol === "https:" ? normalizedUrl : result?.url ?? "");
    } catch {
      setPreviewUrl(result?.url ?? "");
    }
  }, [imageUrl, result?.url]);

  async function uploadImage(formData: FormData) {
    setError("");
    setResult(null);
    setIsCopied(false);
    setIsUploading(true);

    try {
      const response = await fetch("/api/images", {
        method: "POST",
        body: formData
      });
      const data = await response.json().catch(() => null) as (ProcessedImage & { error?: string }) | null;

      if (!response.ok || !data) {
        throw new Error(data?.error ?? "อัปโหลดรูปภาพไม่สำเร็จ");
      }

      setResult(data);
      setPreviewUrl(data.url);
      onUploaded?.(data);
      toast.success("อัปโหลดรูปภาพสำเร็จ");
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "อัปโหลดรูปภาพไม่สำเร็จ";
      setError(message);
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  }

  function uploadFile(file: File | undefined) {
    if (!file) return;
    const formData = new FormData();
    formData.set("file", file);
    formData.set("bucket", bucket);
    formData.set("folder", folder);
    void uploadImage(formData);
  }

  function uploadUrl() {
    if (!imageUrl.trim()) {
      setError("กรุณาใส่ลิงก์รูปภาพ");
      toast.warning("กรุณาใส่ลิงก์รูปภาพ");
      return;
    }
    const formData = new FormData();
    formData.set("imageUrl", normalizeImageUrl(imageUrl));
    formData.set("bucket", bucket);
    formData.set("folder", folder);
    void uploadImage(formData);
  }

  async function copyUrl() {
    if (!result?.url) return;
    try {
      await navigator.clipboard.writeText(result.url);
      setIsCopied(true);
      toast.success("คัดลอกลิงก์รูปภาพแล้ว");
    } catch {
      toast.error("คัดลอกลิงก์ไม่สำเร็จ กรุณาคัดลอกด้วยตัวเอง");
    }
  }

  return (
    <fieldset disabled={isUploading} className="space-y-3 disabled:opacity-75">
      <div className="mb-3 flex items-center gap-2 font-bold text-ink">
        <ImagePlus className="text-blossom" size={20} />
        รูปตัวอย่าง
        <HelpTooltip content="อัปโหลดไฟล์จากเครื่องหรือใส่ URL รูปภาพ ระบบฝั่ง server จะตรวจชนิดไฟล์ แปลงเป็น webp/avif และตั้งชื่อไฟล์ใหม่ก่อนบันทึก" />
      </div>

      <label className="touch-target inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-soft bg-blossom px-4 py-2 font-bold text-white has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
        <input
          suppressHydrationWarning
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/svg+xml,.jpg,.jpeg,.png,.webp,.avif,.svg"
          onChange={(event) => uploadFile(event.target.files?.[0])}
          className="sr-only"
          disabled={isUploading}
        />
          <Upload size={17} />
        {isUploading ? "กำลังอัปโหลด..." : "อัปโหลดรูป"}
      </label>

      <div className="space-y-2">
        <div className="mb-2 flex items-center gap-2 text-sm font-bold text-ink">
          <LinkIcon size={17} className="text-blossom" />
          หรือใส่ลิงก์รูปภาพ
          <HelpTooltip content="ใส่ลิงก์รูปภาพภายนอกได้ ระบบจะโหลดรูป ตรวจว่าเป็นรูปจริง และป้องกัน URL ภายในอย่าง localhost/private IP" />
        </div>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <input
            suppressHydrationWarning
            type="url"
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
            placeholder="https://example.com/image.png"
            className="touch-target w-full rounded-soft border border-pink-100 bg-white px-3"
          />
          <button
            suppressHydrationWarning
            type="button"
            onClick={uploadUrl}
            disabled={isUploading}
            className="touch-target rounded-soft bg-ink px-4 py-2 font-bold text-white disabled:opacity-50"
          >
            บันทึกลิงก์
          </button>
        </div>
      </div>

      {previewUrl ? (
        <div className="mt-4 overflow-hidden rounded-soft border border-pink-100">
          <img
            src={previewUrl}
            alt="ตัวอย่างรูปภาพก่อนอัปโหลด"
            draggable={false}
            onContextMenu={(event) => event.preventDefault()}
            className="max-h-72 w-full select-none object-contain"
          />
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {result ? (
        <div className="mt-3 space-y-3 rounded-soft bg-blush p-3 text-sm text-zinc-700">
          <p className="font-semibold text-ink">อัปโหลดสำเร็จ</p>
          <p>{result.width} x {result.height}px / {result.format} / {Math.round(result.size / 1024)} KB</p>
          <div>
            <span className="mb-1 block text-xs font-semibold text-zinc-500">ลิงก์รูปภาพ</span>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <input suppressHydrationWarning readOnly value={result.url} className="touch-target w-full rounded-soft border border-pink-100 bg-white px-3 text-ink" />
              <button suppressHydrationWarning type="button" onClick={copyUrl} className="touch-target inline-flex items-center justify-center gap-2 rounded-soft bg-white px-4 py-2 font-bold text-ink">
                <Copy size={16} />
                {isCopied ? "คัดลอกแล้ว" : "คัดลอก"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </fieldset>
  );
}
