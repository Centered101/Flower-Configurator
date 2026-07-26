"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { ArrowDown, ArrowUp, Pipette, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { HelpTooltip } from "@/components/HelpTooltip";
import { ImageUploader } from "@/components/ImageUploader";
import {
  fetchAdminMaterials,
  fetchOptionMaterialLinksState,
  OptionalSchemaMissingError,
  persistOptionMaterialLinks,
  type AdminMaterial,
  type DesignOptionMaterialLink
} from "@/lib/admin-data";
import {
  getDefaultConfiguratorCatalog,
  fetchConfiguratorCatalog,
  hasConfiguratorCatalogData,
  persistConfiguratorCatalog,
  readAdminConfiguratorCatalog,
  saveAdminConfiguratorCatalog,
  type ConfiguratorCatalog
} from "@/lib/configurator-catalog";
import type { DecorationId, RibbonId, WrapId } from "@/lib/types";

type TabId = "products" | "flowers" | "colors" | "stems" | "arrangement" | "decorations" | "review";
type ListKey = "productTypes" | "flowerTypes" | "colors";
type StemCategory = keyof ConfiguratorCatalog["stems"];

type EyeDropperConstructor = new () => {
  open: () => Promise<{ sRGBHex: string }>;
};

const tabs: { id: TabId; label: string }[] = [
  { id: "products", label: "1. ประเภทสินค้า" },
  { id: "flowers", label: "2. ชนิดดอกไม้" },
  { id: "colors", label: "3. จำนวนและสี" },
  { id: "stems", label: "4. ก้าน" },
  { id: "arrangement", label: "5. การจัดช่อ" },
  { id: "decorations", label: "6. ของตกแต่ง" },
  { id: "review", label: "7. ตรวจสอบ" }
];

const tabHelps: Record<TabId, string> = {
  products: "ประเภทสินค้านี้ใช้เป็นตัวเลือกเริ่มต้นในหน้าออกแบบ แยกจากสินค้าพร้อมสั่งซื้อ",
  flowers: "ชนิดดอกไม้กำหนดว่าลูกค้าเลือกดอกอะไรได้ และสต็อกวัสดุช่วยบอกความพร้อมในการผลิต",
  colors: "สีดอกไม้ใช้กับภาพตัวอย่างและตัวเลือกสีของลูกค้าในหน้าออกแบบ",
  stems: "ตัวเลือกก้านมีผลกับภาพตัวอย่าง ราคา และรายละเอียดงานที่ลูกค้าสั่ง",
  arrangement: "การจัดช่อและริบบิ้นคือวิธีห่อหรือผูกงาน เพิ่มราคาได้ตามตัวเลือก",
  decorations: "ของตกแต่งเป็นตัวเลือกเสริม เช่น การ์ด กล่อง หรือของแนบเพิ่มเติม",
  review: "ข้อความหมายเหตุจะแสดงในขั้นตรวจสอบก่อนลูกค้ากดไปหน้าสั่งซื้อ"
};

function toNumber(value: string) {
  return Number(value || 0);
}

