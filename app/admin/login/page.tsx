import type { Metadata } from "next";
import { BrandLogo } from "@/components/BrandLogo";
import { AdminLoginForm } from "@/components/AdminLoginForm";
import { Footer } from "@/components/Footer";
import { BRAND_NAME, withBrandTitle } from "@/lib/brand";

export const metadata: Metadata = {
  title: withBrandTitle("เข้าสู่ระบบผู้ดูแล"),
  description: `เข้าสู่ระบบผู้ดูแลร้านสำหรับใช้งาน ${BRAND_NAME}`,
  robots: {
    index: false,
    follow: false
  }
};

function getSafeRedirectPath(redirectTo?: string) {
  if (!redirectTo || !redirectTo.startsWith("/") || redirectTo.startsWith("//")) {
    return "/admin";
  }

  return redirectTo;
}

export default async function AdminLoginPage({
  searchParams
}: {
  searchParams?: Promise<{ redirect?: string }>;
}) {
  const params = await searchParams;
  const redirectTo = getSafeRedirectPath(params?.redirect);

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 px-4 py-8 sm:px-6">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-bloom border border-pink-100 bg-white shadow-soft lg:grid-cols-[0.95fr_1.05fr]">
          <div className="hidden bg-blush p-8 lg:flex lg:flex-col lg:justify-between">
            <BrandLogo size={54} />
            <div>
              <p className="text-sm font-semibold text-blossom">พื้นที่ผู้ดูแลร้าน</p>
              <h1 className="mt-2 text-4xl font-bold text-ink">เข้าสู่ระบบผู้ดูแล</h1>
              <p className="mt-4 text-base leading-7 text-zinc-700">
                ใช้ชื่อผู้ใช้และรหัสผ่านเพื่อจัดการคำสั่งซื้อ ข้อมูลลูกค้า และงานของร้าน
              </p>
            </div>
            <p className="text-sm text-zinc-600">{BRAND_NAME}</p>
          </div>
          <div className="p-5 sm:p-8">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <BrandLogo />
              <div>
                <p className="font-bold text-ink">{BRAND_NAME}</p>
                <p className="text-sm text-zinc-600">เข้าสู่ระบบผู้ดูแลร้าน</p>
              </div>
            </div>
            <AdminLoginForm redirectTo={redirectTo} />
          </div>
        </div>
      </section>
      </main>
      <Footer />
    </div>
  );
}
