"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CapacityCalendar } from "@/components/CapacityCalendar";
import { Footer } from "@/components/Footer";
import { HelpTooltip } from "@/components/HelpTooltip";
import { Navbar } from "@/components/Navbar";
import { LoginForm } from "@/components/LoginForm";
import { ConfiguratorProvider, useConfigurator } from "@/components/configurator/ConfiguratorProvider";
import { PriceSummary } from "@/components/configurator/PriceSummary";
import { ImageUploader } from "@/components/ImageUploader";
import { fetchPublicGalleryItems, fetchPublicProducts, type AdminGalleryItem, type AdminProduct } from "@/lib/admin-data";
import { nextAvailableDate } from "@/lib/capacity";
import { productionScore } from "@/lib/configurator";
import { formatThaiIsoDate } from "@/lib/date-format";
import {
  addDaysToIsoDate,
  getEnabledFulfillmentMethods,
  getFulfillmentMethod,
  type FulfillmentSettings
} from "@/lib/fulfillment-settings";
import { buildOrder, saveOrder } from "@/lib/orders";
import { clearQuickOrder, readQuickOrder, saveQuickOrder } from "@/lib/quick-order";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { OrderSourceItem } from "@/lib/types";
import { checkoutSchema, type CheckoutInput } from "@/lib/validation";

function productToSourceItem(item: AdminProduct): OrderSourceItem {
  return {
    sourceType: "product",
    id: item.id,
    title: item.name,
    description: item.description,
    price: Number(item.basePrice || 0),
    productionScore: Math.max(1, Number(item.productionScore || 1)),
    imageUrl: item.image?.url,
    details: [item.description].filter(Boolean)
  };
}

function galleryToSourceItem(item: AdminGalleryItem): OrderSourceItem {
  const details = [item.flower, item.color, item.size].filter(Boolean);

  return {
    sourceType: "gallery",
    id: item.id,
    title: item.title,
    description: details.join(" / "),
    price: Number(item.price || 0),
    productionScore: Math.max(1, Number(item.productionScore ?? 1)),
    imageUrl: item.image?.url,
    details
  };
}

async function fetchQuickOrderSource(sourceType: string | null, sourceId: string | null) {
  if (!sourceId) return null;

  if (sourceType === "product") {
    const products = await fetchPublicProducts();
    const product = products.find((item) => item.id === sourceId);
    return product ? productToSourceItem(product) : null;
  }

  if (sourceType === "gallery") {
    const galleryItems = await fetchPublicGalleryItems();
    const item = galleryItems.find((entry) => entry.id === sourceId);
    return item ? galleryToSourceItem(item) : null;
  }

  return null;
}

function getIsoDateAfterDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function getCurrentCheckoutPath() {
  if (typeof window === "undefined") return "/checkout";
  return `${window.location.pathname}${window.location.search}`;
}

