import { AdminPageTitle } from "@/components/admin/AdminShell";
import { AdminProductsManager } from "@/components/admin/AdminProductsManager";

export default function AdminProductsPage() {
  return (
    <section className="space-y-3">
      <AdminPageTitle eyebrow="จัดการสินค้า" title="สินค้า" />
      <AdminProductsManager />
    </section>
  );
}
