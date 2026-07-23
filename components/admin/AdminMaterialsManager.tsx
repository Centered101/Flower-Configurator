"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import {
  ADMIN_MATERIALS_KEY,
  deleteAdminMaterial,
  fetchAdminMaterials,
  fetchOptionMaterialLinks,
  persistAdminMaterial,
  readAdminItems,
  saveAdminItems,
  type AdminMaterial,
  type DesignOptionMaterialLink
} from "@/lib/admin-data";
import { fetchConfiguratorCatalog, getDefaultConfiguratorCatalog, type ConfiguratorCatalog } from "@/lib/configurator-catalog";

type MaterialForm = {
  id: string;
  name: string;
  color: string;
  stock: string;
  unit: string;
  alertAt: string;
  cost: string;
  supplier: string;
};

const emptyForm: MaterialForm = {
  id: "",
  name: "",
  color: "",
  stock: "",
  unit: "",
  alertAt: "",
  cost: "",
  supplier: ""
};

export function AdminMaterialsManager() {
  const [items, setItems] = useState<AdminMaterial[]>([]);
  const [catalog, setCatalog] = useState<ConfiguratorCatalog>(() => getDefaultConfiguratorCatalog());
  const [materialLinks, setMaterialLinks] = useState<DesignOptionMaterialLink[]>([]);
  const [form, setForm] = useState<MaterialForm>(emptyForm);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const cached = readAdminItems<AdminMaterial>(ADMIN_MATERIALS_KEY);
    setItems(cached);

    fetchAdminMaterials()
      .then((materials) => {
        if (!isMounted) return;
        setItems(materials);
        saveAdminItems(ADMIN_MATERIALS_KEY, materials);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "โหลดวัสดุจากฐานข้อมูลไม่สำเร็จ");
      });

    fetchOptionMaterialLinks()
      .then((links) => {
        if (!isMounted) return;
        setMaterialLinks(links);
      })
      .catch(() => undefined);

    fetchConfiguratorCatalog()
      .then((nextCatalog) => {
        if (!isMounted) return;
        setCatalog(nextCatalog);
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, []);

  async function saveItem() {
    if (isBusy) return;
    if (!form.name.trim()) {
      toast.warning("กรุณาใส่ชื่อวัสดุ");
      return;
    }

    setIsBusy(true);

    try {
      const saved = await persistAdminMaterial({
        id: form.id || crypto.randomUUID(),
        name: form.name.trim(),
        color: form.color.trim(),
        stock: Number(form.stock || 0),
        unit: form.unit.trim() || "ชิ้น",
        alertAt: Number(form.alertAt || 0),
        cost: Number(form.cost || 0),
        supplier: form.supplier.trim(),
        status: "active"
      });
      const next = [saved, ...items.filter((item) => item.id !== saved.id)];
      setItems(next);
      saveAdminItems(ADMIN_MATERIALS_KEY, next);
      setForm(emptyForm);
      toast.success(form.id ? "อัปเดตวัสดุแล้ว" : "บันทึกวัสดุแล้ว");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "บันทึกวัสดุไม่สำเร็จ");
    } finally {
      setIsBusy(false);
    }
  }

  function editItem(item: AdminMaterial) {
    setForm({
      id: item.id,
      name: item.name,
      color: item.color,
      stock: String(item.stock),
      unit: item.unit,
      alertAt: String(item.alertAt),
      cost: String(item.cost),
      supplier: item.supplier ?? ""
    });
  }

  async function removeItem(id: string) {
    if (isBusy) return;
    setIsBusy(true);

    try {
      await deleteAdminMaterial(id);
      const next = items.filter((item) => item.id !== id);
      setItems(next);
      saveAdminItems(ADMIN_MATERIALS_KEY, next);
      if (form.id === id) setForm(emptyForm);
      toast.success("ลบวัสดุแล้ว");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ลบวัสดุไม่สำเร็จ");
    } finally {
      setIsBusy(false);
    }
  }

  function optionName(link: DesignOptionMaterialLink) {
    if (link.optionType === "product_type") return catalog.productTypes.find((item) => item.id === link.optionId)?.name;
    if (link.optionType === "flower_type") return catalog.flowerTypes.find((item) => item.id === link.optionId)?.name;
    if (link.optionType === "color") return catalog.colors.find((item) => item.id === link.optionId)?.name;
    if (link.optionType === "wrapping") return catalog.wrappingOptions[link.optionId]?.name;
    if (link.optionType === "ribbon") return catalog.ribbonOptions[link.optionId]?.name;
    if (link.optionType === "decoration") return catalog.decorationOptions[link.optionId]?.name;
    return (
      catalog.stems.strengths[link.optionId]?.name ??
      catalog.stems.styles[link.optionId]?.name ??
      catalog.stems.lengths[link.optionId]?.name ??
      catalog.stems.colors[link.optionId]?.name
    );
  }

  function usageLabels(materialId: string) {
    return materialLinks
      .filter((link) => link.materialId === materialId)
      .map((link) => optionName(link) ?? link.optionId)
      .filter(Boolean);
  }

  return (
    <fieldset disabled={isBusy} className="grid gap-4 disabled:opacity-75 xl:grid-cols-[420px_1fr]">
      <section className="rounded-bloom border border-pink-100 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-bold text-ink">{form.id ? "แก้ไขวัสดุ" : "เพิ่มวัสดุ"}</h2>
            <p className="mt-1 text-sm text-zinc-600">เพิ่มวัสดุครั้งเดียว แล้วไปเลือกใช้ในหน้าตัวเลือกออกแบบ</p>
          </div>
          {form.id ? (
            <button type="button" onClick={() => setForm(emptyForm)} className="rounded-full border border-pink-200 px-3 py-1 text-sm font-bold text-ink">
              ยกเลิก
            </button>
          ) : null}
        </div>
        <div className="mt-4 grid gap-3">
          {[
            ["ชื่อวัสดุ", "name"],
            ["สี", "color"],
            ["จำนวนคงเหลือ", "stock"],
            ["หน่วย", "unit"],
            ["จุดแจ้งเตือน", "alertAt"],
            ["ต้นทุนต่อหน่วย", "cost"],
            ["ผู้ขาย/แหล่งซื้อ", "supplier"]
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
          <button type="button" suppressHydrationWarning onClick={saveItem} className="touch-target rounded-soft bg-blossom px-4 py-2 font-bold text-white disabled:opacity-60">
            {isBusy ? "กำลังบันทึก..." : form.id ? "อัปเดตวัสดุ" : "บันทึกวัสดุ"}
          </button>
        </div>
      </section>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.length ? items.map((item) => (
          <article key={item.id} className="rounded-bloom border border-pink-100 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-ink">{item.name}</h3>
                <p className="mt-1 text-sm text-zinc-600">สี {item.color || "-"}</p>
              </div>
              {item.stock <= item.alertAt ? <span className="rounded-full bg-yellow-50 px-2 py-1 text-xs font-bold text-yellow-700">ใกล้หมด</span> : null}
            </div>
            <p className="mt-3 text-xl font-bold text-blossom">{item.stock.toLocaleString("th-TH")} {item.unit}</p>
            <p className="mt-1 text-sm text-zinc-500">แจ้งเตือนที่ {item.alertAt} / ต้นทุน {item.cost} บาท</p>
            {item.supplier ? <p className="mt-1 text-sm text-zinc-500">แหล่งซื้อ {item.supplier}</p> : null}
            <p className="mt-3 rounded-soft bg-blush px-3 py-2 text-xs font-semibold text-zinc-600">
              {usageLabels(item.id).length ? `ใช้กับ: ${usageLabels(item.id).slice(0, 4).join(", ")}${usageLabels(item.id).length > 4 ? "..." : ""}` : "ยังไม่ได้ผูกกับตัวเลือกออกแบบ"}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" suppressHydrationWarning onClick={() => editItem(item)} className="rounded-soft bg-blush px-3 py-2 text-sm font-bold text-ink disabled:opacity-60">
                แก้ไข
              </button>
              <button type="button" suppressHydrationWarning onClick={() => removeItem(item.id)} className="rounded-soft border border-pink-200 px-3 py-2 text-sm font-bold disabled:opacity-60">
                ลบ
              </button>
            </div>
          </article>
        )) : <div className="sm:col-span-2 xl:col-span-3"><EmptyState title="ยังไม่มีวัสดุ" message="เพิ่มข้อมูลวัสดุจากฟอร์มด้านซ้าย" /></div>}
      </section>
    </fieldset>
  );
}
