import { AdminPageTitle } from "@/components/admin/AdminShell";
import { AdminGalleryManager } from "@/components/admin/AdminGalleryManager";

export default function AdminGalleryPage() {
  return (
    <section className="space-y-3">
      <AdminPageTitle eyebrow="จัดการผลงาน" title="แกลเลอรี" />
      <AdminGalleryManager />
    </section>
  );
}
