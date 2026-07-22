"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { BrandLogo } from "@/components/BrandLogo";
import { HelpTooltip } from "@/components/HelpTooltip";
import { PageHelpTooltip } from "@/components/PageHelpTooltip";
import { BRAND_NAME } from "@/lib/brand";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setIsSigningOut(false);
    setIsMenuOpen(false);
  }, [pathname]);

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  async function handleSignOut() {
    if (isSigningOut) return;

    setIsSigningOut(true);
    try {
      await fetch("/api/admin/logout", {
        method: "POST"
      });
      router.replace("/admin/login");
      router.refresh();
    } catch {
      setIsSigningOut(false);
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <>
      <AdminHeader isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />
      <main className="grid w-full grid-cols-1 gap-5 px-4 py-4 sm:px-6 sm:py-6 lg:gap-6 lg:px-8 lg:py-8 2xl:grid-cols-[260px_minmax(0,1fr)]">
        <AdminSidebar isOpen={isMenuOpen} setIsOpen={setIsMenuOpen} isSigningOut={isSigningOut} onSignOut={handleSignOut} />
        <div className="min-w-0 space-y-8">{children}</div>
      </main>
    </>
  );
}

function AdminHeader({
  isMenuOpen,
  setIsMenuOpen
}: {
  isMenuOpen: boolean;
  setIsMenuOpen: (isOpen: boolean) => void;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-pink-100 bg-white/95 backdrop-blur">
      <div className="flex h-16 w-full items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3 rounded-soft outline-none focus-visible:ring-2 focus-visible:ring-blossom" aria-label="กลับหน้าหลัก">
          <BrandLogo />
          <div className="min-w-0">
            <p className="truncate font-bold text-ink">{BRAND_NAME}</p>
            <p className="flex items-center gap-1 text-xs font-semibold text-blossom">
              <ShieldCheck size={14} aria-hidden="true" />
              พื้นที่ผู้ดูแลร้าน
            </p>
          </div>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <PageHelpTooltip area="admin" />
          <button
            type="button"
            suppressHydrationWarning
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="touch-target inline-flex shrink-0 items-center justify-center rounded-soft bg-blush text-ink 2xl:hidden"
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? "ปิดเมนูผู้ดูแลร้าน" : "เปิดเมนูผู้ดูแลร้าน"}
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
    </header>
  );
}

export function AdminPageTitle({ eyebrow, title, help }: { eyebrow: string; title: string; help?: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-blossom">{eyebrow}</p>
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">{title}</h1>
      </div>
      {help ? <HelpTooltip title={title} content={help} side="left" /> : null}
    </div>
  );
}
