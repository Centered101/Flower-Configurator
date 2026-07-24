"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { ArrowLeft, KeyRound, Loader2, Mail, MapPin, MessageCircle, Phone, UserRound } from "lucide-react";
import { toast } from "sonner";
import { HelpTooltip } from "@/components/HelpTooltip";
import { BRAND_NAME } from "@/lib/brand";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthMode = "sign-in" | "sign-up";
type SignupStep = 0 | 1 | 2 | 3;

const signupSteps = ["ข้อมูลบัญชี", "ข้อมูลส่วนตัว", "ข้อมูลติดต่อ", "การยินยอม"] as const;

function getAuthErrorMessage(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
  if (normalized.includes("email not confirmed")) return "กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ";
  if (normalized.includes("password")) return "รหัสผ่านต้องมีความปลอดภัยเพียงพอ";
  return message;
}

export function LoginForm({
  redirectTo = "/",
  showBackLink = true,
  onSignedIn
}: {
  redirectTo?: string;
  showBackLink?: boolean;
  onSignedIn?: () => void;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [signupStep, setSignupStep] = useState<SignupStep>(0);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [lineId, setLineId] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function validateSignupStep(step = signupStep) {
    if (step === 0) {
      if (!email.trim() || !password) return "กรุณาใส่อีเมลและรหัสผ่าน";
      if (password.length < 6) return "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร";
    }

    if (step === 1 && (!firstName.trim() || !lastName.trim())) {
      return "กรุณากรอกชื่อและนามสกุล";
    }

    if (step === 2) {
      if (!phone.trim() || !lineId.trim() || !address.trim()) return "กรุณากรอกเบอร์โทร LINE ID และที่อยู่";
      if (!/^[0-9]{9,10}$/.test(phone.trim())) return "กรุณาใส่เบอร์โทรเป็นตัวเลข 9-10 หลัก";
    }

    if (step === 3 && !acceptedPolicies) {
      return "กรุณายอมรับนโยบายและข้อกำหนดก่อนสมัครบัญชี";
    }

    return "";
  }

  function goNextSignupStep() {
    const message = validateSignupStep();
    if (message) {
      setError(message);
      toast.warning(message);
      return;
    }

    setError("");
    setSignupStep((current) => Math.min(current + 1, signupSteps.length - 1) as SignupStep);
  }

  function goPreviousSignupStep() {
    setError("");
    setSignupStep((current) => Math.max(current - 1, 0) as SignupStep);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "sign-up") {
      for (let step = 0; step < signupSteps.length; step += 1) {
        const message = validateSignupStep(step as SignupStep);
        if (message) {
          setSignupStep(step as SignupStep);
          setError(message);
          toast.warning(message);
          return;
        }
      }
    }

    setIsLoading(true);
    setMessage("");
    setError("");

    const authAction =
      mode === "sign-in"
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                display_name: [firstName.trim(), lastName.trim()].filter(Boolean).join(" "),
                phone: phone.trim(),
                line_id: lineId.trim(),
                lineId: lineId.trim(),
                address: address.trim(),
                accepted_policies: true,
                accepted_policies_at: new Date().toISOString()
              }
            }
          });

    const { error: authError } = await authAction;
    setIsLoading(false);

    if (authError) {
      const message = getAuthErrorMessage(authError.message);
      setError(message);
      toast.error(message);
      return;
    }

    if (mode === "sign-up") {
      setMessage("สมัครบัญชีแล้ว กรุณาตรวจอีเมลเพื่อยืนยันก่อนเข้าสู่ระบบ");
      toast.success("สมัครบัญชีแล้ว กรุณาตรวจอีเมลเพื่อยืนยัน");
      return;
    }

    toast.success("เข้าสู่ระบบสำเร็จ");
    if (onSignedIn) {
      onSignedIn();
      return;
    }

    router.replace(redirectTo);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md">
      {showBackLink ? (
        <Link
          href="/"
          className="mb-6 inline-flex min-h-11 items-center gap-2 rounded-full border border-pink-100 bg-blush px-4 text-sm font-bold text-ink transition hover:border-blossom hover:bg-blossom hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blossom"
        >
          <ArrowLeft size={17} aria-hidden="true" />
          กลับหน้าแรก
        </Link>
      ) : null}
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-blossom">บัญชีลูกค้า</p>
            <h1 className="mt-1 text-3xl font-bold text-ink">
              {mode === "sign-in" ? "เข้าสู่ระบบ" : "สมัครบัญชี"}
            </h1>
          </div>
          <HelpTooltip
            title="บัญชีลูกค้า"
            content="บัญชีนี้ใช้ดูคำสั่งซื้อ โปรไฟล์ ที่อยู่ และผลงานที่ถูกใจ ไม่ใช่บัญชีผู้ดูแลร้าน"
            side="left"
          />
        </div>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          ใช้อีเมลเพื่อดูคำสั่งซื้อและข้อมูลของคุณใน {BRAND_NAME}
        </p>
      </div>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        {mode === "sign-up" ? <SignupProgress step={signupStep} /> : null}

        {(mode === "sign-in" || signupStep === 0) ? (
          <FormSection title="ข้อมูลบัญชี">
            <SignupField icon={<Mail size={18} className="text-blossom" aria-hidden="true" />} label="อีเมล">
              <input
                suppressHydrationWarning
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full border-0 bg-transparent text-ink outline-none"
                placeholder="name@example.com"
                autoComplete="email"
              />
            </SignupField>
            <SignupField icon={<KeyRound size={18} className="text-blossom" aria-hidden="true" />} label="รหัสผ่าน">
              <input
                suppressHydrationWarning
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full border-0 bg-transparent text-ink outline-none"
                placeholder="อย่างน้อย 6 ตัวอักษร"
                autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              />
            </SignupField>
          </FormSection>
        ) : null}

        {mode === "sign-up" && signupStep === 1 ? (
            <FormSection title="ข้อมูลส่วนตัว">
              <div className="grid gap-4 sm:grid-cols-2">
                <SignupField icon={<UserRound size={18} className="text-blossom" aria-hidden="true" />} label="ชื่อ">
                  <input
                    suppressHydrationWarning
                    type="text"
                    required
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    className="w-full border-0 bg-transparent text-ink outline-none"
                    placeholder="ชื่อจริง"
                    autoComplete="given-name"
                  />
                </SignupField>
                <SignupField icon={<UserRound size={18} className="text-blossom" aria-hidden="true" />} label="นามสกุล">
                  <input
                    suppressHydrationWarning
                    type="text"
                    required
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    className="w-full border-0 bg-transparent text-ink outline-none"
                    placeholder="นามสกุล"
                    autoComplete="family-name"
                  />
                </SignupField>
              </div>
            </FormSection>
        ) : null}

        {mode === "sign-up" && signupStep === 2 ? (
            <FormSection title="ข้อมูลติดต่อ">
              <SignupField icon={<Phone size={18} className="text-blossom" aria-hidden="true" />} label="เบอร์โทร">
              <input
                suppressHydrationWarning
                type="tel"
                required
                inputMode="numeric"
                pattern="[0-9]{9,10}"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="w-full border-0 bg-transparent text-ink outline-none"
                placeholder="เช่น 0812345678"
                autoComplete="tel"
              />
              </SignupField>
              <SignupField icon={<MessageCircle size={18} className="text-blossom" aria-hidden="true" />} label="LINE ID">
                <input
                  suppressHydrationWarning
                  type="text"
                  required
                  value={lineId}
                  onChange={(event) => setLineId(event.target.value)}
                  className="w-full border-0 bg-transparent text-ink outline-none"
                  placeholder="เช่น cakebloom"
                  autoComplete="off"
                />
              </SignupField>
              <label className="block">
                <span className="text-sm font-semibold text-ink">ที่อยู่</span>
                <span className="mt-2 flex items-start gap-2 rounded-soft border border-pink-100 bg-white px-4 py-3 focus-within:border-blossom">
                  <MapPin size={18} className="mt-1 text-blossom" aria-hidden="true" />
                  <textarea
                    suppressHydrationWarning
                    required
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    className="min-h-24 w-full resize-none border-0 bg-transparent text-ink outline-none"
                    placeholder="บ้านเลขที่ ถนน ตำบล/แขวง อำเภอ/เขต จังหวัด รหัสไปรษณีย์"
                    autoComplete="street-address"
                  />
                </span>
              </label>
            </FormSection>
        ) : null}

        {mode === "sign-up" && signupStep === 3 ? (
            <FormSection title="การยินยอม">
              <label className="flex items-start gap-3 rounded-soft border border-pink-100 bg-white p-4 text-sm leading-6 text-zinc-700">
                <input
                  suppressHydrationWarning
                  type="checkbox"
                  checked={acceptedPolicies}
                  onChange={(event) => setAcceptedPolicies(event.target.checked)}
                  className="mt-1"
                  required
                />
                <span>
                  ฉันอ่านและยอมรับ{" "}
                  <Link href="/privacy-policy" className="font-semibold text-blossom hover:text-ink">
                    นโยบายความเป็นส่วนตัว
                  </Link>
                  ,{" "}
                  <Link href="/terms-of-service" className="font-semibold text-blossom hover:text-ink">
                    ข้อกำหนดการใช้บริการ
                  </Link>
                  {" "}และ{" "}
                  <Link href="/data-deletion" className="font-semibold text-blossom hover:text-ink">
                    การขอลบข้อมูล
                  </Link>
                </span>
              </label>
            </FormSection>
        ) : null}

        {error ? <p className="rounded-soft border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}
        {message ? <p className="rounded-soft border border-green-100 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">{message}</p> : null}

        {mode === "sign-up" ? (
          <div className={signupStep > 0 ? "grid gap-3 sm:grid-cols-[160px_1fr]" : ""}>
            {signupStep > 0 ? (
              <button
                type="button"
                suppressHydrationWarning
                disabled={isLoading}
                onClick={goPreviousSignupStep}
                className="touch-target inline-flex w-full items-center justify-center gap-2 rounded-soft border border-pink-200 bg-white px-4 py-3 font-semibold text-ink shadow-sm transition hover:border-blossom hover:bg-blush disabled:cursor-not-allowed disabled:opacity-65"
              >
                <ArrowLeft size={18} aria-hidden="true" />
                ย้อนกลับ
              </button>
            ) : null}
            {signupStep < signupSteps.length - 1 ? (
              <button
                type="button"
                suppressHydrationWarning
                disabled={isLoading}
                onClick={goNextSignupStep}
                className="touch-target inline-flex w-full items-center justify-center rounded-soft bg-blossom px-4 py-3 font-semibold text-white shadow-soft disabled:cursor-not-allowed disabled:opacity-65"
              >
                ถัดไป
              </button>
            ) : (
              <button
                type="submit"
                suppressHydrationWarning
                disabled={isLoading}
                className="touch-target inline-flex w-full items-center justify-center gap-2 rounded-soft bg-blossom px-4 py-3 font-semibold text-white shadow-soft disabled:cursor-not-allowed disabled:opacity-65"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : null}
                สมัครบัญชี
              </button>
            )}
          </div>
        ) : (
          <button
            type="submit"
            suppressHydrationWarning
            disabled={isLoading}
            className="touch-target inline-flex w-full items-center justify-center gap-2 rounded-soft bg-blossom px-4 py-3 font-semibold text-white shadow-soft disabled:cursor-not-allowed disabled:opacity-65"
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : null}
            เข้าสู่ระบบ
          </button>
        )}
      </form>

      <div className="mt-6 rounded-soft bg-blush p-4 text-sm text-zinc-700">
        {mode === "sign-in" ? "ยังไม่มีบัญชี?" : "มีบัญชีอยู่แล้ว?"}{" "}
        <button
          type="button"
          suppressHydrationWarning
          onClick={() => {
            setMode(mode === "sign-in" ? "sign-up" : "sign-in");
            setSignupStep(0);
            setError("");
            setMessage("");
            setAcceptedPolicies(false);
          }}
          className="font-bold text-blossom"
        >
          {mode === "sign-in" ? "สมัครบัญชีใหม่" : "เข้าสู่ระบบ"}
        </button>
      </div>
    </div>
  );
}

function SignupProgress({ step }: { step: SignupStep }) {
  return (
    <div className="rounded-bloom border border-pink-100 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3 text-sm font-semibold">
        <span className="text-blossom">ขั้นตอนที่ {step + 1} จาก {signupSteps.length}</span>
        <span className="text-ink">{signupSteps[step]}</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {signupSteps.map((label, index) => (
          <span
            key={label}
            className={`h-2 rounded-full ${index <= step ? "bg-blossom" : "bg-pink-100"}`}
          />
        ))}
      </div>
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-bloom border border-pink-100 bg-blush/55 p-4">
      <h2 className="text-base font-bold text-ink">{title}</h2>
      <div className="space-y-4">
        {children}
      </div>
    </section>
  );
}

function SignupField({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-ink">{label}</span>
      <span className="mt-2 flex items-center gap-2 rounded-soft border border-pink-100 bg-white px-4 py-3 focus-within:border-blossom">
        {icon}
        {children}
      </span>
    </label>
  );
}
