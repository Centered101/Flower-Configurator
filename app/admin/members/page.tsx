import { AdminPageTitle } from "@/components/admin/AdminShell";
import { AdminUsersManager } from "@/components/admin/AdminUsersManager";

export default function AdminMembersPage() {
  return (
    <section className="space-y-3">
      <AdminPageTitle eyebrow="สิทธิ์ผู้ดูแล" title="ผู้ดูแลร้าน" />
      <AdminUsersManager />
    </section>
  );
}
