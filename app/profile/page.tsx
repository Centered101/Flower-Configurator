"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { ReactNode } from "react";
import { CalendarCheck, Heart, Loader2, LogOut, Mail, MapPin, MessageCircle, PackageCheck, Phone, Save, Search, Trash2, UserRound } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { Footer } from "@/components/Footer";
import { HelpTooltip } from "@/components/HelpTooltip";
import { Navbar } from "@/components/Navbar";
import { ADMIN_GALLERY_KEY, ADMIN_PRODUCTS_KEY, fetchPublicGalleryItems, fetchPublicProducts, readAdminItems, saveAdminItems, type AdminGalleryItem, type AdminProduct } from "@/lib/admin-data";
import { formatThaiDateTime, formatThaiIsoDate } from "@/lib/date-format";
import { clearAllFavorites, getFavoriteGalleryIds, getFavoriteProductIds, listenForFavoriteUpdates, syncFavoritesWithSupabase } from "@/lib/favorites";
import { deleteOrdersForCustomer, getStoredOrders, listenForOrderUpdates, sortOrdersByOrderNumber } from "@/lib/orders";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { CustomerOrder, OrderStatus } from "@/lib/types";

const orderStatusLabels: Record<OrderStatus, string> = {
  pending_review: "รอตรวจสอบ",
  design_confirmed: "ยืนยันแบบแล้ว",
  awaiting_payment: "รอชำระเงิน",
  preparing_materials: "เตรียมวัสดุ",
  in_production: "กำลังผลิต",
  quality_check: "ตรวจคุณภาพ",
  ready: "พร้อมรับสินค้า",
  completed: "สำเร็จ",
  cancelled: "ยกเลิก"
};

const paymentStatusLabels: Record<CustomerOrder["paymentStatus"], string> = {
  pending: "รอตรวจสอบ",
  deposit_due: "รอมัดจำ",
  awaiting_slip_review: "รอตรวจสลิป",
  paid: "ชำระแล้ว",
  failed: "ไม่สำเร็จ",
  refunded: "คืนเงินแล้ว"
};

function getFulfillmentText(order: CustomerOrder) {
  if (order.estimatedDeliveryDate || order.pickupMethod.includes("จัดส่ง")) {
    return `จัดส่งประมาณ ${formatThaiIsoDate(order.estimatedDeliveryDate ?? order.pickupDate)}`;
  }

  return `รับ: ${formatThaiIsoDate(order.pickupDate)} ${order.pickupTime}`;
}

const DATA_DELETION_REQUESTS_KEY = "flower-data-deletion-requests";

type DataDeletionRequest = {
  id: string;
  userId: string;
  email: string;
  deletedOrders: number;
  deletedFavorites: number;
  status: "pending";
  createdAt: string;
};

type CustomerProfile = {
  displayName: string;
  firstName: string;
  lastName: string;
  phone: string;
  lineId: string;
  address: string;
};

function getDataDeletionRequests() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(DATA_DELETION_REQUESTS_KEY) ?? "[]") as DataDeletionRequest[];
  } catch {
    return [];
  }
}

function saveDataDeletionRecord(request: DataDeletionRequest) {
  const next = [request, ...getDataDeletionRequests().filter((item) => item.userId !== request.userId)];
  window.localStorage.setItem(DATA_DELETION_REQUESTS_KEY, JSON.stringify(next));
  return next;
}

function mergeOrders(left: CustomerOrder[], right: CustomerOrder[]) {
  const map = new Map<string, CustomerOrder>();
  for (const order of [...left, ...right]) {
    map.set(order.orderNumber || order.id, order);
  }
  return sortOrdersByOrderNumber(Array.from(map.values()));
}

function paymentBadgeClass(status: CustomerOrder["paymentStatus"]) {
  if (status === "paid") return "bg-green-50 text-green-700";
  if (status === "failed") return "bg-red-50 text-red-700";
  if (status === "awaiting_slip_review") return "bg-yellow-50 text-yellow-700";
  return "bg-blush text-blossom";
}

