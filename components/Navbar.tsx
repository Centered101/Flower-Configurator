"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleUser, faHouse, faImages, faPalette, faRightToBracket, faTruckFast } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ShoppingBag, X } from "lucide-react";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { PageHelpTooltip } from "@/components/PageHelpTooltip";
import { BRAND_NAME } from "@/lib/brand";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const navLinks = [
  { href: "/", label: "หน้าแรก", icon: faHouse },
  { href: "/design", label: "ออกแบบดอกไม้", icon: faPalette },
  { href: "/gallery", label: "ผลงาน", icon: faImages },
  { href: "/track", label: "ติดตามคำสั่งซื้อ", icon: faTruckFast }
] as const;

type CustomerProfile = {
  email?: string;
  displayName?: string;
};

function getCustomerDisplayName(metadata: Record<string, unknown> | undefined) {
  const displayName = typeof metadata?.display_name === "string" ? metadata.display_name.trim() : "";
  const firstName = typeof metadata?.first_name === "string" ? metadata.first_name.trim() : "";
  const lastName = typeof metadata?.last_name === "string" ? metadata.last_name.trim() : "";
  return displayName || [firstName, lastName].filter(Boolean).join(" ") || undefined;
}

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const pathname = usePathname();
  const customerLabel = customer?.displayName || customer?.email?.split("@")[0] || "บัญชีลูกค้า";
  const customerIcon = customer ? faCircleUser : faRightToBracket;
  const customerHref = customer ? "/profile" : "/login";

  useEffect(() => {
    let isMounted = true;

    try {
      const supabase = createSupabaseBrowserClient();

      supabase.auth.getUser()
        .then(({ data }) => {
          if (!isMounted) return;
          setCustomer(data.user ? {
            email: data.user.email,
            displayName: getCustomerDisplayName(data.user.user_metadata)
          } : null);
        })
        .catch(() => {
          if (isMounted) setCustomer(null);
        });

      const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!isMounted) return;
        setCustomer(session?.user ? {
          email: session.user.email,
          displayName: getCustomerDisplayName(session.user.user_metadata)
        } : null);
      });

      return () => {
        isMounted = false;
        authListener.subscription.unsubscribe();
      };
    } catch {
      setCustomer(null);
      return () => {
        isMounted = false;
      };
    }
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-pink-100 bg-white/90 backdrop-blur">
        <nav className="container-page flex h-16 items-center justify-between gap-3">
          <Link href="/" className="flex min-w-0 shrink-0 items-center gap-2 font-bold text-ink lg:max-w-56 xl:max-w-none" onClick={() => setIsOpen(false)}>
            <BrandLogo priority />
            <span className="truncate">{BRAND_NAME}</span>
          </Link>
          <div className="hidden min-w-0 flex-1 items-center justify-center gap-1 text-sm font-medium text-zinc-700 lg:flex xl:gap-3">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href;

              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-2 transition-colors focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blossom/45 xl:px-4 ${
                    isActive ? "bg-blush text-blossom" : "hover:bg-blush hover:text-blossom"
                  }`}
                >
                  <FontAwesomeIcon icon={Icon} className="size-4" aria-hidden="true" />
                  <span className="whitespace-nowrap">{label}</span>
                </Link>
              );
            })}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <PageHelpTooltip className="hidden lg:inline-flex" />
            <Link
              href={customerHref}
              aria-current={pathname === customerHref ? "page" : undefined}
              className={`hidden max-w-40 items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blossom/45 lg:inline-flex ${
                pathname === customerHref ? "bg-blush text-blossom" : "hover:bg-blush hover:text-blossom"
              }`}
              title={customer ? `บัญชีลูกค้า: ${customer.email ?? customerLabel}` : "บัญชีลูกค้า"}
            >
              <FontAwesomeIcon icon={customerIcon} className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate whitespace-nowrap">{customerLabel}</span>
            </Link>
            <Link href="/design" className="touch-target hidden items-center gap-2 whitespace-nowrap rounded-soft bg-blossom px-4 py-2 text-sm font-semibold text-white shadow-soft sm:inline-flex">
              <ShoppingBag size={18} aria-hidden="true" />
              เริ่มออกแบบ
            </Link>
            <PageHelpTooltip className="lg:hidden" />
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => setIsOpen((current) => !current)}
              className="touch-target inline-flex items-center justify-center rounded-soft bg-blush text-ink lg:hidden"
              aria-label={isOpen ? "ปิดเมนู" : "เปิดเมนู"}
              aria-expanded={isOpen}
            >
              {isOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </nav>
      </header>
      <div className={`fixed inset-0 z-50 lg:hidden ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`} aria-hidden={!isOpen}>
        <button
          type="button"
          className={`absolute inset-0 bg-ink/35 backdrop-blur-[2px] transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => setIsOpen(false)}
          aria-label="ปิดเมนู"
        />
        <div
          className={`absolute inset-x-0 bottom-0 rounded-t-bloom border border-pink-100 bg-white px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-3 shadow-soft transition-transform duration-300 ease-out ${
            isOpen ? "translate-y-0" : "translate-y-full"
          }`}
          role="dialog"
          aria-modal="true"
          aria-label="เมนูหลัก"
        >
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-pink-200" />
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="font-bold text-ink">เมนู</div>
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => setIsOpen(false)}
              className="touch-target inline-flex items-center justify-center rounded-full bg-blush text-ink"
              aria-label="ปิดเมนู"
            >
              <X size={20} />
            </button>
          </div>
          <div className="grid gap-2">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href;

              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setIsOpen(false)}
                  aria-current={isActive ? "page" : undefined}
                  className={`touch-target flex items-center gap-3 rounded-soft px-4 py-3 font-semibold transition-colors focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blossom/45 ${
                    isActive ? "bg-blossom text-white shadow-soft" : "bg-blush text-ink hover:bg-pink-100 hover:text-blossom"
                  }`}
                >
                  <FontAwesomeIcon icon={Icon} className="size-[18px] shrink-0" aria-hidden="true" />
                  {label}
                </Link>
              );
            })}
            <Link
              href={customerHref}
              onClick={() => setIsOpen(false)}
              aria-current={pathname === customerHref ? "page" : undefined}
              className={`touch-target flex items-center gap-3 rounded-soft px-4 py-3 font-semibold transition-colors focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blossom/45 ${
                pathname === customerHref ? "bg-blossom text-white shadow-soft" : "bg-blush text-ink hover:bg-pink-100 hover:text-blossom"
              }`}
            >
              <FontAwesomeIcon icon={customerIcon} className="size-[18px] shrink-0" aria-hidden="true" />
              <span className="min-w-0 truncate">{customerLabel}</span>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
