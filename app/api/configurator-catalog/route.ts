import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ConfiguratorCatalog } from "@/lib/configurator-catalog";

type StemCategory = keyof ConfiguratorCatalog["stems"];

function indexById<T extends { id: string }>(items: T[]) {
  return Object.fromEntries(items.map((item) => [item.id, item]));
}

function mapStemCategory(category: string): StemCategory {
  if (category === "strength") return "strengths";
  if (category === "style") return "styles";
  if (category === "length") return "lengths";
  return "colors";
}

function inFilter(ids: string[]) {
  return `(${ids.map((id) => `"${id.replaceAll('"', '\\"')}"`).join(",")})`;
}

function isMissingSchemaColumn(error: { message?: string } | null | undefined, column: string) {
  const message = error?.message ?? "";
  return message.includes(column) && message.includes("schema cache");
}

export async function GET() {
  const supabase = createSupabaseAdminClient();
  const [productTypes, flowers, colors, stems, wrapping, ribbons, decorations, settings] = await Promise.all([
    supabase.from("configurator_product_types").select("*").order("sort_order", { ascending: true }),
    supabase.from("flower_types").select("*").order("sort_order", { ascending: true }),
    supabase.from("colors").select("*").order("sort_order", { ascending: true }),
    supabase.from("stems").select("*").order("sort_order", { ascending: true }),
    supabase.from("wrapping_options").select("*").order("sort_order", { ascending: true }),
    supabase.from("ribbon_options").select("*").order("sort_order", { ascending: true }),
    supabase.from("decoration_options").select("*").order("sort_order", { ascending: true }),
    supabase.from("site_settings").select("value").eq("key", "configurator_review_note").maybeSingle()
  ]);

  const error = productTypes.error ?? flowers.error ?? colors.error ?? stems.error ?? wrapping.error ?? ribbons.error ?? decorations.error ?? settings.error;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const stemGroups: ConfiguratorCatalog["stems"] = {
    strengths: {},
    styles: {},
    lengths: {},
    colors: {}
  };

  for (const item of stems.data ?? []) {
    const group = mapStemCategory(item.category);
    if (group === "colors") {
      stemGroups.colors[item.slug] = {
        id: item.slug,
        name: item.name_th,
        hex: item.metadata?.hex ?? "#2E7D32",
        price: Number(item.price_delta ?? 0)
      };
    } else {
      stemGroups[group][item.slug] = {
        id: item.slug,
        name: item.name_th,
        description: item.description ?? "",
        price: Number(item.price_delta ?? 0)
      };
    }
  }

  const catalog: ConfiguratorCatalog = {
    productTypes: (productTypes.data ?? []).map((item) => ({
      id: item.slug,
      name: item.name_th,
      description: item.description ?? "",
      price: Number(item.base_price ?? 0),
      baseQuantity: Number(item.base_quantity ?? 1),
      productionScore: Number(item.production_score ?? 1),
      productionDays: Number(item.production_days ?? 1),
      imageTone: item.image_tone ?? "#FCE4EC"
    })),
    flowerTypes: (flowers.data ?? []).map((item) => ({
      id: item.slug,
      name: item.name_th,
      englishName: item.name_en,
      description: item.description ?? "",
      price: Number(item.price_delta ?? 0),
      available: Boolean(item.is_available),
      materialStock: Number(item.material_stock ?? 0)
    })),
    colors: (colors.data ?? []).map((item) => ({
      id: item.slug,
      name: item.name_th,
      hex: item.hex,
      price: Number(item.price_delta ?? 0),
      inStock: Boolean(item.is_in_stock),
      tone: item.tone ?? "soft"
    })),
    stems: stemGroups,
    wrappingOptions: indexById((wrapping.data ?? []).map((item) => ({
      id: item.slug,
      name: item.name_th,
      description: item.description ?? "",
      price: Number(item.price_delta ?? 0),
      color: item.metadata?.color ?? "#FCE4EC"
    }))),
    ribbonOptions: indexById((ribbons.data ?? []).map((item) => ({
      id: item.slug,
      name: item.name_th,
      price: Number(item.price_delta ?? 0),
      color: item.color ?? "transparent"
    }))),
    decorationOptions: indexById((decorations.data ?? []).map((item) => ({
      id: item.slug,
      name: item.name_th,
      description: item.description ?? "",
      price: Number(item.price_delta ?? 0)
    }))),
    reviewNote: String(settings.data?.value ?? "ราคานี้เป็นราคาประมาณการ ร้านจะตรวจสอบและยืนยันอีกครั้งก่อนเริ่มผลิต")
  };

  return NextResponse.json(catalog);
}

