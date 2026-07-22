import { AdminPageTitle } from "@/components/admin/AdminShell";
import { FulfillmentSettingsForm } from "@/components/admin/FulfillmentSettingsForm";
import { LineSettingsForm } from "@/components/admin/LineSettingsForm";
import { PaymentSettingsForm } from "@/components/admin/PaymentSettingsForm";
import { SeoSettingsForm } from "@/components/admin/SeoSettingsForm";

export default function AdminSettingsPage() {
  const quickLinks = [
    { href: "#fulfillment-settings", label: "วิธีรับสินค้า" },
    { href: "#payment-settings", label: "PromptPay" },
    { href: "#line-settings", label: "LINE" },
    { href: "#seo-settings", label: "SEO / Meta Tags" }
  ];

  return (
    <section className="space-y-3">
      <AdminPageTitle eyebrow="ตั้งค่าร้าน" title="ตั้งค่า" help="ส่วนที่ร้านเปลี่ยนบ่อย เช่น วิธีรับสินค้า PromptPay และ LINE อยู่ด้านบน ส่วน SEO อยู่ท้ายหน้าเพราะแก้นาน ๆ ครั้ง" />
      <nav className="rounded-bloom border border-pink-100 bg-white p-3 shadow-sm" aria-label="ตั้งค่าที่ใช้บ่อย">
        <p className="px-2 text-sm font-bold text-blossom">ตั้งค่าที่ใช้บ่อย</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {quickLinks.map((item) => (
            <a key={item.href} href={item.href} className="touch-target inline-flex items-center rounded-soft bg-blush px-4 py-2 text-sm font-bold text-ink transition hover:bg-blossom hover:text-white">
              {item.label}
            </a>
          ))}
        </div>
      </nav>
      <div id="fulfillment-settings" className="scroll-mt-24">
        <FulfillmentSettingsForm />
      </div>
      <div id="payment-settings" className="scroll-mt-24">
        <PaymentSettingsForm />
      </div>
      <div id="line-settings" className="scroll-mt-24">
        <LineSettingsForm />
      </div>
      <div id="seo-settings" className="scroll-mt-24">
        <SeoSettingsForm />
      </div>
    </section>
  );
}
