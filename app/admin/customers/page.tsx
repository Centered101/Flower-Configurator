import { AdminPageTitle } from "@/components/admin/AdminShell";
import { AdminCustomersManager } from "@/components/admin/AdminCustomersManager";

export default function AdminCustomersPage() {
  return (
    <section className="space-y-3">
      <AdminPageTitle eyebrow="ข้อมูลลูกค้า" title="ลูกค้า" help="ดูรายชื่อลูกค้าจากบัญชีลูกค้าและคำสั่งซื้อที่บันทึกลงระบบ ค้นหาได้ด้วยชื่อ เบอร์ อีเมล LINE ID หรือเลขคำสั่งซื้อ" />
      <AdminCustomersManager />
    </section>
  );
}
