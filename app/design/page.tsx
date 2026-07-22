"use client";

import Link from "next/link";
import { useState } from "react";
import { Shuffle } from "lucide-react";
import { Footer } from "@/components/Footer";
import { HelpTooltip } from "@/components/HelpTooltip";
import { Navbar } from "@/components/Navbar";
import { OptionCard } from "@/components/configurator/Cards";
import { ColorSwatch } from "@/components/configurator/ColorSwatch";
import { ConfiguratorProvider, useConfigurator } from "@/components/configurator/ConfiguratorProvider";
import { ConfiguratorStepper, steps } from "@/components/configurator/ConfiguratorStepper";
import { PriceSummary } from "@/components/configurator/PriceSummary";
import { ProductPreview } from "@/components/configurator/ProductPreview";
import { StickyOrderBar } from "@/components/configurator/StickyOrderBar";
import { isStepComplete } from "@/lib/configurator";
import type { ColorId, DecorationId, FlowerColor, FlowerTypeId, ProductTypeId, RibbonId, StemColor, StemStrength, StemStyle, WrapId } from "@/lib/types";

function DesignFlow() {
  const [step, setStep] = useState(0);
  const { config, catalog, setConfig } = useConfigurator();
  const canNext = isStepComplete(step, config);
  const { colors, decorationOptions, flowerTypes, productTypes, ribbonOptions, stems, wrappingOptions } = catalog;

  function next() {
    if (step < steps.length - 1 && canNext) setStep(step + 1);
  }

  function previous() {
    if (step > 0) setStep(step - 1);
  }

  const hasStemOptions =
    Object.keys(stems.strengths).length > 0 ||
    Object.keys(stems.styles).length > 0 ||
    Object.keys(stems.lengths).length > 0 ||
    Object.keys(stems.colors).length > 0;

  const navButtons = (
    <>
      <button type="button" onClick={previous} disabled={step === 0} className="touch-target rounded-soft border border-pink-200 bg-white px-4 py-2 font-semibold text-ink disabled:opacity-40">
        ย้อนกลับ
      </button>
      {step === steps.length - 1 ? (
        <Link href="/checkout" className="touch-target rounded-soft bg-blossom px-4 py-2 font-semibold text-white">ยืนยันต่อ</Link>
      ) : (
        <button type="button" onClick={next} disabled={!canNext} className="touch-target rounded-soft bg-blossom px-4 py-2 font-semibold text-white disabled:opacity-40">
          ถัดไป
        </button>
      )}
    </>
  );

  return (
    <>
      <Navbar />
      <main className="container-page min-h-screen pb-28 pt-6 md:pb-10">
        <ConfiguratorStepper activeStep={step} setActiveStep={setStep} />
        <div className="mt-6 grid gap-6 lg:grid-cols-[55fr_45fr]">
          <section className="lg:sticky lg:top-24 lg:self-start">
            <ProductPreview />
          </section>
          <section className="space-y-4">
            <div className="rounded-bloom border border-pink-100 bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-blossom">ขั้นตอนที่ {step + 1} จาก {steps.length}</p>
              <div className="mt-1 flex items-center gap-2">
                <h1 className="text-2xl font-bold text-ink">{steps[step]}</h1>
                <HelpTooltip
                  title={steps[step]}
                  content={step === 0 ? "เลือกขนาดหรือแพ็กเกจเริ่มต้นของงาน" : step === 1 ? "เลือกชนิดดอกไม้ที่ต้องการ ระบบจะใช้ชนิดนี้ไปวาดตัวอย่าง" : step === 2 ? "เลือกจำนวนดอกและสี สีสามารถใช้สีเดียวทั้งหมดหรือแยกแต่ละดอกได้" : step === 3 ? "เลือกความแข็งแรง รูปแบบ ความยาว และสีก้าน" : step === 4 ? "เลือกวิธีจัดช่อและสีริบบิ้น" : step === 5 ? "เพิ่มของตกแต่ง เช่น การ์ดหรือกล่อง ถ้ามี" : "ตรวจราคาก่อนกดไปยืนยันคำสั่งซื้อ"}
                />
              </div>
            </div>

            {step === 0 && (
              productTypes.length ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {productTypes.map((item) => (
                    <OptionCard key={item.id} selected={config.productType === item.id} title={item.name} subtitle={item.description} meta={`ผลิตประมาณ ${item.productionDays} วัน`} price={item.price} tone={item.imageTone} onClick={() => setConfig({ productType: item.id as ProductTypeId })} />
                  ))}
                </div>
              ) : <EmptyStep message="ยังไม่มีประเภทสินค้า กรุณาเพิ่มข้อมูลในหน้าแอดมินก่อนเปิดให้ลูกค้าออกแบบ" />
            )}

            {step === 1 && (
              flowerTypes.length ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {flowerTypes.map((item) => (
                    <OptionCard key={item.id} selected={config.flowerType === item.id} title={item.name} subtitle={item.description} meta={`วัสดุพร้อมทำ ${item.materialStock} ชุด`} price={item.price} disabled={!item.available} onClick={() => setConfig({ flowerType: item.id as FlowerTypeId })} />
                  ))}
                </div>
              ) : <EmptyStep message="ยังไม่มีชนิดดอกไม้ กรุณาเพิ่มข้อมูลในหน้าแอดมินก่อน" />
            )}

            {step === 2 && (
              colors.length ? <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setConfig({ colorMode: "single" })} className={`touch-target rounded-soft px-4 py-2 font-semibold ${config.colorMode === "single" ? "bg-blossom text-white" : "bg-white"}`}>ใช้สีเดียวทั้งหมด</button>
                  <button type="button" onClick={() => setConfig({ colorMode: "individual" })} className={`touch-target rounded-soft px-4 py-2 font-semibold ${config.colorMode === "individual" ? "bg-blossom text-white" : "bg-white"}`}>เลือกแยกแต่ละดอก</button>
                  <button type="button" onClick={() => setConfig({ colorMode: "individual", flowerColors: Array.from({ length: config.quantity }, (_, index) => colors[index % colors.length].id as ColorId) })} className="touch-target inline-flex items-center gap-2 rounded-soft bg-white px-4 py-2 font-semibold">
                    <Shuffle size={17} /> สุ่มสีโทนเดียวกัน
                  </button>
                </div>
                {config.colorMode === "single" ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {colors.map((color) => <ColorSwatch key={color.id} color={color as FlowerColor} selected={config.flowerColors[0] === color.id} onSelect={() => setConfig({ flowerColors: Array.from({ length: config.quantity }, () => color.id as ColorId) })} />)}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Array.from({ length: config.quantity }, (_, index) => (
                      <div key={index} className="rounded-bloom border border-pink-100 bg-white p-3">
                        <p className="mb-2 font-semibold">ดอกที่ {index + 1}</p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {colors.map((color) => (
                            <ColorSwatch key={color.id} color={color as FlowerColor} selected={config.flowerColors[index] === color.id} onSelect={() => {
                              const nextColors = [...config.flowerColors];
                              nextColors[index] = color.id as ColorId;
                              setConfig({ flowerColors: nextColors });
                            }} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div> : <EmptyStep message="ยังไม่มีสีดอกไม้ กรุณาเพิ่มสีในหน้าแอดมินก่อน" />
            )}

            {step === 3 && (
              hasStemOptions ? (
                <div className="space-y-4">
                  <OptionGroup title="ความแข็งแรง" items={Object.values(stems.strengths)} selected={config.stem.strength} onSelect={(id) => setConfig({ stem: { ...config.stem, strength: id as StemStrength } })} />
                  <OptionGroup title="รูปแบบก้าน" items={Object.values(stems.styles)} selected={config.stem.style} onSelect={(id) => setConfig({ stem: { ...config.stem, style: id as StemStyle } })} />
                  <OptionGroup title="ความยาว" items={Object.values(stems.lengths)} selected={String(config.stem.length)} onSelect={(id) => setConfig({ stem: { ...config.stem, length: Number(id) } })} />
                  <div className="grid gap-2 sm:grid-cols-2">
                    {Object.values(stems.colors).map((stem) => (
                      <button key={stem.id} type="button" onClick={() => setConfig({ stem: { ...config.stem, color: stem.id as StemColor } })} className={`touch-target rounded-soft border p-3 text-left ${config.stem.color === stem.id ? "border-blossom bg-blush" : "border-pink-100 bg-white"}`}>
                        <span className="inline-block size-5 rounded-full border align-middle" style={{ background: stem.hex }} /> <span className="ml-2 font-semibold">{stem.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : <EmptyStep message="ยังไม่มีตัวเลือกก้าน กรุณาเพิ่มข้อมูลในหน้าแอดมินก่อน" />
            )}

            {step === 4 && (
              <div className="space-y-4">
                <OptionGroup title="การจัดช่อ" items={Object.values(wrappingOptions)} selected={config.wrapping} onSelect={(id) => setConfig({ wrapping: id as WrapId })} />
                <OptionGroup title="ริบบิ้น" items={Object.values(ribbonOptions).map((item) => ({ ...item, description: "สีริบบิ้นสำหรับผูกช่อ" }))} selected={config.ribbon} onSelect={(id) => setConfig({ ribbon: id as RibbonId })} />
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {Object.values(decorationOptions).map((item) => {
                    const decorationId = item.id as DecorationId;
                    const selected = config.decorations.includes(decorationId);
                    return <OptionCard key={item.id} selected={selected} title={item.name} subtitle={item.description} price={item.price} onClick={() => setConfig({ decorations: selected ? config.decorations.filter((id) => id !== decorationId) : [...config.decorations, decorationId] })} />;
                  })}
                </div>
                {config.decorations.includes("message-card") && (
                  <div className="rounded-bloom border border-pink-100 bg-white p-4">
                    <h2 className="font-bold">ข้อความในการ์ด</h2>
                    {(["to", "message", "from"] as const).map((field) => (
                      <label key={field} className="mt-3 block">
                        <span className="text-sm font-semibold">{field === "to" ? "ถึง" : field === "from" ? "จาก" : "ข้อความ"}</span>
                        <textarea maxLength={field === "message" ? 120 : 40} value={config.cardMessage[field]} onChange={(event) => setConfig({ cardMessage: { ...config.cardMessage, [field]: event.target.value } })} className="mt-1 min-h-12 w-full rounded-soft border border-pink-100 p-3" />
                        <span className="text-xs text-zinc-500">{config.cardMessage[field].length}/{field === "message" ? 120 : 40}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === 6 && <PriceSummary canCheckout />}

            <div className="hidden items-center justify-between gap-3 rounded-bloom bg-white p-4 shadow-sm md:flex">
              <span className="font-bold text-ink">ยอดรวม {config.totalPrice} บาท</span>
              <div className="flex gap-2">{navButtons}</div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
      <StickyOrderBar>{navButtons}</StickyOrderBar>
    </>
  );
}

function OptionGroup({ title, items, selected, onSelect }: { title: string; items: { id: string; name: string; description?: string; price: number }[]; selected: string; onSelect: (id: string) => void }) {
  return (
    <section>
      <h2 className="mb-2 inline-flex items-center gap-2 font-bold text-ink">
        {title}
        <HelpTooltip content={`เลือกตัวเลือก${title}ที่ต้องการ ราคาเพิ่มจะแสดงบนการ์ดแต่ละใบ`} />
      </h2>
      {items.length ? <div className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <button key={item.id} type="button" onClick={() => onSelect(item.id)} className={`touch-target rounded-soft border p-3 text-left ${selected === item.id ? "border-blossom bg-blush" : "border-pink-100 bg-white"}`}>
            <span className="block font-semibold">{item.name}</span>
            <span className="block text-sm text-zinc-600">{item.description}</span>
            <span className="mt-1 block text-sm font-bold text-blossom">{item.price ? `+${item.price} บาท` : "รวมในราคา"}</span>
          </button>
        ))}
      </div> : <EmptyStep message={`ยังไม่มีตัวเลือก${title}`} compact />}
    </section>
  );
}

function EmptyStep({ message, compact = false }: { message: string; compact?: boolean }) {
  return (
    <div className={`rounded-bloom border border-pink-100 bg-white text-sm font-semibold text-zinc-600 shadow-sm ${compact ? "p-3" : "p-5"}`}>
      {message}
    </div>
  );
}

export default function DesignPage() {
  return (
    <ConfiguratorProvider>
      <DesignFlow />
    </ConfiguratorProvider>
  );
}
