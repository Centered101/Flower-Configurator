"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowLeft, KeyRound, Loader2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { HelpTooltip } from "@/components/HelpTooltip";
import { BRAND_NAME } from "@/lib/brand";

export function AdminLoginForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "เข้าสู่ระบบไม่สำเร็จ");
      }

      toast.success("เข้าสู่ระบบผู้ดูแลสำเร็จ");
      router.replace(redirectTo);
      router.refresh();
    } catch (loginError) {
      const message = loginError instanceof Error ? loginError.message : "เข้าสู่ระบบไม่สำเร็จ";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <Link
        href="/"
        className="mb-6 inline-flex min-h-11 items-center gap-2 rounded-full border border-pink-100 bg-blush px-4 text-sm font-bold text-ink transition hover:border-blossom hover:bg-blossom hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blossom"
      >
        <ArrowLeft size={17} aria-hidden="true" />
        กลับหน้าแรก
      </Link>
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-blossom">สำหรับผู้ดูแลร้าน</p>
            <h1 className="mt-1 text-3xl font-bold text-ink">เข้าสู่ระบบ</h1>
          </div>
          <HelpTooltip
            title="เข้าสู่ระบบผู้ดูแล"
            content="ใช้ username และ password ของผู้ดูแลร้าน แยกจากบัญชีลูกค้า Supabase"
            side="left"
          />
        </div>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          ใช้ชื่อผู้ใช้และรหัสผ่านของผู้ดูแลร้านเพื่อจัดการ {BRAND_NAME}
        </p>
      </div>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-sm font-semibold text-ink">ชื่อผู้ใช้</span>
          <span className="mt-2 flex items-center gap-2 rounded-soft border border-pink-100 bg-white px-4 py-3 focus-within:border-blossom">
            <UserRound size={18} className="text-blossom" aria-hidden="true" />
            <input
              suppressHydrationWarning
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full border-0 bg-transparent text-ink outline-none"
              placeholder="ชื่อผู้ใช้"
              autoComplete="username"
            />
          </span>
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-ink">รหัสผ่าน</span>
          <span className="mt-2 flex items-center gap-2 rounded-soft border border-pink-100 bg-white px-4 py-3 focus-within:border-blossom">
            <KeyRound size={18} className="text-blossom" aria-hidden="true" />
            <input
              suppressHydrationWarning
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full border-0 bg-transparent text-ink outline-none"
              placeholder="รหัสผ่านผู้ดูแลร้าน"
              autoComplete="current-password"
            />
          </span>
        </label>

        {error ? (
          <p className="rounded-soft border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>
        ) : null}

        <button
          type="submit"
          suppressHydrationWarning
          disabled={isLoading}
          className="touch-target inline-flex w-full items-center justify-center gap-2 rounded-soft bg-blossom px-4 py-3 font-semibold text-white shadow-soft disabled:cursor-not-allowed disabled:opacity-65"
        >
          {isLoading ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : null}
          {isLoading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
        </button>
      </form>
    </div>
  );
}
