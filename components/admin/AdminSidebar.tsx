"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Boxes, CalendarDays, Flower2, LayoutDashboard, LogOut, Package, Settings, ShieldCheck, SlidersHorizontal, UserRound, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { getUnreadOrdersCount, listenForOrderUpdates } from "@/lib/orders";

const nav = [
  [LayoutDashboard, "ภาพรวม", "/admin"],
  [Package, "คำสั่งซื้อ", "/admin/orders"],
  [CalendarDays, "คิวการผลิต", "/admin/queue"],
  [SlidersHorizontal, "ตัวเลือกออกแบบ", "/admin/configurator"],
  [Flower2, "สินค้า", "/admin/products"],
  [Boxes, "วัสดุ", "/admin/materials"],
  [BarChart3, "แกลเลอรี", "/admin/gallery"],
  [Users, "ลูกค้า", "/admin/customers"],
  [ShieldCheck, "ผู้ดูแล", "/admin/members"],
  [Settings, "ตั้งค่า", "/admin/settings"]
] as const;

const roleLabels = {
  owner: "Owner",
  superadmin: "Superadmin",
  admin: "Admin"
} as const;

export function AdminSidebar({
  isOpen,
  setIsOpen,
  isSigningOut,
  onSignOut
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  isSigningOut: boolean;
  onSignOut: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [profile, setProfile] = useState<{ username: string; displayName: string; role?: keyof typeof roleLabels } | null>(null);
  const [unreadOrders, setUnreadOrders] = useState(0);

  useEffect(() => {
    let isMounted = true;

    fetch("/api/admin/me")
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (isMounted && data) {
          setProfile({
            username: data.username,
            displayName: data.displayName || data.username,
            role: data.role
          });
        }
      })
      .catch(() => {
        if (isMounted) setProfile(null);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    function syncUnreadOrders() {
      setUnreadOrders(getUnreadOrdersCount());
    }

    syncUnreadOrders();
    return listenForOrderUpdates(syncUnreadOrders);
  }, []);

  async function handleSignOut() {
    setIsOpen(false);
    await onSignOut();
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-ink/35 backdrop-blur-[2px] transition-opacity duration-300 2xl:hidden ${
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(82vw,320px)] flex-col border-r border-pink-100 bg-white px-4 py-5 shadow-soft transition-transform duration-300 ease-out 2xl:sticky 2xl:inset-auto 2xl:top-24 2xl:z-30 2xl:h-[calc(100vh-8rem)] 2xl:w-auto 2xl:translate-x-0 2xl:rounded-bloom 2xl:border 2xl:p-4 2xl:shadow-sm ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <p className="mb-4 text-sm font-bold text-blossom">ผู้ดูแลร้าน</p>
        <nav className="grid flex-1 content-start gap-2 overflow-y-auto pr-1 2xl:gap-1">
          {nav.map(([Icon, label, href]) => (
            <Link
              key={label}
              href={href}
              onClick={() => setIsOpen(false)}
              className={`touch-target flex items-center gap-3 rounded-soft px-3 py-2 text-sm font-semibold hover:bg-pink-100 ${
                pathname === href ? "bg-blossom text-white hover:bg-blossom" : "bg-blush text-zinc-700 2xl:bg-transparent"
              }`}
            >
              <Icon size={18} className="shrink-0" />
              <span className="whitespace-nowrap">{label}</span>
              {(href === "/admin" || href === "/admin/orders") && unreadOrders > 0 ? (
                <span className={`ml-auto min-w-6 rounded-full px-2 py-0.5 text-center text-xs font-bold ${
                  pathname === href ? "bg-white text-blossom" : "bg-blossom text-white"
                }`}>
                  {unreadOrders > 99 ? "99+" : unreadOrders}
                </span>
              ) : null}
            </Link>
          ))}
        </nav>
        <div className="mt-4 space-y-3 border-t border-pink-100 pt-4">
          <div className="flex items-center gap-3 rounded-soft bg-blush px-3 py-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-blossom shadow-sm">
              <UserRound size={18} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-ink">{profile?.displayName ?? "ผู้ดูแลร้าน"}</p>
              <p className="truncate text-xs font-semibold text-zinc-500">
                {profile?.username ? `@${profile.username} · ${roleLabels[profile.role ?? "admin"]}` : "Admin"}
              </p>
            </div>
          </div>
          <button
            type="button"
            suppressHydrationWarning
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="touch-target flex w-full items-center gap-3 rounded-soft bg-ink px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blossom/45 disabled:cursor-not-allowed disabled:opacity-65"
          >
            <LogOut size={18} className="shrink-0" aria-hidden="true" />
            <span className="whitespace-nowrap">{isSigningOut ? "กำลังออก..." : "ออกจากระบบ"}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