function CheckoutForm() {
  const router = useRouter();
  const { config, catalog, isReady } = useConfigurator();
  const [sourceItem, setSourceItem] = useState<OrderSourceItem | null>(null);
  const [sourceChecked, setSourceChecked] = useState(false);
  const [wantsQuickOrder, setWantsQuickOrder] = useState(false);
  const requiredScore = sourceItem?.productionScore ?? productionScore(config, catalog);
  const [authUserId, setAuthUserId] = useState<string>();
  const [authAccessToken, setAuthAccessToken] = useState("");
  const [authChecked, setAuthChecked] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [authRefreshKey, setAuthRefreshKey] = useState(0);
  const [profileAddress, setProfileAddress] = useState("");
  const [fulfillmentSettings, setFulfillmentSettings] = useState<FulfillmentSettings | null>(null);
  const [fulfillmentChecked, setFulfillmentChecked] = useState(false);
  const { register, handleSubmit, setValue, getValues, watch, formState: { errors, isSubmitting } } = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { pickupMethod: "รับที่ร้าน", pickupTime: "16:00", pickupLocation: "หน้าร้าน", pickupDate: config.pickupDate }
  });

  const pickupMethod = watch("pickupMethod");
  const pickupDate = watch("pickupDate");
  const enabledMethods = useMemo(() => fulfillmentSettings ? getEnabledFulfillmentMethods(fulfillmentSettings) : [], [fulfillmentSettings]);
  const selectedMethod = useMemo(() => {
    if (!fulfillmentSettings) return null;
    return getFulfillmentMethod(fulfillmentSettings, pickupMethod) ?? enabledMethods[0] ?? null;
  }, [enabledMethods, fulfillmentSettings, pickupMethod]);
  const estimatedDeliveryDate = useMemo(() => {
    if (!fulfillmentSettings) return "";
    const productionDate = nextAvailableDate(requiredScore) || getIsoDateAfterDays(1);
    return addDaysToIsoDate(productionDate, fulfillmentSettings.deliveryLeadDays);
  }, [fulfillmentSettings, requiredScore]);

  useEffect(() => {
    let isMounted = true;

    fetch("/api/fulfillment-settings", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: FulfillmentSettings) => {
        if (!isMounted) return;
        setFulfillmentSettings(data);
        setFulfillmentChecked(true);
      })
      .catch(() => {
        if (!isMounted) return;
        toast.warning("โหลดวิธีรับสินค้าไม่สำเร็จ ใช้ค่าเริ่มต้นชั่วคราว");
        setFulfillmentChecked(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!fulfillmentSettings || !enabledMethods.length) return;

    const current = getValues("pickupMethod");
    const currentMethod = getFulfillmentMethod(fulfillmentSettings, current);
    const nextMethod = currentMethod?.enabled ? currentMethod : enabledMethods[0];

    if (nextMethod && current !== nextMethod.label) {
      setValue("pickupMethod", nextMethod.label, { shouldValidate: true });
    }
  }, [enabledMethods, fulfillmentSettings, getValues, setValue]);

  useEffect(() => {
    if (!selectedMethod || !fulfillmentSettings) return;

    if (selectedMethod.id === "delivery") {
      setValue("pickupDate", estimatedDeliveryDate, { shouldValidate: true });
      setValue("pickupTime", "จัดส่ง", { shouldValidate: true });
      if (!getValues("pickupLocation") || ["หน้าร้าน", "โรงเรียน"].includes(getValues("pickupLocation"))) {
        setValue("pickupLocation", profileAddress || selectedMethod.defaultLocation, { shouldValidate: true });
      }
      return;
    }

    if (!getValues("pickupTime") || getValues("pickupTime") === "จัดส่ง") {
      setValue("pickupTime", fulfillmentSettings.pickupTimeSlots[0] ?? "16:00", { shouldValidate: true });
    }
    if (selectedMethod.defaultLocation) {
      const currentLocation = getValues("pickupLocation");
      if (!currentLocation || currentLocation === profileAddress || ["หน้าร้าน", "โรงเรียน"].includes(currentLocation)) {
        setValue("pickupLocation", selectedMethod.defaultLocation, { shouldValidate: true });
      }
    }
  }, [estimatedDeliveryDate, fulfillmentSettings, getValues, profileAddress, selectedMethod, setValue]);

  useEffect(() => {
    let isMounted = true;

    async function loadQuickOrderSource() {
      const searchParams = new URLSearchParams(window.location.search);
      const isQuickOrder = searchParams.get("quickOrder") === "1";
      const sourceType = searchParams.get("source");
      const sourceId = searchParams.get("id");
      setWantsQuickOrder(isQuickOrder);

      if (!isQuickOrder) {
        if (!isMounted) return;
        setSourceItem(null);
        setSourceChecked(true);
        return;
      }

      const storedItem = readQuickOrder();
      if (
        storedItem &&
        (!sourceType || storedItem.sourceType === sourceType) &&
        (!sourceId || storedItem.id === sourceId)
      ) {
        if (!isMounted) return;
        setSourceItem(storedItem);
        setSourceChecked(true);
        return;
      }

      const remoteItem = await fetchQuickOrderSource(sourceType, sourceId).catch(() => null);
      if (!isMounted) return;

      if (remoteItem) saveQuickOrder(remoteItem);
      setSourceItem(remoteItem);
      setSourceChecked(true);
    }

    loadQuickOrderSource();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isReady || !sourceChecked) return;
    if (!wantsQuickOrder && !sourceItem && (!config.productType || !config.flowerType)) router.push("/design");
  }, [config.productType, config.flowerType, isReady, router, sourceChecked, sourceItem, wantsQuickOrder]);

  useEffect(() => {
    let isMounted = true;
    let supabase: ReturnType<typeof createSupabaseBrowserClient>;

    function requireCheckoutLogin() {
      setAuthUserId(undefined);
      setAuthAccessToken("");
      setNeedsLogin(true);
      setAuthChecked(true);
    }

    try {
      supabase = createSupabaseBrowserClient();
    } catch {
      requireCheckoutLogin();
      return () => {
        isMounted = false;
      };
    }

    supabase.auth.getSession().then(async ({ data: sessionData }) => {
      if (!isMounted) return;

      const token = sessionData.session?.access_token;
      if (!token) {
        requireCheckoutLogin();
        return;
      }

      const { data } = await supabase.auth.getUser(token);
      if (!isMounted) return;

      const user = data.user;
      if (!user) {
        requireCheckoutLogin();
        return;
      }

      setNeedsLogin(false);
      setAuthUserId(user.id);
      setAuthAccessToken(token);
      const metadata = user.user_metadata ?? {};
      let firstName = typeof metadata.first_name === "string" ? metadata.first_name.trim() : "";
      let lastName = typeof metadata.last_name === "string" ? metadata.last_name.trim() : "";
      let displayName = typeof metadata.display_name === "string" ? metadata.display_name.trim() : "";
      let phone = typeof metadata.phone === "string" ? metadata.phone.trim() : "";
      let lineId = typeof metadata.line_id === "string" ? metadata.line_id.trim() :
        typeof metadata.lineId === "string" ? metadata.lineId.trim() :
        "";
      let address = typeof metadata.address === "string" ? metadata.address.trim() : "";

      try {
        const response = await fetch("/api/profile", { cache: "no-store" });
        if (response.ok) {
          const profile = await response.json() as {
            displayName?: string;
            firstName?: string;
            lastName?: string;
            phone?: string;
            lineId?: string;
            address?: string;
          };
          firstName = profile.firstName?.trim() || firstName;
          lastName = profile.lastName?.trim() || lastName;
          displayName = profile.displayName?.trim() || displayName;
          phone = profile.phone?.trim() || phone;
          lineId = profile.lineId?.trim() || lineId;
          address = profile.address?.trim() || address;
        }
      } catch {
        // Metadata fallback is enough to keep checkout usable.
      }

      const customerName = [firstName, lastName].filter(Boolean).join(" ") || displayName;

      if (customerName) {
        setValue("customerName", customerName, { shouldValidate: true });
      }
      if (phone) {
        setValue("phone", phone, { shouldValidate: true });
      }
      if (lineId) {
        setValue("lineId", lineId, { shouldValidate: true });
      }
      if (address) {
        setProfileAddress(address);
      }
      if (user.email) {
        setValue("email", user.email, { shouldValidate: true });
      }
      setAuthChecked(true);
    }).catch(() => {
      if (!isMounted) return;
      requireCheckoutLogin();
    });

    return () => {
      isMounted = false;
    };
  }, [authRefreshKey, setValue]);

  async function onSubmit(values: CheckoutInput) {
    if (!authUserId || !authAccessToken) {
      setNeedsLogin(true);
      setAuthChecked(true);
      toast.warning("กรุณาเข้าสู่ระบบก่อนยืนยันคำสั่งซื้อ");
      return;
    }

    const isDelivery = selectedMethod?.id === "delivery";
    const order = buildOrder({
      ...values,
      pickupDate: isDelivery ? estimatedDeliveryDate : values.pickupDate,
      pickupTime: isDelivery ? "จัดส่ง" : values.pickupTime,
      estimatedDeliveryDate: isDelivery ? estimatedDeliveryDate : undefined,
      authUserId,
      config,
      catalog,
      productionScore: requiredScore,
      sourceItem: sourceItem ?? undefined
    });
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authAccessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(order)
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message = typeof data?.error === "string" ? data.error : "บันทึกคำสั่งซื้อไม่สำเร็จ";
      toast.error(message);
      return;
    }

    if (data?.lineNotification?.ok === false && typeof data.lineNotification.error === "string") {
      toast.warning(`บันทึกคำสั่งซื้อแล้ว แต่ LINE ยังไม่แจ้งเตือน: ${data.lineNotification.error}`);
    }

    saveOrder(order);
    if (sourceItem) clearQuickOrder();

    router.push("/order/success");
  }

  if (!isReady || !sourceChecked || !fulfillmentChecked || (!authChecked && !needsLogin)) {
    return (
      <>
        <Navbar />
        <main className="container-page min-h-screen py-8">
          <div className="rounded-bloom border border-pink-100 bg-white p-5 text-sm font-semibold text-zinc-600 shadow-sm">
            กำลังตรวจสอบบัญชีลูกค้าและข้อมูลคำสั่งซื้อ...
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (wantsQuickOrder && !sourceItem) {
    return (
      <>
        <Navbar />
        <main className="container-page min-h-screen py-8">
          <section className="mx-auto max-w-2xl rounded-bloom border border-pink-100 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-blossom">ยังไม่พบแบบที่เลือก</p>
            <h1 className="mt-1 text-3xl font-bold text-ink">เลือกแบบอีกครั้งก่อนสั่งซื้อ</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              ข้อมูลแบบในเครื่องหายไป หรือรายการนี้ไม่อยู่ในระบบแล้ว กรุณากลับไปเลือกผลงานหรือสินค้าใหม่อีกครั้ง
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/gallery" className="touch-target rounded-soft bg-blossom px-5 py-3 font-bold text-white">
                เลือกจากผลงาน
              </Link>
              <Link href="/design" className="touch-target rounded-soft border border-pink-100 bg-white px-5 py-3 font-bold text-ink">
                ออกแบบเอง
              </Link>
            </div>
          </section>
        </main>
        <Footer />
      </>
    );
  }

  if (needsLogin) {
    return (
      <>
        <Navbar />
        <main className="container-page grid min-h-screen gap-6 py-8 lg:grid-cols-[1fr_360px]">
          <section className="rounded-bloom border border-pink-100 bg-white p-5 shadow-sm">
            <div className="mb-6 rounded-bloom border border-pink-100 bg-blush/70 p-4">
              <p className="text-sm font-semibold text-blossom">เข้าสู่ระบบก่อนสั่งซื้อ</p>
              <h1 className="mt-1 text-2xl font-bold text-ink">ใช้บัญชีลูกค้าเพื่อยืนยันคำสั่งซื้อ</h1>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                ระบบจะใช้บัญชีนี้เก็บประวัติคำสั่งซื้อ ข้อมูลติดต่อ การชำระเงิน และการติดตามสถานะ
              </p>
            </div>
            <LoginForm
              redirectTo={getCurrentCheckoutPath()}
              showBackLink={false}
              onSignedIn={() => {
                setNeedsLogin(false);
                setAuthChecked(false);
                setAuthRefreshKey((current) => current + 1);
              }}
            />
          </section>
          {sourceItem ? <QuickOrderSummary item={sourceItem} /> : <PriceSummary />}
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="container-page grid min-h-screen gap-6 py-8 lg:grid-cols-[1fr_360px]">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 rounded-bloom border border-pink-100 bg-white p-5 shadow-sm">
          <div>
            <p className="text-sm font-semibold text-blossom">
              {sourceItem ? "สั่งซื้อจากแบบสำเร็จรูป" : "สั่งซื้อด้วยบัญชีที่เข้าสู่ระบบ"}
            </p>
            <h1 className="text-3xl font-bold text-ink">ยืนยันคำสั่งพรีออเดอร์</h1>
            {sourceItem ? <p className="mt-2 text-sm leading-6 text-zinc-600">คุณกำลังสั่งซื้อ “{sourceItem.title}” โดยไม่ต้องออกแบบใหม่</p> : null}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="ชื่อ" error={errors.customerName?.message}><input {...register("customerName")} className="input" /></Field>
            <Field label="เบอร์โทร" error={errors.phone?.message}><input {...register("phone")} className="input" inputMode="numeric" /></Field>
            <Field label="LINE ID" error={errors.lineId?.message}><input {...register("lineId")} className="input" /></Field>
            <Field label="อีเมล ไม่บังคับ" error={errors.email?.message}><input {...register("email")} className="input" type="email" /></Field>
          </div>
          <div>
            <h2 className="mb-3 text-lg font-bold">วิธีรับสินค้า</h2>
            <p className="mb-3 inline-flex items-center gap-2 text-sm text-zinc-600">
              เลือกวิธีที่สะดวกที่สุด เงื่อนไขวัน เวลา และสถานที่จะเปลี่ยนตามวิธีที่เลือก
              <HelpTooltip content="รับที่ร้าน/โรงเรียน/นัดรับ มักต้องเลือกวันและเวลา ส่วนจัดส่งจะคำนวณวันจัดส่งโดยประมาณและให้กรอกที่อยู่จัดส่ง" />
            </p>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {enabledMethods.map((method) => (
                <label
                  key={method.id}
                  className={`touch-target flex min-h-24 cursor-pointer gap-3 rounded-soft border p-3 transition ${
                    selectedMethod?.id === method.id ? "border-blossom bg-blush shadow-soft" : "border-pink-100 bg-white hover:border-blossom/60"
                  }`}
                >
                  <input type="radio" value={method.label} {...register("pickupMethod")} className="mt-1 accent-blossom" />
                  <span className="min-w-0">
                    <span className="block font-bold text-ink">{method.label}</span>
                    <span className="mt-1 block text-xs leading-5 text-zinc-600">{method.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
          {selectedMethod?.requiresDate ? (
            <div>
              <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                <h2 className="text-lg font-bold">{selectedMethod.dateLabel}</h2>
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600">
                  ใช้คะแนนผลิต {requiredScore.toLocaleString("th-TH")} คะแนน
                  <HelpTooltip content="คะแนนผลิตใช้คำนวณว่าคิววันนั้นยังรับงานเพิ่มได้ไหม ถ้าคะแนนเกินคิว ระบบจะปิดวันนั้นให้เลือกไม่ได้" side="left" />
                </p>
              </div>
              <CapacityCalendar
                selected={pickupDate}
                requiredScore={requiredScore}
                fullDateNote={fulfillmentSettings?.fullDateNote}
                onSelect={(date) => setValue("pickupDate", date, { shouldValidate: true })}
              />
              <p className="mt-2 rounded-soft bg-blush/60 px-3 py-2 text-sm leading-6 text-zinc-600">
                {fulfillmentSettings?.fullDateNote}
              </p>
              {errors.pickupDate ? <p className="mt-2 text-sm text-red-600">{errors.pickupDate.message}</p> : null}
            </div>
          ) : (
            <section className="rounded-bloom border border-pink-100 bg-blush/60 p-4">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-blossom">
                จัดส่ง
                <HelpTooltip content="วิธีจัดส่งไม่ต้องเลือกวันรับ ระบบจะใช้คิวผลิตบวกจำนวนวันที่ร้านเผื่อจัดส่ง แล้วแสดงวันจัดส่งโดยประมาณ" />
              </p>
              <h2 className="mt-1 text-xl font-bold text-ink">คาดว่าจะจัดส่งประมาณ {estimatedDeliveryDate ? formatThaiIsoDate(estimatedDeliveryDate) : "-"}</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                {fulfillmentSettings?.deliveryNote}
              </p>
              <p className="mt-2 text-sm font-semibold text-ink">
                หลังร้านส่งของแล้ว เลขพัสดุจะแสดงในหน้าติดตามคำสั่งซื้อ
              </p>
            </section>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {selectedMethod?.requiresTime ? (
              <Field label={selectedMethod.timeLabel} error={errors.pickupTime?.message}>
                <select {...register("pickupTime")} className="input">
                  {(fulfillmentSettings?.pickupTimeSlots.length ? fulfillmentSettings.pickupTimeSlots : ["16:00"]).map((time) => <option key={time}>{time}</option>)}
                </select>
              </Field>
            ) : null}
            {selectedMethod?.requiresLocation ? (
              <Field label={selectedMethod.locationLabel} error={errors.pickupLocation?.message}>
                <input
                  {...register("pickupLocation")}
                  className="input"
                  placeholder={selectedMethod.id === "delivery" ? "บ้านเลขที่ ถนน ตำบล/แขวง อำเภอ/เขต จังหวัด รหัสไปรษณีย์" : selectedMethod.defaultLocation}
                />
              </Field>
            ) : null}
          </div>
          <Field label="หมายเหตุ" error={errors.note?.message}><textarea {...register("note")} className="input min-h-28" maxLength={300} /></Field>
          <ImageUploader />
          <button type="submit" disabled={isSubmitting} className="touch-target w-full rounded-soft bg-blossom px-5 py-3 font-bold text-white disabled:opacity-50">ส่งคำสั่งพรีออเดอร์</button>
        </form>
        {sourceItem ? <QuickOrderSummary item={sourceItem} /> : <PriceSummary />}
      </main>
      <Footer />
      <style jsx global>{`.input{width:100%;border:1px solid #f8bbd0;border-radius:16px;padding:12px;background:#fff;min-height:44px}`}</style>
    </>
  );
}

function QuickOrderSummary({ item }: { item: OrderSourceItem }) {
  return (
    <aside className="rounded-bloom border border-pink-100 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-bold text-ink">สรุปรายการ</h2>
      {item.imageUrl ? (
        <div className="mt-4 overflow-hidden rounded-soft border border-pink-100 bg-blush">
          <img
            src={item.imageUrl}
            alt={item.title}
            draggable={false}
            onContextMenu={(event) => event.preventDefault()}
            className="max-h-72 w-full select-none object-contain"
          />
        </div>
      ) : null}
      <div className="mt-4 space-y-3 text-sm">
        <div>
          <p className="text-zinc-500">ชื่อแบบ</p>
          <p className="font-bold text-ink">{item.title}</p>
        </div>
        {item.description ? (
          <div>
            <p className="text-zinc-500">รายละเอียด</p>
            <p className="font-semibold text-ink">{item.description}</p>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-4">
          <span className="text-zinc-600">คะแนนการผลิต</span>
          <span className="font-semibold text-ink">{item.productionScore.toLocaleString("th-TH")} คะแนน</span>
        </div>
      </div>
      <div className="mt-4 border-t border-pink-100 pt-4">
        <div className="flex items-center justify-between">
          <span className="font-bold text-ink">ยอดรวม</span>
          <span className="text-2xl font-bold text-blossom">{item.price.toLocaleString("th-TH")} บาท</span>
        </div>
      </div>
    </aside>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-ink">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-sm text-red-600">{error}</span> : null}
    </label>
  );
}

export default function CheckoutPage() {
  return <ConfiguratorProvider><CheckoutForm /></ConfiguratorProvider>;
}
