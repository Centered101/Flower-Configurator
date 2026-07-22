import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type FulfillmentMethodId = "store" | "school" | "appointment" | "delivery";

export type FulfillmentMethod = {
  id: FulfillmentMethodId;
  label: string;
  description: string;
  enabled: boolean;
  requiresDate: boolean;
  requiresTime: boolean;
  requiresLocation: boolean;
  defaultLocation: string;
  dateLabel: string;
  timeLabel: string;
  locationLabel: string;
};

export type FulfillmentSettings = {
  methods: FulfillmentMethod[];
  pickupTimeSlots: string[];
  deliveryLeadDays: number;
  deliveryNote: string;
  fullDateNote: string;
  updatedAt?: string;
};

const FULFILLMENT_SETTINGS_KEY = "fulfillment_settings";

const defaultMethods: FulfillmentMethod[] = [
  {
    id: "store",
    label: "รับที่ร้าน",
    description: "ลูกค้ามารับสินค้าที่หน้าร้านตามวันที่และเวลาที่เลือก",
    enabled: true,
    requiresDate: true,
    requiresTime: true,
    requiresLocation: true,
    defaultLocation: "หน้าร้าน",
    dateLabel: "เลือกวันที่รับ",
    timeLabel: "เวลาที่ต้องการรับ",
    locationLabel: "สถานที่รับ"
  },
  {
    id: "school",
    label: "รับที่โรงเรียน",
    description: "นัดรับในพื้นที่โรงเรียนตามรอบที่ร้านเปิดให้รับ",
    enabled: true,
    requiresDate: true,
    requiresTime: true,
    requiresLocation: true,
    defaultLocation: "โรงเรียน",
    dateLabel: "เลือกวันที่รับ",
    timeLabel: "เวลาที่ต้องการรับ",
    locationLabel: "จุดรับสินค้า"
  },
  {
    id: "appointment",
    label: "นัดรับ",
    description: "ลูกค้าเลือกวัน เวลา และกรอกสถานที่นัดรับ",
    enabled: true,
    requiresDate: true,
    requiresTime: true,
    requiresLocation: true,
    defaultLocation: "",
    dateLabel: "เลือกวันที่นัดรับ",
    timeLabel: "เวลานัดรับ",
    locationLabel: "สถานที่นัดรับ"
  },
  {
    id: "delivery",
    label: "จัดส่ง",
    description: "ไม่ต้องเลือกวันรับ ระบบจะแจ้งวันจัดส่งโดยประมาณและเลขพัสดุเมื่อร้านส่งของแล้ว",
    enabled: true,
    requiresDate: false,
    requiresTime: false,
    requiresLocation: true,
    defaultLocation: "",
    dateLabel: "วันจัดส่งโดยประมาณ",
    timeLabel: "รอบจัดส่ง",
    locationLabel: "ที่อยู่จัดส่ง"
  }
];

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeTimeSlot(value: string) {
  const cleaned = value.trim();
  if (!/^\d{2}:\d{2}$/.test(cleaned)) return "";
  return cleaned;
}

function fallbackSettings(): FulfillmentSettings {
  return {
    methods: defaultMethods,
    pickupTimeSlots: ["10:00", "11:00", "13:00", "14:00", "16:00", "17:00", "18:00"],
    deliveryLeadDays: 2,
    deliveryNote: "จัดส่งหลังผลิตเสร็จ ระบบจะแจ้งเลขพัสดุในหน้าติดตามคำสั่งซื้อเมื่อร้านส่งของแล้ว",
    fullDateNote: "วันที่ขึ้นว่าคิวเต็มจะเลือกไม่ได้ กรุณาเลือกวันอื่นที่ยังมีคะแนนผลิตเพียงพอ"
  };
}

function parseMethod(value: unknown, fallback: FulfillmentMethod): FulfillmentMethod {
  const data = typeof value === "object" && value ? value as Partial<FulfillmentMethod> : {};

  return {
    id: fallback.id,
    label: clean(data.label) || fallback.label,
    description: clean(data.description) || fallback.description,
    enabled: typeof data.enabled === "boolean" ? data.enabled : fallback.enabled,
    requiresDate: typeof data.requiresDate === "boolean" ? data.requiresDate : fallback.requiresDate,
    requiresTime: typeof data.requiresTime === "boolean" ? data.requiresTime : fallback.requiresTime,
    requiresLocation: typeof data.requiresLocation === "boolean" ? data.requiresLocation : fallback.requiresLocation,
    defaultLocation: clean(data.defaultLocation),
    dateLabel: clean(data.dateLabel) || fallback.dateLabel,
    timeLabel: clean(data.timeLabel) || fallback.timeLabel,
    locationLabel: clean(data.locationLabel) || fallback.locationLabel
  };
}

