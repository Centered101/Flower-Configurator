import type { Metadata } from "next";
import { BrandLogo } from "@/components/BrandLogo";
import { Footer } from "@/components/Footer";
import { LoginForm } from "@/components/LoginForm";
import { BRAND_NAME, withBrandTitle } from "@/lib/brand";

export const metadata: Metadata = {
  title: withBrandTitle("เข้าสู่ระบบ"),
  description: `เข้าสู่ระบบลูกค้าสำหรับใช้งาน ${BRAND_NAME}`
};

function getSafeRedirectPath(redirectTo?: string) {
  if (!redirectTo || !redirectTo.startsWith("/") || redirectTo.startsWith("//")) {
    return "/";
  }

  return redirectTo;
}

export default async function LoginPage({
  searchParams
}: {
  searchParams?: Promise<{ redirect?: string; error?: string }>;
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
              <p className="text-sm font-semibold text-blossom">บัญชีลูกค้า</p>
              <h1 className="mt-2 text-4xl font-bold text-ink">เข้าสู่ระบบลูกค้า</h1>
              <p className="mt-4 text-base leading-7 text-zinc-700">
                ใช้อีเมลเพื่อดูคำสั่งซื้อและข้อมูลของคุณได้สะดวกขึ้น
              </p>
            </div>
            <p className="text-sm text-zinc-600">{BRAND_NAME}</p>
          </div>
          <div className="p-5 sm:p-8">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <BrandLogo />
              <div>
                <p className="font-bold text-ink">{BRAND_NAME}</p>
                <p className="text-sm text-zinc-600">เข้าสู่ระบบลูกค้า</p>
              </div>
            </div>
            <LoginForm redirectTo={redirectTo} />
          </div>
        </div>
      </section>
      </main>
      <Footer />
    </div>
  );
}
