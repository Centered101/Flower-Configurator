import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserFromRequest } from "@/lib/supabase/request-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type FavoriteType = "gallery" | "product";

type FavoriteRow = {
  item_type: FavoriteType;
  item_id: string;
};

type FavoritePayload = {
  itemType?: string;
  itemId?: string;
  favorite?: boolean;
  galleryIds?: unknown;
  productIds?: unknown;
};

function uniqueStrings(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim())));
}

function groupFavorites(rows: FavoriteRow[] = []) {
  return {
    galleryIds: rows.filter((item) => item.item_type === "gallery").map((item) => item.item_id),
    productIds: rows.filter((item) => item.item_type === "product").map((item) => item.item_id)
  };
}

function isFavoriteType(value: string | undefined): value is FavoriteType {
  return value === "gallery" || value === "product";
}

async function getAuthenticatedUser(request: Request): Promise<User | null> {
  const bearerUser = await getUserFromRequest(request);
  if (bearerUser) return bearerUser;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

async function readFavorites(userId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("customer_favorites")
    .select("item_type, item_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return groupFavorites((data ?? []) as FavoriteRow[]);
}

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนดูรายการถูกใจ" }, { status: 401 });

    return NextResponse.json(await readFavorites(user.id), {
      headers: { "Cache-Control": "no-store" }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "โหลดรายการถูกใจไม่สำเร็จ" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนบันทึกรายการถูกใจ" }, { status: 401 });

    const payload = await request.json().catch(() => ({})) as FavoritePayload;
    const galleryIds = uniqueStrings(payload.galleryIds);
    const productIds = uniqueStrings(payload.productIds);
    const rows = [
      ...galleryIds.map((itemId) => ({ user_id: user.id, item_type: "gallery", item_id: itemId })),
      ...productIds.map((itemId) => ({ user_id: user.id, item_type: "product", item_id: itemId }))
    ];

    if (rows.length) {
      const supabase = createSupabaseAdminClient();
      const { error } = await supabase
        .from("customer_favorites")
        .upsert(rows, { onConflict: "user_id,item_type,item_id", ignoreDuplicates: true });

      if (error) throw error;
    }

    return NextResponse.json(await readFavorites(user.id));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "บันทึกรายการถูกใจไม่สำเร็จ" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนบันทึกรายการถูกใจ" }, { status: 401 });

    const payload = await request.json().catch(() => ({})) as FavoritePayload;
    if (!isFavoriteType(payload.itemType) || !payload.itemId?.trim()) {
      return NextResponse.json({ error: "ข้อมูลรายการถูกใจไม่ถูกต้อง" }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    const itemId = payload.itemId.trim();

    if (payload.favorite === false) {
      const { error } = await supabase
        .from("customer_favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("item_type", payload.itemType)
        .eq("item_id", itemId);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("customer_favorites")
        .upsert({
          user_id: user.id,
          item_type: payload.itemType,
          item_id: itemId
        }, { onConflict: "user_id,item_type,item_id", ignoreDuplicates: true });

      if (error) throw error;
    }

    return NextResponse.json(await readFavorites(user.id));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "บันทึกรายการถูกใจไม่สำเร็จ" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนลบรายการถูกใจ" }, { status: 401 });

    const searchParams = new URL(request.url).searchParams;
    const itemType = searchParams.get("type") ?? undefined;
    const supabase = createSupabaseAdminClient();
    let query = supabase.from("customer_favorites").delete().eq("user_id", user.id);

    if (isFavoriteType(itemType)) {
      query = query.eq("item_type", itemType);
    }

    const { error } = await query;
    if (error) throw error;

    return NextResponse.json(await readFavorites(user.id));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ลบรายการถูกใจไม่สำเร็จ" },
      { status: 500 }
    );
  }
}