function parseSettings(value: string | null | undefined): Partial<FulfillmentSettings> {
  if (!value) return {};

  try {
    const data = JSON.parse(value) as Partial<FulfillmentSettings>;
    const methods = defaultMethods.map((fallback) => {
      const saved = Array.isArray(data.methods)
        ? data.methods.find((method) => method?.id === fallback.id)
        : undefined;
      return parseMethod(saved, fallback);
    });
    const slots = Array.isArray(data.pickupTimeSlots)
      ? data.pickupTimeSlots.map((slot) => normalizeTimeSlot(String(slot))).filter(Boolean)
      : [];

    return {
      methods,
      pickupTimeSlots: slots,
      deliveryLeadDays: Math.max(0, Number(data.deliveryLeadDays ?? 2)),
      deliveryNote: clean(data.deliveryNote),
      fullDateNote: clean(data.fullDateNote),
      updatedAt: clean(data.updatedAt) || undefined
    };
  } catch {
    return {};
  }
}

export function getEnabledFulfillmentMethods(settings: FulfillmentSettings) {
  return settings.methods.filter((method) => method.enabled);
}

export function getFulfillmentMethod(settings: FulfillmentSettings, labelOrId: string) {
  return settings.methods.find((method) => method.id === labelOrId || method.label === labelOrId);
}

export function addDaysToIsoDate(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export async function readFulfillmentSettings(): Promise<FulfillmentSettings> {
  const fallback = fallbackSettings();

  try {
    const supabase = createSupabaseAdminClient();
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", FULFILLMENT_SETTINGS_KEY)
      .maybeSingle();
    const stored = parseSettings(data?.value);

    return {
      methods: stored.methods?.length ? stored.methods : fallback.methods,
      pickupTimeSlots: stored.pickupTimeSlots?.length ? stored.pickupTimeSlots : fallback.pickupTimeSlots,
      deliveryLeadDays: Number.isFinite(stored.deliveryLeadDays) ? Number(stored.deliveryLeadDays) : fallback.deliveryLeadDays,
      deliveryNote: stored.deliveryNote || fallback.deliveryNote,
      fullDateNote: stored.fullDateNote || fallback.fullDateNote,
      updatedAt: stored.updatedAt
    };
  } catch {
    return fallback;
  }
}

export async function saveFulfillmentSettings(input: Partial<FulfillmentSettings>) {
  const fallback = fallbackSettings();
  const methods = defaultMethods.map((method) => {
    const saved = input.methods?.find((item) => item.id === method.id);
    return parseMethod(saved, method);
  });
  const pickupTimeSlots = (input.pickupTimeSlots ?? [])
    .map((slot) => normalizeTimeSlot(String(slot)))
    .filter((slot, index, list) => slot && list.indexOf(slot) === index)
    .sort();

  if (!methods.some((method) => method.enabled)) {
    throw new Error("กรุณาเปิดใช้งานวิธีรับสินค้าอย่างน้อย 1 วิธี");
  }
  if (!pickupTimeSlots.length) {
    throw new Error("กรุณาเพิ่มเวลาให้ลูกค้าเลือกอย่างน้อย 1 เวลา");
  }

  const next: FulfillmentSettings = {
    methods,
    pickupTimeSlots,
    deliveryLeadDays: Math.max(0, Number(input.deliveryLeadDays ?? fallback.deliveryLeadDays)),
    deliveryNote: clean(input.deliveryNote) || fallback.deliveryNote,
    fullDateNote: clean(input.fullDateNote) || fallback.fullDateNote,
    updatedAt: new Date().toISOString()
  };

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("site_settings")
    .upsert({
      key: FULFILLMENT_SETTINGS_KEY,
      value: JSON.stringify(next)
    }, { onConflict: "key" });

  if (error) throw new Error(error.message);
  return next;
}
