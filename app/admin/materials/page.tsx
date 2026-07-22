import { AdminPageTitle } from "@/components/admin/AdminShell";
import { AdminMaterialsManager } from "@/components/admin/AdminMaterialsManager";

export default function AdminMaterialsPage() {
  return (
    <section className="space-y-3">
      <AdminPageTitle eyebrow="สต็อกวัสดุ" title="วัสดุ" />
      <AdminMaterialsManager />
    </section>
  );
}
