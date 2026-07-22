"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { ADMIN_MATERIALS_KEY, readAdminItems, saveAdminItems, type AdminMaterial } from "@/lib/admin-data";

export function AdminMaterialsManager() {
  const [items, setItems] = useState<AdminMaterial[]>([]);
  const [form, setForm] = useState({ name: "", color: "", stock: "", unit: "", alertAt: "", cost: "" });
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    setItems(readAdminItems<AdminMaterial>(ADMIN_MATERIALS_KEY));
  }, []);

  function addItem() {
    if (isBusy) return;
    if (!form.name.trim()) {
      toast.warning("กรุณาใส่ชื่อวัสดุ");
      return;
    }
    setIsBusy(true);
    const next = [{
      id: crypto.randomUUID(),
      name: form.name.trim(),
      color: form.color.trim(),
      stock: Number(form.stock || 0),
      unit: form.unit.trim() || "ชิ้น",
      alertAt: Number(form.alertAt || 0),
      cost: Number(form.cost || 0)
    }, ...items];
    setItems(next);
    saveAdminItems(ADMIN_MATERIALS_KEY, next);
    setForm({ name: "", color: "", stock: "", unit: "", alertAt: "", cost: "" });
    toast.success("บันทึกวัสดุแล้ว");
    window.setTimeout(() => setIsBusy(false), 0);
  }

  function removeItem(id: string) {
    if (isBusy) return;
    setIsBusy(true);
    const next = items.filter((item) => item.id !== id);
    setItems(next);
    saveAdminItems(ADMIN_MATERIALS_KEY, next);
    toast.success("ลบวัสดุแล้ว");
    window.setTimeout(() => setIsBusy(false), 0);
  }

  return (
    <fieldset disabled={isBusy} className="grid gap-4 disabled:opacity-75 xl:grid-cols-[420px_1fr]">
      <section className="rounded-bloom border border-pink-100 bg-white p-4 shadow-sm">
        <h2 className="font-bold text-ink">เพิ่มวัสดุ</h2>
        <div className="mt-4 grid gap-3">
          {[
            ["ชื่อวัสดุ", "name"],
            ["สี", "color"],
            ["จำนวนคงเหลือ", "stock"],
            ["หน่วย", "unit"],
            ["จุดแจ้งเตือน", "alertAt"],
            ["ต้นทุนต่อหน่วย", "cost"]
          ].map(([label, key]) => (
            <label key={key} className="block">
              <span className="mb-1 block text-sm font-semibold text-ink">{label}</span>
              <input
                suppressHydrationWarning
                value={form[key as keyof typeof form]}
                onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                type={["stock", "alertAt", "cost"].includes(key) ? "number" : "text"}
                className="touch-target w-full rounded-soft border border-pink-100 px-3"
              />
            </label>
          ))}
          <button type="button" suppressHydrationWarning onClick={addItem} className="touch-target rounded-soft bg-blossom px-4 py-2 font-bold text-white disabled:opacity-60">
            {isBusy ? "กำลังบันทึก..." : "บันทึกวัสดุ"}
          </button>
        </div>
      </section>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.length ? items.map((item) => (
          <article key={item.id} className="rounded-bloom border border-pink-100 bg-white p-4 shadow-sm">
            <h3 className="font-bold text-ink">{item.name}</h3>
            <p className="mt-1 text-sm text-zinc-600">สี {item.color || "-"}</p>
            <p className="mt-3 text-xl font-bold text-blossom">{item.stock.toLocaleString("th-TH")} {item.unit}</p>
            <p className="mt-1 text-sm text-zinc-500">แจ้งเตือนที่ {item.alertAt} / ต้นทุน {item.cost} บาท</p>
            <button type="button" suppressHydrationWarning onClick={() => removeItem(item.id)} className="mt-4 rounded-soft border border-pink-200 px-3 py-2 text-sm font-semibold disabled:opacity-60">
              ลบ
            </button>
          </article>
        )) : <div className="sm:col-span-2 xl:col-span-3"><EmptyState title="ยังไม่มีวัสดุ" message="เพิ่มข้อมูลวัสดุจากฟอร์มด้านซ้าย" /></div>}
      </section>
    </fieldset>
  );
}