export async function PUT(request: Request) {
  const catalog = await request.json() as ConfiguratorCatalog;
  const supabase = createSupabaseAdminClient();

  const productTypes = catalog.productTypes.map((item, index) => ({
    slug: item.id,
    name_th: item.name,
    description: item.description,
    base_price: item.price,
    base_quantity: item.baseQuantity,
    production_score: item.productionScore,
    production_days: item.productionDays,
    image_tone: item.imageTone,
    is_active: true,
    sort_order: index
  }));

  let productTypeUpsertError: { message: string } | null = null;
  if (productTypes.length) {
    const productUpsert = await supabase.from("configurator_product_types").upsert(productTypes, { onConflict: "slug" });
    productTypeUpsertError = isMissingSchemaColumn(productUpsert.error, "image_tone")
      ? (await supabase.from("configurator_product_types").upsert(productTypes.map(({ image_tone: _imageTone, ...item }) => item), { onConflict: "slug" })).error
      : productUpsert.error;
  }

  const stems = [
    ...Object.values(catalog.stems.strengths).map((item, index) => ({
      slug: item.id,
      name_th: item.name,
      description: item.description ?? "",
      category: "strength",
      price_delta: item.price,
      metadata: {},
      sort_order: index
    })),
    ...Object.values(catalog.stems.styles).map((item, index) => ({
      slug: item.id,
      name_th: item.name,
      description: item.description ?? "",
      category: "style",
      price_delta: item.price,
      metadata: {},
      sort_order: index
    })),
    ...Object.values(catalog.stems.lengths).map((item, index) => ({
      slug: item.id,
      name_th: item.name,
      description: item.description ?? "",
      category: "length",
      price_delta: item.price,
      metadata: {},
      sort_order: index
    })),
    ...Object.values(catalog.stems.colors).map((item, index) => ({
      slug: item.id,
      name_th: item.name,
      description: "",
      category: "color",
      price_delta: item.price,
      metadata: { hex: item.hex },
      sort_order: index
    }))
  ];

  const operations = await Promise.all([
    catalog.flowerTypes.length ? supabase.from("flower_types").upsert(catalog.flowerTypes.map((item, index) => ({ slug: item.id, name_th: item.name, name_en: item.englishName, description: item.description, price_delta: item.price, material_stock: item.materialStock, is_available: item.available, sort_order: index })), { onConflict: "slug" }) : Promise.resolve({ error: null }),
    catalog.colors.length ? supabase.from("colors").upsert(catalog.colors.map((item, index) => ({ slug: item.id, name_th: item.name, hex: item.hex, price_delta: item.price, is_in_stock: item.inStock, tone: item.tone, sort_order: index })), { onConflict: "slug" }) : Promise.resolve({ error: null }),
    stems.length ? supabase.from("stems").upsert(stems, { onConflict: "slug" }) : Promise.resolve({ error: null }),
    Object.keys(catalog.wrappingOptions).length ? supabase.from("wrapping_options").upsert(Object.values(catalog.wrappingOptions).map((item, index) => ({ slug: item.id, name_th: item.name, description: item.description, price_delta: item.price, metadata: { color: item.color }, is_active: true, sort_order: index })), { onConflict: "slug" }) : Promise.resolve({ error: null }),
    Object.keys(catalog.ribbonOptions).length ? supabase.from("ribbon_options").upsert(Object.values(catalog.ribbonOptions).map((item, index) => ({ slug: item.id, name_th: item.name, price_delta: item.price, color: item.color, is_active: true, sort_order: index })), { onConflict: "slug" }) : Promise.resolve({ error: null }),
    Object.keys(catalog.decorationOptions).length ? supabase.from("decoration_options").upsert(Object.values(catalog.decorationOptions).map((item, index) => ({ slug: item.id, name_th: item.name, description: item.description, price_delta: item.price, is_active: true, sort_order: index })), { onConflict: "slug" }) : Promise.resolve({ error: null }),
    supabase.from("site_settings").upsert({ key: "configurator_review_note", value: catalog.reviewNote }, { onConflict: "key" })
  ]);

  const error = productTypeUpsertError ?? operations.find((operation) => operation.error)?.error;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const productIds = catalog.productTypes.map((item) => item.id);
  const flowerIds = catalog.flowerTypes.map((item) => item.id);
  const colorIds = catalog.colors.map((item) => item.id);
  const stemIds = stems.map((item) => item.slug);
  const wrappingIds = Object.keys(catalog.wrappingOptions);
  const ribbonIds = Object.keys(catalog.ribbonOptions);
  const decorationIds = Object.keys(catalog.decorationOptions);

  const cleanup = await Promise.all([
    productIds.length ? supabase.from("configurator_product_types").update({ is_active: false }).not("slug", "in", inFilter(productIds)) : Promise.resolve({ error: null }),
    flowerIds.length ? supabase.from("flower_types").update({ is_available: false }).not("slug", "in", inFilter(flowerIds)) : Promise.resolve({ error: null }),
    colorIds.length ? supabase.from("colors").delete().not("slug", "in", inFilter(colorIds)) : Promise.resolve({ error: null }),
    stemIds.length ? supabase.from("stems").delete().not("slug", "in", inFilter(stemIds)) : Promise.resolve({ error: null }),
    wrappingIds.length ? supabase.from("wrapping_options").update({ is_active: false }).not("slug", "in", inFilter(wrappingIds)) : Promise.resolve({ error: null }),
    ribbonIds.length ? supabase.from("ribbon_options").update({ is_active: false }).not("slug", "in", inFilter(ribbonIds)) : Promise.resolve({ error: null }),
    decorationIds.length ? supabase.from("decoration_options").update({ is_active: false }).not("slug", "in", inFilter(decorationIds)) : Promise.resolve({ error: null })
  ]);

  const cleanupError = cleanup.find((operation) => operation.error)?.error;
  if (cleanupError) {
    return NextResponse.json({ error: cleanupError.message }, { status: 500 });
  }

  return GET();
}