function makeId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export function AdminConfiguratorManager() {
  const [activeTab, setActiveTab] = useState<TabId>("products");
  const [catalog, setCatalog] = useState<ConfiguratorCatalog>(() => getDefaultConfiguratorCatalog());
  const [materials, setMaterials] = useState<AdminMaterial[]>([]);
  const [materialLinks, setMaterialLinks] = useState<DesignOptionMaterialLink[]>([]);
  const [isMaterialLinkSchemaReady, setIsMaterialLinkSchemaReady] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const localCatalog = readAdminConfiguratorCatalog();
    setCatalog(localCatalog);
    fetchConfiguratorCatalog()
      .then((remoteCatalog) => {
        if (hasConfiguratorCatalogData(remoteCatalog) || !hasConfiguratorCatalogData(localCatalog)) {
          setCatalog(remoteCatalog);
          return;
        }

        toast.warning("ข้อมูลตัวเลือกออกแบบยังว่าง ใช้ข้อมูลในเครื่องชั่วคราว");
      })
      .catch(() => toast.warning("ยังเชื่อมข้อมูลในระบบไม่ได้ ใช้ข้อมูลในเครื่องชั่วคราว"));

    fetchAdminMaterials()
      .then(setMaterials)
      .catch(() => toast.warning("ยังโหลดสต็อกวัสดุไม่ได้"));
    fetchOptionMaterialLinksState()
      .then(({ links, schemaReady }) => {
        setMaterialLinks(links);
        setIsMaterialLinkSchemaReady(schemaReady);
        if (!schemaReady) {
          toast.warning("ยังใช้ระบบเชื่อมวัสดุไม่ได้ กรุณาอัปเดตโครงสร้างฐานข้อมูลก่อน");
        }
      })
      .catch(() => undefined);
  }, []);

  function updateList<T extends ListKey>(key: T, index: number, patch: Partial<ConfiguratorCatalog[T][number]>) {
    setCatalog((current) => {
      const next = structuredClone(current) as ConfiguratorCatalog;
      next[key][index] = { ...next[key][index], ...patch } as ConfiguratorCatalog[T][number];
      return next;
    });
  }

  function addProductType() {
    setCatalog((current) => ({
      ...current,
      productTypes: [
        ...current.productTypes,
        {
          id: makeId("product"),
          name: "",
          description: "",
          price: 0,
          baseQuantity: 1,
          productionScore: 1,
          productionDays: 1,
          imageTone: "#FCE4EC"
        }
      ]
    }));
    toast.success("เพิ่มประเภทสินค้าแล้ว");
  }

  function addFlowerType() {
    setCatalog((current) => ({
      ...current,
      flowerTypes: [
        ...current.flowerTypes,
        {
          id: makeId("flower"),
          name: "",
          englishName: "",
          description: "",
          price: 0,
          available: true,
          materialStock: 0
        }
      ]
    }));
    toast.success("เพิ่มชนิดดอกไม้แล้ว");
  }

  function addColor() {
    setCatalog((current) => ({
      ...current,
      colors: [
        ...current.colors,
        {
          id: makeId("color"),
          name: "",
          hex: "#FFFFFF",
          price: 0,
          inStock: true,
          tone: "soft"
        }
      ]
    }));
    toast.success("เพิ่มสีแล้ว");
  }

  function removeListItem(key: ListKey, id: string) {
    setCatalog((current) => ({
      ...current,
      [key]: current[key].filter((item) => item.id !== id)
    }));
    toast.success("ลบรายการแล้ว");
  }

  function moveListItem(key: ListKey, index: number, direction: -1 | 1) {
    setCatalog((current) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= current[key].length) return current;

      const next = structuredClone(current) as ConfiguratorCatalog;
      const items = next[key];
      [items[index], items[targetIndex]] = [items[targetIndex], items[index]];
      return next;
    });
  }

  function updateRecord<T extends keyof Pick<ConfiguratorCatalog, "wrappingOptions" | "ribbonOptions" | "decorationOptions">>(
    key: T,
    id: keyof ConfiguratorCatalog[T],
    patch: Record<string, unknown>
  ) {
    setCatalog((current) => {
      const next = structuredClone(current) as ConfiguratorCatalog;
      Object.assign((next[key] as Record<string, object>)[String(id)], patch);
      return next;
    });
  }

  function addRecord<T extends keyof Pick<ConfiguratorCatalog, "wrappingOptions" | "ribbonOptions" | "decorationOptions">>(
    key: T,
    item: ConfiguratorCatalog[T][string]
  ) {
    setCatalog((current) => {
      const next = structuredClone(current) as ConfiguratorCatalog;
      (next[key] as Record<string, ConfiguratorCatalog[T][string]>)[item.id] = item;
      return next;
    });
    toast.success("เพิ่มตัวเลือกแล้ว");
  }

  function removeRecord<T extends keyof Pick<ConfiguratorCatalog, "wrappingOptions" | "ribbonOptions" | "decorationOptions">>(key: T, id: string) {
    setCatalog((current) => {
      const next = structuredClone(current) as ConfiguratorCatalog;
      delete (next[key] as Record<string, unknown>)[id];
      return next;
    });
    toast.success("ลบตัวเลือกแล้ว");
  }

  function updateStem(category: StemCategory, id: string, patch: Record<string, unknown>) {
    setCatalog((current) => {
      const next = structuredClone(current) as ConfiguratorCatalog;
      Object.assign((next.stems[category] as Record<string, object>)[id], patch);
      return next;
    });
  }

  function addStem(category: StemCategory) {
    const id = makeId(`stem-${category}`);
    setCatalog((current) => {
      const next = structuredClone(current) as ConfiguratorCatalog;
      const group = next.stems[category] as Record<string, { id: string; name: string; description?: string; price: number; hex?: string }>;

      group[id] = category === "colors"
        ? { id, name: "", price: 0, hex: "#FFFFFF" }
        : { id, name: "", description: "", price: 0 };

      return next;
    });
    toast.success("เพิ่มตัวเลือกก้านแล้ว");
  }

  function removeStem(category: StemCategory, id: string) {
    setCatalog((current) => {
      const next = structuredClone(current) as ConfiguratorCatalog;
      delete (next.stems[category] as Record<string, unknown>)[id];
      return next;
    });
    toast.success("ลบตัวเลือกก้านแล้ว");
  }

  function updateMaterialLinks(optionType: DesignOptionMaterialLink["optionType"], optionId: string, links: DesignOptionMaterialLink[]) {
    setMaterialLinks((current) => [
      ...current.filter((link) => link.optionType !== optionType || link.optionId !== optionId),
      ...links
    ]);
  }

  function getMaterialLinks(optionType: DesignOptionMaterialLink["optionType"], optionId: string) {
    return materialLinks.filter((link) => link.optionType === optionType && link.optionId === optionId);
  }

  function getLiveOptionIds() {
    return new Set([
      ...catalog.productTypes.map((item) => `product_type:${item.id}`),
      ...catalog.flowerTypes.map((item) => `flower_type:${item.id}`),
      ...catalog.colors.map((item) => `color:${item.id}`),
      ...Object.keys(catalog.stems.strengths).map((id) => `stem:${id}`),
      ...Object.keys(catalog.stems.styles).map((id) => `stem:${id}`),
      ...Object.keys(catalog.stems.lengths).map((id) => `stem:${id}`),
      ...Object.keys(catalog.stems.colors).map((id) => `stem:${id}`),
      ...Object.keys(catalog.wrappingOptions).map((id) => `wrapping:${id}`),
      ...Object.keys(catalog.ribbonOptions).map((id) => `ribbon:${id}`),
      ...Object.keys(catalog.decorationOptions).map((id) => `decoration:${id}`)
    ]);
  }

  async function save() {
    setIsSaving(true);
    saveAdminConfiguratorCatalog(catalog);

    try {
      const savedCatalog = await persistConfiguratorCatalog(catalog);
      const liveOptionIds = getLiveOptionIds();
      const nextLinks = materialLinks.filter((link) => liveOptionIds.has(`${link.optionType}:${link.optionId}`));
      let savedLinks = nextLinks;
      let savedMaterialLinks = false;

      if (isMaterialLinkSchemaReady) {
        try {
          savedLinks = await persistOptionMaterialLinks(nextLinks);
          savedMaterialLinks = true;
        } catch (error) {
          if (!(error instanceof OptionalSchemaMissingError)) throw error;

          setIsMaterialLinkSchemaReady(false);
        }
      }

      setCatalog(savedCatalog);
      setMaterialLinks(savedLinks);
      saveAdminConfiguratorCatalog(savedCatalog);
      toast.success(savedMaterialLinks ? "บันทึกตัวเลือกและวัสดุที่ใช้แล้ว" : "บันทึกตัวเลือกแล้ว");

      if (!savedMaterialLinks && nextLinks.length) {
        toast.warning("ยังบันทึกวัสดุที่ใช้ไม่ได้ กรุณาอัปเดตโครงสร้างฐานข้อมูลก่อน");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "บันทึกลงระบบไม่สำเร็จ แต่เก็บไว้ในเครื่องแล้ว");
    } finally {
      setIsSaving(false);
    }
  }

  function reset() {
    const defaults = getDefaultConfiguratorCatalog();
    setCatalog(defaults);
    saveAdminConfiguratorCatalog(defaults);
    toast.success("รีเซ็ตกลับค่าเริ่มต้นแล้ว");
  }

  return (
    <fieldset disabled={isSaving} className="space-y-4 disabled:opacity-75">
      <div className="flex flex-wrap gap-2 rounded-bloom border border-pink-100 bg-white p-3 shadow-sm">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`touch-target rounded-soft px-3 py-2 text-sm font-semibold ${
              activeTab === tab.id ? "bg-blossom text-white" : "bg-blush text-ink"
            }`}
          >
            {tab.label}
          </button>
        ))}
        <HelpTooltip title={tabs.find((tab) => tab.id === activeTab)?.label} content={tabHelps[activeTab]} side="left" className="ml-auto" />
      </div>

      <section className="rounded-bloom border border-pink-100 bg-white p-4 shadow-sm">
        {activeTab === "products" ? (
          <div className="space-y-3">
            <button type="button" onClick={addProductType} className="touch-target rounded-soft bg-blossom px-4 py-2 font-bold text-white">
              เพิ่มประเภทสินค้า
            </button>
            {catalog.productTypes.map((item, index) => (
              <div key={item.id} className="admin-option-card space-y-3 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-pink-100 pb-3">
                  <div>
                    <p className="text-sm font-bold text-ink">ลำดับที่ {index + 1}</p>
                    <p className="text-xs font-semibold text-zinc-500">ใช้เรียงการแสดงผลในหน้าออกแบบ</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <MoveButton label="ขึ้น" icon="up" disabled={index === 0} onClick={() => moveListItem("productTypes", index, -1)} />
                    <MoveButton label="ลง" icon="down" disabled={index === catalog.productTypes.length - 1} onClick={() => moveListItem("productTypes", index, 1)} />
                    <DeleteButton fullWidth={false} onClick={() => removeListItem("productTypes", item.id)} />
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(160px,1fr)_minmax(220px,1.2fr)_110px_120px_100px] xl:items-end">
                  <Field label="ชื่อ" value={item.name} onChange={(value) => updateList("productTypes", index, { name: value })} />
                  <Field label="รายละเอียด" value={item.description} onChange={(value) => updateList("productTypes", index, { description: value })} />
                  <Field label="ราคา" help="ราคาเพิ่มของประเภทนี้ในหน้าออกแบบ" type="number" value={item.price} onChange={(value) => updateList("productTypes", index, { price: toNumber(value) })} />
                  <Field label="จำนวนดอก/ก้าน" help="จำนวนดอกหรือก้านเริ่มต้นเมื่อเลือกประเภทนี้" type="number" value={item.baseQuantity} onChange={(value) => updateList("productTypes", index, { baseQuantity: toNumber(value) })} />
                  <Field label="วันผลิต" help="จำนวนวันผลิตโดยประมาณที่แสดงให้ลูกค้าเห็น" type="number" value={item.productionDays} onChange={(value) => updateList("productTypes", index, { productionDays: toNumber(value) })} />
                </div>
                <ProductTypeImageEditor
                  image={item.image}
                  title={item.name || `ประเภทสินค้า ${index + 1}`}
                  onUploaded={(image) => updateList("productTypes", index, { image })}
                  onRemove={() => updateList("productTypes", index, { image: undefined })}
                />
                <MaterialUsageEditor
                  optionType="product_type"
                  optionId={item.id}
                  materials={materials}
                  schemaReady={isMaterialLinkSchemaReady}
                  links={getMaterialLinks("product_type", item.id)}
                  onChange={(links) => updateMaterialLinks("product_type", item.id, links)}
                />
              </div>
            ))}
          </div>
        ) : null}

        {activeTab === "flowers" ? (
          <div className="space-y-3">
            <button type="button" onClick={addFlowerType} className="touch-target rounded-soft bg-blossom px-4 py-2 font-bold text-white">
              เพิ่มชนิดดอกไม้
            </button>
            {catalog.flowerTypes.map((item, index) => (
              <div key={item.id} className="admin-option-card grid gap-3 p-3 xl:grid-cols-[minmax(160px,1fr)_minmax(260px,1.35fr)_110px_120px_112px_96px] xl:items-end">
                <Field label="ชื่อ" value={item.name} onChange={(value) => updateList("flowerTypes", index, { name: value })} />
                <Field label="รายละเอียด" value={item.description} onChange={(value) => updateList("flowerTypes", index, { description: value })} />
                <Field label="ราคาเพิ่ม" help="ราคาเพิ่มเมื่อเลือกชนิดดอกไม้นี้" type="number" value={item.price} onChange={(value) => updateList("flowerTypes", index, { price: toNumber(value) })} />
                <Field label="สต็อกวัสดุ" help="จำนวนชุดวัสดุที่พร้อมผลิต ใช้แสดงในหน้าออกแบบ" type="number" value={item.materialStock} onChange={(value) => updateList("flowerTypes", index, { materialStock: toNumber(value) })} />
                <ToggleField label="เปิดขาย" checked={item.available} onChange={(checked) => updateList("flowerTypes", index, { available: checked })} />
                <DeleteButton onClick={() => removeListItem("flowerTypes", item.id)} />
                <div className="xl:col-span-6">
                  <MaterialUsageEditor
                    optionType="flower_type"
                    optionId={item.id}
                    materials={materials}
                    schemaReady={isMaterialLinkSchemaReady}
                    links={getMaterialLinks("flower_type", item.id)}
                    onChange={(links) => updateMaterialLinks("flower_type", item.id, links)}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {activeTab === "colors" ? (
          <div className="space-y-3">
            <button type="button" onClick={addColor} className="touch-target rounded-soft bg-blossom px-4 py-2 font-bold text-white">
              เพิ่มสี
            </button>
            {catalog.colors.map((item, index) => (
              <div key={item.id} className="admin-option-card grid gap-3 p-3 lg:grid-cols-[minmax(160px,1fr)_140px_110px_112px_96px] lg:items-end">
                <Field label="ชื่อสี" value={item.name} onChange={(value) => updateList("colors", index, { name: value })} />
                <ColorField label="รหัสสี" value={item.hex} onChange={(value) => updateList("colors", index, { hex: value })} />
                <Field label="ราคาเพิ่ม" help="ราคาเพิ่มเมื่อเลือกสีนี้ ถ้าไม่มีราคาเพิ่มให้ใส่ 0" type="number" value={item.price} onChange={(value) => updateList("colors", index, { price: toNumber(value) })} />
                <ToggleField label="มีสต็อก" checked={item.inStock} onChange={(checked) => updateList("colors", index, { inStock: checked })} />
                <DeleteButton onClick={() => removeListItem("colors", item.id)} />
                <div className="lg:col-span-5">
                  <MaterialUsageEditor
                    optionType="color"
                    optionId={item.id}
                    materials={materials}
                    schemaReady={isMaterialLinkSchemaReady}
                    links={getMaterialLinks("color", item.id)}
                    onChange={(links) => updateMaterialLinks("color", item.id, links)}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {activeTab === "stems" ? (
          <div className="grid gap-5">
            <StemEditor title="ความแข็งแรง" items={catalog.stems.strengths} materials={materials} schemaReady={isMaterialLinkSchemaReady} getLinks={getMaterialLinks} onLinksChange={updateMaterialLinks} onAdd={() => addStem("strengths")} onRemove={(id) => removeStem("strengths", id)} onChange={(id, patch) => updateStem("strengths", id, patch)} />
            <StemEditor title="รูปแบบก้าน" items={catalog.stems.styles} materials={materials} schemaReady={isMaterialLinkSchemaReady} getLinks={getMaterialLinks} onLinksChange={updateMaterialLinks} onAdd={() => addStem("styles")} onRemove={(id) => removeStem("styles", id)} onChange={(id, patch) => updateStem("styles", id, patch)} />
            <StemEditor title="ความยาว" items={catalog.stems.lengths} materials={materials} schemaReady={isMaterialLinkSchemaReady} getLinks={getMaterialLinks} onLinksChange={updateMaterialLinks} onAdd={() => addStem("lengths")} onRemove={(id) => removeStem("lengths", id)} onChange={(id, patch) => updateStem("lengths", id, patch)} />
            <StemEditor title="สีก้าน" items={catalog.stems.colors} colorMode materials={materials} schemaReady={isMaterialLinkSchemaReady} getLinks={getMaterialLinks} onLinksChange={updateMaterialLinks} onAdd={() => addStem("colors")} onRemove={(id) => removeStem("colors", id)} onChange={(id, patch) => updateStem("colors", id, patch)} />
          </div>
        ) : null}

        {activeTab === "arrangement" ? (
          <div className="grid gap-5">
            <RecordEditor
              title="การจัดช่อ"
              items={catalog.wrappingOptions}
              hasColor
              optionType="wrapping"
              materials={materials}
              schemaReady={isMaterialLinkSchemaReady}
              getLinks={getMaterialLinks}
              onLinksChange={updateMaterialLinks}
              onAdd={() => addRecord("wrappingOptions", { id: makeId("wrap"), name: "", description: "", price: 0, color: "#FFFFFF" })}
              onRemove={(id) => removeRecord("wrappingOptions", id)}
              onChange={(id, patch) => updateRecord("wrappingOptions", id as WrapId, patch)}
            />
            <RecordEditor
              title="ริบบิ้น"
              items={catalog.ribbonOptions}
              hasColor
              optionType="ribbon"
              materials={materials}
              schemaReady={isMaterialLinkSchemaReady}
              getLinks={getMaterialLinks}
              onLinksChange={updateMaterialLinks}
              onAdd={() => addRecord("ribbonOptions", { id: makeId("ribbon"), name: "", price: 0, color: "#FFFFFF" })}
              onRemove={(id) => removeRecord("ribbonOptions", id)}
              onChange={(id, patch) => updateRecord("ribbonOptions", id as RibbonId, patch)}
            />
          </div>
        ) : null}

        {activeTab === "decorations" ? (
          <RecordEditor
            title="ของตกแต่ง"
            items={catalog.decorationOptions}
            optionType="decoration"
            materials={materials}
            schemaReady={isMaterialLinkSchemaReady}
            getLinks={getMaterialLinks}
            onLinksChange={updateMaterialLinks}
            onAdd={() => addRecord("decorationOptions", { id: makeId("decoration"), name: "", description: "", price: 0 })}
            onRemove={(id) => removeRecord("decorationOptions", id)}
            onChange={(id, patch) => updateRecord("decorationOptions", id as DecorationId, patch)}
          />
        ) : null}

        {activeTab === "review" ? (
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-ink">ข้อความหมายเหตุในหน้าตรวจสอบ</span>
            <textarea
              value={catalog.reviewNote}
              onChange={(event) => setCatalog((current) => ({ ...current, reviewNote: event.target.value }))}
              className="min-h-28 w-full rounded-soft border border-pink-100 p-3"
            />
          </label>
        ) : null}
      </section>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={save} disabled={isSaving} className="touch-target inline-flex items-center gap-2 rounded-soft bg-blossom px-4 py-2 font-bold text-white disabled:opacity-60">
          <Save size={17} /> {isSaving ? "กำลังบันทึก..." : "บันทึกตัวเลือก"}
        </button>
        <button type="button" onClick={reset} className="touch-target inline-flex items-center gap-2 rounded-soft border border-pink-200 bg-white px-4 py-2 font-bold text-ink disabled:opacity-60">
          <RotateCcw size={17} /> รีเซ็ตค่าเริ่มต้น
        </button>
      </div>
    </fieldset>
  );
}

function ProductTypeImageEditor({
  image,
  title,
  onUploaded,
  onRemove
}: {
  image?: ConfiguratorCatalog["productTypes"][number]["image"];
  title: string;
  onUploaded: (image: NonNullable<ConfiguratorCatalog["productTypes"][number]["image"]>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="grid gap-3 rounded-soft border border-pink-100 bg-blush/35 p-3 lg:grid-cols-[220px_1fr]">
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-sm font-bold text-ink">รูปที่ใช้อยู่</p>
          {image ? (
            <button type="button" onClick={onRemove} className="rounded-full border border-pink-200 bg-white px-3 py-1 text-xs font-bold text-ink hover:bg-blush">
              ลบรูป
            </button>
          ) : null}
        </div>
        <div className="relative grid h-36 place-items-center overflow-hidden rounded-soft border border-pink-100 bg-white text-center text-xs font-semibold text-zinc-500">
          {image ? (
            <Image
              src={image.url}
              alt={title}
              fill
              sizes="220px"
              draggable={false}
              onContextMenu={(event) => event.preventDefault()}
              className="select-none object-cover"
            />
          ) : (
            <span className="px-4">ยังไม่มีรูปตัวอย่าง</span>
          )}
        </div>
        {image ? (
          <p className="mt-2 text-xs font-semibold text-zinc-500">
            {image.width} x {image.height}px / {image.format}
          </p>
        ) : null}
      </div>
      <ImageUploader bucket="gallery-images" folder="product-types" onUploaded={onUploaded} />
    </div>
  );
}

function Field({ label, help, value, onChange, type = "text" }: { label: string; help?: string; value: string | number; onChange: (value: string) => void; type?: string }) {
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
        className="touch-target w-full rounded-soft border border-pink-100 px-3"
      />
    </div>
  );
}

function normalizeColor(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value.toUpperCase() : "#F8BBD0";
}

function hexToRgb(hex: string) {
  const color = normalizeColor(hex).slice(1);
  return {
    r: parseInt(color.slice(0, 2), 16),
    g: parseInt(color.slice(2, 4), 16),
    b: parseInt(color.slice(4, 6), 16)
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((value) => Math.round(value).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

function rgbToHsv({ r, g, b }: { r: number; g: number; b: number }) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const saturation = max === 0 ? 0 : delta / max;
  let hue = 0;

  if (delta !== 0) {
    if (max === red) hue = ((green - blue) / delta) % 6;
    if (max === green) hue = (blue - red) / delta + 2;
    if (max === blue) hue = (red - green) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }

  return { h: hue, s: saturation, v: max };
}

function hsvToHex(h: number, s: number, v: number) {
  const chroma = v * s;
  const x = chroma * (1 - Math.abs((h / 60) % 2 - 1));
  const match = v - chroma;
  const [r, g, b] =
    h < 60 ? [chroma, x, 0] :
    h < 120 ? [x, chroma, 0] :
    h < 180 ? [0, chroma, x] :
    h < 240 ? [0, x, chroma] :
    h < 300 ? [x, 0, chroma] :
    [chroma, 0, x];

  return rgbToHex((r + match) * 255, (g + match) * 255, (b + match) * 255);
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const color = normalizeColor(value);
  const [isOpen, setIsOpen] = useState(false);
  const [pickerPosition, setPickerPosition] = useState<{ left: number; top: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const hsv = rgbToHsv(hexToRgb(color));
  const hueColor = hsvToHex(hsv.h, 1, 1);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: globalThis.PointerEvent) {
      const target = event.target as Node;
      if (pickerRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setIsOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function togglePicker(event: PointerEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const pickerWidth = Math.min(320, window.innerWidth - 48);
    const left = Math.min(Math.max(rect.left, 16), window.innerWidth - pickerWidth - 16);
    const top = Math.min(rect.bottom + 8, window.innerHeight - 250);

    setPickerPosition({ left, top: Math.max(16, top) });
    setIsOpen((current) => !current);
  }

  function pickSaturationAt(element: HTMLElement, clientX: number, clientY: number) {
    const rect = element.getBoundingClientRect();
    const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
    const y = Math.min(Math.max(clientY - rect.top, 0), rect.height);
    onChange(hsvToHex(hsv.h, x / rect.width, 1 - y / rect.height));
  }

  function pickSaturation(event: PointerEvent<HTMLButtonElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    pickSaturationAt(event.currentTarget, event.clientX, event.clientY);
  }

  function dragSaturation(event: PointerEvent<HTMLButtonElement>) {
    if (event.buttons !== 1) return;
    pickSaturationAt(event.currentTarget, event.clientX, event.clientY);
  }

  async function pickFromScreen() {
    const EyeDropper = (window as Window & { EyeDropper?: EyeDropperConstructor }).EyeDropper;
    if (!EyeDropper) {
      toast.warning("เบราว์เซอร์นี้ยังไม่รองรับปุ่มดูดสี");
      return;
    }

    try {
      const result = await new EyeDropper().open();
      onChange(result.sRGBHex.toUpperCase());
    } catch {
      // User cancelled color picking.
    }
  }

  return (
    <div className="relative">
      <span className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink">
        {label}
        <HelpTooltip content="กดวงกลมเพื่อเปิดตัวเลือกสี ลากในกล่องสีหรือแถบเฉดสีได้ และใช้ปุ่มดูดสีถ้าอุปกรณ์รองรับ" />
      </span>
      <span className="grid touch-target w-full min-w-0 grid-cols-[36px_minmax(0,1fr)] items-center gap-2 rounded-soft border border-pink-100 bg-white px-2">
        <button
          ref={triggerRef}
          type="button"
          onPointerDown={togglePicker}
          className="size-9 rounded-full border border-pink-200 shadow-sm"
          style={{ backgroundColor: color }}
          aria-label={`เลือก${label}`}
        />
        <input
          suppressHydrationWarning
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 border-0 bg-transparent px-1 font-semibold text-ink outline-none"
          placeholder="#F8BBD0"
          spellCheck={false}
        />
      </span>
      {isOpen ? (
        <div
          ref={pickerRef}
          className="fixed z-50 w-[min(320px,calc(100vw-48px))] rounded-bloom border border-pink-100 bg-white p-3 text-ink shadow-soft"
          style={{
            left: pickerPosition?.left ?? 16,
            top: pickerPosition?.top ?? 16
          }}
        >
          <button
            type="button"
            onPointerDown={pickSaturation}
            onPointerMove={dragSaturation}
            className="relative h-28 w-full overflow-hidden rounded-soft border border-pink-100"
            style={{
              background:
                `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueColor})`
            }}
            aria-label="เลือกความเข้มและความสดของสี"
          >
            <span
              className="absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
              style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }}
              aria-hidden="true"
            />
          </button>
          <input
            type="range"
            min={0}
            max={360}
            value={Math.round(hsv.h)}
            onChange={(event) => onChange(hsvToHex(Number(event.target.value), hsv.s, hsv.v))}
            className="hue-slider mt-3 w-full cursor-pointer"
            style={{
              background:
                "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)"
            }}
            aria-label="เลือกเฉดสี"
          />
          <div className="mt-3 grid grid-cols-[36px_minmax(0,1fr)] items-center gap-2">
            <span className="size-9 rounded-full border border-pink-100 shadow-sm" style={{ backgroundColor: color }} aria-hidden="true" />
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_44px] gap-2">
              <input
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="touch-target min-w-0 rounded-soft border border-pink-100 bg-blush/40 px-3 font-semibold text-ink outline-none focus:border-blossom"
                placeholder="#F8BBD0"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={pickFromScreen}
                className="touch-target inline-flex items-center justify-center rounded-soft border border-pink-100 bg-white text-ink hover:bg-blush"
                aria-label="ดูดสีจากหน้าจอ"
              >
                <Pipette size={18} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="touch-target flex items-center justify-between gap-3 rounded-soft border border-pink-100 bg-blush px-3 text-sm font-bold text-ink">
      <span className="whitespace-nowrap">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 accent-blossom"
      />
    </label>
  );
}

function MoveButton({ label, icon, disabled, onClick }: { label: string; icon: "up" | "down"; disabled: boolean; onClick: () => void }) {
  const Icon = icon === "up" ? ArrowUp : ArrowDown;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="touch-target inline-flex items-center justify-center gap-1 rounded-soft border border-pink-200 bg-white px-3 py-2 text-sm font-bold text-ink transition hover:bg-blush disabled:cursor-not-allowed disabled:opacity-45"
    >
      <Icon size={16} aria-hidden="true" />
      {label}
    </button>
  );
}

function DeleteButton({ onClick, fullWidth = true }: { onClick: () => void; fullWidth?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={`touch-target rounded-soft border border-pink-200 px-3 py-2 text-sm font-bold text-ink hover:bg-blush ${fullWidth ? "w-full" : "min-w-20"}`}>
      ลบ
    </button>
  );
}

function MaterialUsageEditor({
  optionType,
  optionId,
  materials,
  schemaReady,
  links,
  onChange
}: {
  optionType: DesignOptionMaterialLink["optionType"];
  optionId: string;
  materials: AdminMaterial[];
  schemaReady: boolean;
  links: DesignOptionMaterialLink[];
  onChange: (links: DesignOptionMaterialLink[]) => void;
}) {
  function addLink() {
    if (!schemaReady) {
      toast.warning("ยังเชื่อมวัสดุไม่ได้ กรุณาอัปเดตโครงสร้างฐานข้อมูลก่อน");
      return;
    }

    const firstMaterial = materials.find((material) => !links.some((link) => link.materialId === material.id));
    if (!firstMaterial) {
      toast.warning(materials.length ? "เลือกวัสดุครบแล้ว" : "กรุณาเพิ่มวัสดุในหน้า วัสดุ ก่อน");
      return;
    }

    onChange([
      ...links,
      {
        optionType,
        optionId,
        materialId: firstMaterial.id,
        quantityPerUnit: 1
      }
    ]);
  }

  function updateLink(index: number, patch: Partial<DesignOptionMaterialLink>) {
    onChange(links.map((link, currentIndex) => currentIndex === index ? { ...link, ...patch, optionType, optionId } : link));
  }

  function removeLink(index: number) {
    onChange(links.filter((_, currentIndex) => currentIndex !== index));
  }

  return (
    <div className="rounded-soft border border-pink-100 bg-white/80 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-ink">วัสดุที่ใช้</p>
          <p className="text-xs font-semibold text-zinc-500">เลือกจากสต็อกวัสดุ ไม่ต้องพิมพ์ชื่อวัสดุซ้ำ</p>
        </div>
        <button type="button" onClick={addLink} disabled={!schemaReady} className="rounded-soft bg-blush px-3 py-2 text-sm font-bold text-ink hover:bg-pink-100 disabled:cursor-not-allowed disabled:opacity-55">
          เพิ่มวัสดุที่ใช้
        </button>
      </div>
      {!schemaReady ? (
        <p className="mt-3 rounded-soft bg-yellow-50 p-3 text-sm font-semibold text-yellow-700">
          ยังใช้ระบบเชื่อมวัสดุไม่ได้ กรุณาอัปเดตโครงสร้างฐานข้อมูลก่อน
        </p>
      ) : materials.length ? (
        links.length ? (
          <div className="mt-3 grid gap-2">
            {links.map((link, index) => {
              const selectedMaterial = materials.find((material) => material.id === link.materialId);

              return (
                <div key={`${link.materialId}-${index}`} className="grid gap-2 rounded-soft bg-blush/55 p-2 sm:grid-cols-[minmax(0,1fr)_130px_76px] sm:items-end">
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold text-ink">วัสดุ</span>
                    <select
                      value={link.materialId}
                      onChange={(event) => updateLink(index, { materialId: event.target.value })}
                      className="touch-target w-full rounded-soft border border-pink-100 bg-white px-3 text-sm font-semibold"
                    >
                      {materials.map((material) => (
                        <option key={material.id} value={material.id}>
                          {material.name} ({material.stock.toLocaleString("th-TH")} {material.unit})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold text-ink">จำนวนที่ใช้</span>
                    <div className="grid grid-cols-[1fr_auto] overflow-hidden rounded-soft border border-pink-100 bg-white">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={link.quantityPerUnit}
                        onChange={(event) => updateLink(index, { quantityPerUnit: toNumber(event.target.value) })}
                        className="min-w-0 border-0 bg-transparent px-3 outline-none"
                      />
                      <span className="grid place-items-center bg-blush px-2 text-xs font-bold text-zinc-600">{selectedMaterial?.unit ?? "หน่วย"}</span>
                    </div>
                  </label>
                  <button type="button" onClick={() => removeLink(index)} className="touch-target rounded-soft border border-pink-200 bg-white px-3 text-sm font-bold text-ink">
                    ลบ
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-3 rounded-soft bg-blush/50 p-3 text-sm font-semibold text-zinc-600">ยังไม่ได้เลือกวัสดุให้ตัวเลือกนี้</p>
        )
      ) : (
        <p className="mt-3 rounded-soft bg-yellow-50 p-3 text-sm font-semibold text-yellow-700">ยังไม่มีวัสดุในสต็อก ให้เพิ่มในหน้า วัสดุ ก่อน</p>
      )}
    </div>
  );
}

function StemEditor({
  title,
  items,
  colorMode = false,
  materials,
  schemaReady,
  getLinks,
  onLinksChange,
  onAdd,
  onRemove,
  onChange
}: {
  title: string;
  items: Record<string, { id: string; name: string; description?: string; price: number; hex?: string }>;
  colorMode?: boolean;
  materials: AdminMaterial[];
  schemaReady: boolean;
  getLinks: (optionType: DesignOptionMaterialLink["optionType"], optionId: string) => DesignOptionMaterialLink[];
  onLinksChange: (optionType: DesignOptionMaterialLink["optionType"], optionId: string, links: DesignOptionMaterialLink[]) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onChange: (id: string, patch: Record<string, unknown>) => void;
}) {
  const values = Object.values(items);

  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="font-bold text-ink">{title}</h3>
        <button type="button" onClick={onAdd} className="touch-target rounded-soft bg-blossom px-3 py-2 text-sm font-bold text-white">
          เพิ่มตัวเลือก
        </button>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {values.length ? values.map((item) => (
          <div key={item.id} className="admin-option-card grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_110px_96px] sm:items-end">
            <Field label="ชื่อ" value={item.name} onChange={(value) => onChange(item.id, { name: value })} />
            <Field label="ราคา" type="number" value={item.price} onChange={(value) => onChange(item.id, { price: toNumber(value) })} />
            <DeleteButton onClick={() => onRemove(item.id)} />
            {!colorMode ? <div className="sm:col-span-3"><Field label="รายละเอียด" value={item.description ?? ""} onChange={(value) => onChange(item.id, { description: value })} /></div> : null}
            {colorMode ? <div className="sm:col-span-3"><ColorField label="รหัสสี" value={item.hex ?? ""} onChange={(value) => onChange(item.id, { hex: value })} /></div> : null}
            <div className="sm:col-span-3">
              <MaterialUsageEditor
                optionType="stem"
                optionId={item.id}
                materials={materials}
                schemaReady={schemaReady}
                links={getLinks("stem", item.id)}
                onChange={(links) => onLinksChange("stem", item.id, links)}
              />
            </div>
          </div>
        )) : (
          <div className="rounded-soft border border-dashed border-pink-200 bg-blush/40 p-4 text-sm font-semibold text-zinc-600 lg:col-span-2">
            ยังไม่มีตัวเลือก กดเพิ่มตัวเลือกเพื่อสร้างรายการใหม่
          </div>
        )}
      </div>
    </section>
  );
}

function RecordEditor({
  title,
  items,
  hasColor = false,
  optionType,
  materials,
  schemaReady,
  getLinks,
  onLinksChange,
  onAdd,
  onRemove,
  onChange
}: {
  title: string;
  items: Record<string, { id: string; name: string; description?: string; price: number; color?: string }>;
  hasColor?: boolean;
  optionType: DesignOptionMaterialLink["optionType"];
  materials: AdminMaterial[];
  schemaReady: boolean;
  getLinks: (optionType: DesignOptionMaterialLink["optionType"], optionId: string) => DesignOptionMaterialLink[];
  onLinksChange: (optionType: DesignOptionMaterialLink["optionType"], optionId: string, links: DesignOptionMaterialLink[]) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onChange: (id: string, patch: Record<string, unknown>) => void;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="font-bold text-ink">{title}</h3>
        <button type="button" onClick={onAdd} className="touch-target rounded-soft bg-blossom px-3 py-2 text-sm font-bold text-white">
          เพิ่มตัวเลือก
        </button>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {Object.values(items).map((item) => (
          <div key={item.id} className="admin-option-card grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_100px]">
            <Field label="ชื่อ" value={item.name} onChange={(value) => onChange(item.id, { name: value })} />
            <Field label="ราคา" type="number" value={item.price} onChange={(value) => onChange(item.id, { price: toNumber(value) })} />
            {"description" in item ? <Field label="รายละเอียด" value={item.description ?? ""} onChange={(value) => onChange(item.id, { description: value })} /> : null}
            {hasColor ? <div className="sm:col-span-2"><ColorField label="สี" value={item.color ?? ""} onChange={(value) => onChange(item.id, { color: value })} /></div> : null}
            <div className="sm:col-span-2">
              <MaterialUsageEditor
                optionType={optionType}
                optionId={item.id}
                materials={materials}
                schemaReady={schemaReady}
                links={getLinks(optionType, item.id)}
                onChange={(links) => onLinksChange(optionType, item.id, links)}
              />
            </div>
            <button type="button" onClick={() => onRemove(item.id)} className="touch-target rounded-soft border border-pink-200 px-3 py-2 text-sm font-bold text-ink">
              ลบ
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