export default function CustomerProfilePage() {
  const router = useRouter();
  const [supabase, setSupabase] = useState<ReturnType<typeof createSupabaseBrowserClient> | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [lineId, setLineId] = useState("");
  const [address, setAddress] = useState("");
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [favoriteItems, setFavoriteItems] = useState<AdminGalleryItem[]>([]);
  const [favoriteProducts, setFavoriteProducts] = useState<AdminProduct[]>([]);
  const [deletionRequests, setDeletionRequests] = useState<DataDeletionRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingData, setIsDeletingData] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let client: ReturnType<typeof createSupabaseBrowserClient>;

    try {
      client = createSupabaseBrowserClient();
      setSupabase(client);
    } catch {
      toast.error("ยังไม่ได้ตั้งค่า Supabase สำหรับระบบลูกค้า");
      setIsLoading(false);
      router.replace("/login?redirect=/profile");
      return () => {
        isMounted = false;
      };
    }

    client.auth.getUser().then(async ({ data }) => {
      if (!isMounted) return;

      if (!data.user) {
        router.replace("/login?redirect=/profile");
        return;
      }

      setUser(data.user);
      const metadataProfile = {
        firstName: typeof data.user.user_metadata?.first_name === "string" ? data.user.user_metadata.first_name : "",
        lastName: typeof data.user.user_metadata?.last_name === "string" ? data.user.user_metadata.last_name : "",
        phone: typeof data.user.user_metadata?.phone === "string" ? data.user.user_metadata.phone : "",
        lineId:
          typeof data.user.user_metadata?.line_id === "string" ? data.user.user_metadata.line_id :
          typeof data.user.user_metadata?.lineId === "string" ? data.user.user_metadata.lineId :
          "",
        address: typeof data.user.user_metadata?.address === "string" ? data.user.user_metadata.address : ""
      };
      let profile = metadataProfile;

      try {
        const response = await fetch("/api/profile", { cache: "no-store" });
        if (response.ok) {
          const savedProfile = await response.json() as CustomerProfile;
          profile = {
            firstName: savedProfile.firstName ?? metadataProfile.firstName,
            lastName: savedProfile.lastName ?? metadataProfile.lastName,
            phone: savedProfile.phone ?? metadataProfile.phone,
            lineId: savedProfile.lineId ?? metadataProfile.lineId,
            address: savedProfile.address ?? metadataProfile.address
          };
        }
      } catch {
        profile = metadataProfile;
      }

      if (!isMounted) return;
      setFirstName(profile.firstName);
      setLastName(profile.lastName);
      setPhone(profile.phone);
      setLineId(profile.lineId);
      setAddress(profile.address);
      setDeletionRequests(getDataDeletionRequests().filter((request) => request.userId === data.user.id));
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [router]);

  useEffect(() => {
    if (!user) return;
    const userId = user.id;
    const userEmail = user.email?.toLowerCase();

    function syncOrders() {
      const localOrders = getStoredOrders().filter((order) => (
        order.authUserId === userId || (userEmail && order.email?.toLowerCase() === userEmail)
      ));
      setOrders((current) => mergeOrders(localOrders, current));
    }

    syncOrders();
    fetch("/api/profile/orders", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : [])
      .then((remoteOrders: CustomerOrder[]) => {
        const localOrders = getStoredOrders().filter((order) => (
          order.authUserId === userId || (userEmail && order.email?.toLowerCase() === userEmail)
        ));
        setOrders((current) => mergeOrders([...localOrders, ...current], remoteOrders));
      })
      .catch(() => undefined);

    return listenForOrderUpdates(syncOrders);
  }, [user]);

  useEffect(() => {
    function syncFavorites() {
      const favoriteGalleryIds = getFavoriteGalleryIds();
      const favoriteProductIds = getFavoriteProductIds();
      const galleryItems = readAdminItems<AdminGalleryItem>(ADMIN_GALLERY_KEY);
      const productItems = readAdminItems<AdminProduct>(ADMIN_PRODUCTS_KEY);
      setFavoriteItems(galleryItems.filter((item) => favoriteGalleryIds.includes(item.id)));
      setFavoriteProducts(productItems.filter((item) => favoriteProductIds.includes(item.id)));
      Promise.all([
        fetchPublicGalleryItems(),
        fetchPublicProducts()
      ])
        .then(([items, products]) => {
          const nextGalleryIds = getFavoriteGalleryIds();
          const nextProductIds = getFavoriteProductIds();
          saveAdminItems(ADMIN_GALLERY_KEY, items);
          saveAdminItems(ADMIN_PRODUCTS_KEY, products);
          setFavoriteItems(items.filter((item) => nextGalleryIds.includes(item.id)));
          setFavoriteProducts(products.filter((item) => nextProductIds.includes(item.id)));
        })
        .catch(() => undefined);
    }

    syncFavorites();
    syncFavoritesWithSupabase().then((favorites) => {
      const galleryItems = readAdminItems<AdminGalleryItem>(ADMIN_GALLERY_KEY);
      const productItems = readAdminItems<AdminProduct>(ADMIN_PRODUCTS_KEY);
      setFavoriteItems(galleryItems.filter((item) => favorites.galleryIds.includes(item.id)));
      setFavoriteProducts(productItems.filter((item) => favorites.productIds.includes(item.id)));
      return Promise.all([fetchPublicGalleryItems(), fetchPublicProducts()]).then(([gallery, products]) => {
        saveAdminItems(ADMIN_GALLERY_KEY, gallery);
        saveAdminItems(ADMIN_PRODUCTS_KEY, products);
        setFavoriteItems(gallery.filter((item) => favorites.galleryIds.includes(item.id)));
        setFavoriteProducts(products.filter((item) => favorites.productIds.includes(item.id)));
      });
    }).catch(() => undefined);
    return listenForFavoriteUpdates(syncFavorites);
  }, []);

  async function handleSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || isSaving) return;

    setIsSaving(true);
    const nextDisplayName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
    const response = await fetch("/api/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        firstName,
        lastName,
        phone,
        lineId,
        address
      })
    });
    const profile = await response.json().catch(() => null) as (CustomerProfile & { error?: string }) | null;

    setIsSaving(false);

    if (!response.ok) {
      toast.error(profile?.error ?? "บันทึกโปรไฟล์ไม่สำเร็จ");
      return;
    }

    setFirstName(profile?.firstName ?? firstName.trim());
    setLastName(profile?.lastName ?? lastName.trim());
    setPhone(profile?.phone ?? phone.trim());
    setLineId(profile?.lineId ?? lineId.trim());
    setAddress(profile?.address ?? address.trim());
    setUser((current) => current ? {
      ...current,
      user_metadata: {
        ...(current.user_metadata ?? {}),
        first_name: profile?.firstName ?? firstName.trim(),
        last_name: profile?.lastName ?? lastName.trim(),
        display_name: profile?.displayName ?? (nextDisplayName || current.email?.split("@")[0] || "ลูกค้า"),
        phone: profile?.phone ?? phone.trim(),
        line_id: profile?.lineId ?? lineId.trim(),
        lineId: profile?.lineId ?? lineId.trim(),
        address: profile?.address ?? address.trim()
      }
    } : current);
    toast.success("บันทึกโปรไฟล์แล้ว");
  }

  async function signOutCustomerSession() {
    if (!supabase) return new Error("ยังไม่ได้ตั้งค่า Supabase สำหรับระบบลูกค้า");

    try {
      const { error } = await supabase.auth.signOut();
      if (!error) return null;
    } catch {
      // If the remote auth endpoint cannot be reached, clear the browser session below.
    }

    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      return error;
    } catch (error) {
      return error instanceof Error ? error : new Error("ออกจากระบบไม่สำเร็จ");
    }
  }

  async function handleDeleteMyData(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || isDeletingData) return;

    if (orders.some((order) => order.paymentStatus === "paid")) {
      toast.error("บัญชีนี้มีคำสั่งซื้อที่ชำระเงินแล้ว จึงยังลบบัญชีไม่ได้");
      return;
    }

    const confirmed = window.confirm("ยืนยันลบบัญชี Supabase/Auth และข้อมูลของบัญชีนี้หรือไม่? ถ้ามีคำสั่งซื้อที่ชำระแล้ว ระบบจะไม่อนุญาตให้ลบ");
    if (!confirmed) return;

    setIsDeletingData(true);

    const response = await fetch("/api/profile/delete-account", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        orders: orders.map((order) => ({
          orderNumber: order.orderNumber,
          paymentStatus: order.paymentStatus
        }))
      })
    });
    const result = await response.json().catch(() => ({})) as { error?: string };

    if (!response.ok) {
      toast.error(result.error ?? "ลบบัญชีไม่สำเร็จ");
      setIsDeletingData(false);
      return;
    }

    const deletedOrders = deleteOrdersForCustomer(user.id, user.email);
    const deletedFavorites = favoriteItems.length + favoriteProducts.length;
    clearAllFavorites();

    saveDataDeletionRecord({
      id: crypto.randomUUID(),
      userId: user.id,
      email: user.email ?? "",
      deletedOrders,
      deletedFavorites,
      status: "pending",
      createdAt: new Date().toISOString()
    });

    setFirstName("");
    setLastName("");
    setPhone("");
    setLineId("");
    setAddress("");
    setOrders([]);
    setFavoriteItems([]);
    setFavoriteProducts([]);
    setDeletionRequests([]);
    await signOutCustomerSession();
    setIsDeletingData(false);
    toast.success("ลบบัญชีและข้อมูลของบัญชีนี้แล้ว");
    router.replace("/");
    router.refresh();
  }

  async function handleSignOut() {
    if (isSigningOut) return;

    setIsSigningOut(true);
    const error = await signOutCustomerSession();

    if (error) {
      toast.error("ออกจากระบบไม่สำเร็จ");
      setIsSigningOut(false);
      return;
    }

    toast.success("ออกจากระบบแล้ว");
    router.replace("/");
    router.refresh();
  }

  const displayName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ")
    || (typeof user?.user_metadata?.display_name === "string" ? user.user_metadata.display_name : "")
    || user?.email?.split("@")[0]
    || "ลูกค้า";

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container-page flex-1 py-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-5">
            <p className="text-sm font-semibold text-blossom">บัญชีลูกค้า</p>
            <h1 className="mt-1 text-3xl font-bold text-ink">โปรไฟล์ของฉัน</h1>
          </div>

          {isLoading ? (
            <p className="mt-6 rounded-soft bg-blush p-4 text-sm font-semibold text-zinc-600">กำลังโหลดข้อมูลบัญชี...</p>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
              <form onSubmit={handleSaveProfile} className="rounded-bloom border border-pink-100 bg-white p-5 shadow-sm lg:sticky lg:top-24">
                <div className="flex items-center gap-4">
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-white text-blossom shadow-sm">
                    <UserRound size={24} aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-bold text-ink">{displayName}</p>
                    <p className="truncate text-sm font-semibold text-zinc-500">ลูกค้า</p>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    <ProfileField icon={<UserRound size={18} aria-hidden="true" />} label="ชื่อ">
                      <input
                        suppressHydrationWarning
                        type="text"
                        value={firstName}
                        onChange={(event) => setFirstName(event.target.value)}
                        className="w-full border-0 bg-transparent p-0 font-bold text-ink outline-none"
                        placeholder="ใส่ชื่อ"
                        autoComplete="given-name"
                      />
                    </ProfileField>
                    <ProfileField icon={<UserRound size={18} aria-hidden="true" />} label="นามสกุล">
                      <input
                        suppressHydrationWarning
                        type="text"
                        value={lastName}
                        onChange={(event) => setLastName(event.target.value)}
                        className="w-full border-0 bg-transparent p-0 font-bold text-ink outline-none"
                        placeholder="ใส่นามสกุล"
                        autoComplete="family-name"
                      />
                    </ProfileField>
                  </div>
                  <InfoCard icon={<Mail size={18} aria-hidden="true" />} label="อีเมล" value={user?.email ?? "-"} />
                  <ProfileField icon={<Phone size={18} aria-hidden="true" />} label="เบอร์โทร">
                    <input
                      suppressHydrationWarning
                      type="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      className="w-full border-0 bg-transparent p-0 font-bold text-ink outline-none"
                      placeholder="ใส่เบอร์โทร"
                      autoComplete="tel"
                    />
                  </ProfileField>
                  <ProfileField icon={<MessageCircle size={18} aria-hidden="true" />} label="LINE ID">
                    <input
                      suppressHydrationWarning
                      type="text"
                      value={lineId}
                      onChange={(event) => setLineId(event.target.value)}
                      className="w-full border-0 bg-transparent p-0 font-bold text-ink outline-none"
                      placeholder="ใส่ LINE ID"
                      autoComplete="off"
                    />
                  </ProfileField>
                  <ProfileField icon={<MapPin size={18} aria-hidden="true" />} label="ที่อยู่">
                    <textarea
                      suppressHydrationWarning
                      value={address}
                      onChange={(event) => setAddress(event.target.value)}
                      className="min-h-20 w-full resize-none border-0 bg-transparent p-0 font-bold text-ink outline-none"
                      placeholder="ใส่ที่อยู่"
                      autoComplete="street-address"
                    />
                  </ProfileField>
                </div>

                <button
                  type="submit"
                  suppressHydrationWarning
                  disabled={isSaving || isSigningOut}
                  className="touch-target mt-4 inline-flex w-full items-center justify-center gap-2 rounded-soft bg-blossom px-4 py-3 font-bold text-white shadow-soft transition-colors hover:bg-pink-400 disabled:cursor-not-allowed disabled:opacity-65"
                >
                  {isSaving ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Save size={18} aria-hidden="true" />}
                  {isSaving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                </button>

                <button
                  type="button"
                  suppressHydrationWarning
                  disabled={isSaving || isSigningOut}
                  onClick={handleSignOut}
                  className="touch-target mt-4 inline-flex w-full items-center justify-center gap-2 rounded-soft bg-ink px-4 py-3 font-bold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-65"
                >
                  <LogOut size={18} aria-hidden="true" />
                  {isSigningOut ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}
                </button>
              </form>

              <div className="space-y-5">
                <section className="space-y-3 rounded-bloom border border-pink-100 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <PackageCheck size={20} className="text-blossom" aria-hidden="true" />
                  <h2 className="font-bold text-ink">ประวัติคำสั่งซื้อและการจอง</h2>
                  <HelpTooltip content="แสดงคำสั่งซื้อที่ผูกกับบัญชีนี้ กดติดตามคำสั่งซื้อเพื่อดูสถานะล่าสุดได้ทันที" />
                </div>
                {orders.length ? (
                  <div className="space-y-3">
                    {orders.map((order) => (
                      <article key={order.id} className="rounded-soft border border-pink-100 bg-white p-4 shadow-sm">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-zinc-500">{order.orderNumber}</p>
                            <h3 className="text-lg font-bold text-ink">{order.customerName}</h3>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-3 py-1 text-sm font-bold ${paymentBadgeClass(order.paymentStatus)}`}>
                              {paymentStatusLabels[order.paymentStatus]}
                            </span>
                            {order.paymentStatus === "paid" && order.orderStatus !== "awaiting_payment" ? (
                              <span className="rounded-full bg-blush px-3 py-1 text-sm font-bold text-blossom">
                                {orderStatusLabels[order.orderStatus]}
                              </span>
                            ) : null}
                            <Link
                              href={`/track?order=${encodeURIComponent(order.orderNumber)}${order.phone ? `&phone=${encodeURIComponent(order.phone.slice(-4))}` : ""}`}
                              className="inline-flex items-center gap-1 rounded-full border border-pink-100 bg-white px-3 py-1 text-sm font-bold text-ink transition-colors hover:border-blossom hover:text-blossom focus:outline-none focus:ring-2 focus:ring-blossom/30"
                            >
                              <Search size={14} aria-hidden="true" />
                              ติดตามคำสั่งซื้อ
                            </Link>
                          </div>
                        </div>
                        <div className="mt-3 grid gap-2 text-sm text-zinc-600 sm:grid-cols-2">
                          <p className="flex items-center gap-2">
                            <CalendarCheck size={16} className="text-stem" aria-hidden="true" />
                            {getFulfillmentText(order)}
                          </p>
                          <p>ยอดรวม: <span className="font-bold text-ink">{order.total} บาท</span></p>
                          <p>มัดจำ: <span className="font-bold text-ink">{order.depositAmount} บาท</span></p>
                          <p>ชำระเงิน: <span className="font-bold text-ink">{paymentStatusLabels[order.paymentStatus]}</span></p>
                          {order.paymentSlip ? (
                            <p className="sm:col-span-2">
                              สลิป: <span className="font-bold text-ink">อัปโหลดแล้ว</span>
                              {order.paymentSlip.uploadedAt ? ` เมื่อ ${formatThaiDateTime(order.paymentSlip.uploadedAt)}` : ""}
                            </p>
                          ) : null}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-soft border border-pink-100 bg-white p-4 text-sm font-semibold text-zinc-600">ยังไม่มีประวัติคำสั่งซื้อหรือการจองในบัญชีนี้</p>
                )}
                </section>

                <section className="space-y-3 rounded-bloom border border-pink-100 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <Heart size={20} className="text-blossom" fill="currentColor" aria-hidden="true" />
                  <h2 className="font-bold text-ink">รายการที่ถูกใจ</h2>
                  <HelpTooltip content="รายการที่กดหัวใจจากหน้าแรกหรือแกลเลอรี จะถูกเก็บในบัญชีและกลับมาดูได้หลังเข้าสู่ระบบใหม่" />
                </div>
                {favoriteItems.length || favoriteProducts.length ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {favoriteProducts.map((item) => (
                      <article key={`product-${item.id}`} className="overflow-hidden rounded-soft border border-pink-100 bg-white shadow-sm">
                        {item.image ? (
                          <div className="relative h-52 overflow-hidden rounded-t-soft bg-blush">
                            <Image
                              src={item.image.url}
                              alt={item.name}
                              fill
                              sizes="(min-width: 1024px) 280px, (min-width: 640px) 45vw, 100vw"
                              draggable={false}
                              onContextMenu={(event) => event.preventDefault()}
                              className="select-none object-cover"
                            />
                          </div>
                        ) : (
                          <div className="h-52 bg-gradient-to-br from-blush via-white to-pink-100" />
                        )}
                        <div className="p-3">
                          <p className="mb-1 text-xs font-bold text-blossom">สินค้า</p>
                          <h3 className="font-bold text-ink">{item.name}</h3>
                          <p className="mt-1 text-sm text-zinc-600">{item.description}</p>
                          <p className="mt-2 font-bold text-blossom">{item.basePrice.toLocaleString("th-TH")} บาท</p>
                        </div>
                      </article>
                    ))}
                    {favoriteItems.map((item) => (
                      <article key={`gallery-${item.id}`} className="overflow-hidden rounded-soft border border-pink-100 bg-white shadow-sm">
                        {item.image ? (
                          <div className="relative h-52 overflow-hidden rounded-t-soft bg-blush">
                            <Image
                              src={item.image.url}
                              alt={item.title}
                              fill
                              sizes="(min-width: 1024px) 280px, (min-width: 640px) 45vw, 100vw"
                              draggable={false}
                              onContextMenu={(event) => event.preventDefault()}
                              className="select-none object-cover"
                            />
                          </div>
                        ) : (
                          <div className="h-52 bg-gradient-to-br from-blush via-white to-pink-100" />
                        )}
                        <div className="p-3">
                          <p className="mb-1 text-xs font-bold text-blossom">ผลงาน</p>
                          <h3 className="font-bold text-ink">{item.title}</h3>
                          <p className="mt-1 text-sm text-zinc-600">{item.flower} / {item.color} / {item.size}</p>
                          <p className="mt-2 font-bold text-blossom">{item.price} บาท</p>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-soft border border-pink-100 bg-white p-4 text-sm font-semibold text-zinc-600">ยังไม่มีรายการที่ถูกใจ กดหัวใจที่หน้าแรกหรือแกลเลอรีเพื่อเก็บไว้ดูทีหลัง</p>
                )}
                </section>

                <section className="space-y-3 rounded-bloom border border-pink-100 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Trash2 size={20} className="text-blossom" aria-hidden="true" />
                    <h2 className="font-bold text-ink">คำขอลบข้อมูล</h2>
                    <HelpTooltip content="ถ้ายังไม่ชำระเงิน ระบบลบบัญชีและข้อมูลที่เกี่ยวข้องได้ทันที แต่ถ้าชำระแล้วจะยังลบไม่ได้เพื่อเก็บหลักฐานคำสั่งซื้อ" />
                  </div>
                  <p className="text-sm leading-6 text-zinc-600">
                    ลบบัญชี Supabase/Auth และข้อมูลที่บัญชีนี้จัดการเองได้ ถ้ามีคำสั่งซื้อที่ชำระเงินแล้ว ระบบจะไม่อนุญาตให้ลบ
                    อ่านรายละเอียดได้ที่{" "}
                    <Link href="/data-deletion" className="font-bold text-blossom hover:text-ink">
                      การขอลบข้อมูล
                    </Link>
                  </p>
                  <form onSubmit={handleDeleteMyData} className="space-y-3">
                    <div className="rounded-soft border border-pink-100 bg-blush p-4 text-sm leading-6 text-zinc-700">
                      ถ้ายังไม่ชำระเงิน ระบบจะลบบัญชี Auth, ข้อมูลติดต่อ, ประวัติคำสั่งซื้อที่ผูกกับบัญชีนี้ และรายการที่ถูกใจทันที ถ้าชำระเงินแล้วต้องติดต่อร้านก่อนเพื่อป้องกันปัญหาการตรวจสอบคำสั่งซื้อ
                    </div>
                    <button
                      type="submit"
                      suppressHydrationWarning
                      disabled={isDeletingData || isSaving || isSigningOut}
                      className="touch-target inline-flex w-full items-center justify-center gap-2 rounded-soft bg-red-600 px-4 py-3 font-bold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-65"
                    >
                      {isDeletingData ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Trash2 size={18} aria-hidden="true" />}
                      {isDeletingData ? "กำลังลบบัญชี..." : "ลบบัญชีของฉัน"}
                    </button>
                  </form>
                  {deletionRequests.length ? (
                    <div className="rounded-soft border border-pink-100 bg-blush p-4 text-sm">
                      <p className="font-bold text-ink">การลบข้อมูลล่าสุด</p>
                      <p className="mt-1 text-zinc-600">{formatThaiIsoDate(deletionRequests[0].createdAt.slice(0, 10))}</p>
                      <p className="mt-2 font-semibold text-blossom">
                        ลบคำสั่งซื้อ {deletionRequests[0].deletedOrders} รายการ และรายการที่ถูกใจ {deletionRequests[0].deletedFavorites} รายการ
                      </p>
                    </div>
                  ) : null}
                </section>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function InfoCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-soft border border-pink-100 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-blossom">
        {icon}
        <span className="text-sm font-semibold text-zinc-500">{label}</span>
      </div>
      <p className="break-words font-bold text-ink">{value}</p>
    </div>
  );
}

function ProfileField({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <label className="block rounded-soft border border-pink-100 bg-white p-4 shadow-sm focus-within:border-blossom">
      <span className="mb-2 flex items-center gap-2 text-blossom">
        {icon}
        <span className="text-sm font-semibold text-zinc-500">{label}</span>
      </span>
      {children}
    </label>
  );
}
