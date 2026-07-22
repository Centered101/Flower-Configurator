import { AdminConfiguratorManager } from "@/components/admin/AdminConfiguratorManager";
import { AdminPageTitle } from "@/components/admin/AdminShell";

export default function AdminConfiguratorPage() {
  return (
    <section className="space-y-3">
      <AdminPageTitle eyebrow="จัดการขั้นตอนออกแบบ" title="ตัวเลือกสำหรับหน้าออกแบบ" />
      <AdminConfiguratorManager />
    </section>
  );
}
