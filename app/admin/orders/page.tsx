import { AdminPageTitle } from "@/components/admin/AdminShell";
import { OrderTable } from "@/components/admin/OrderTable";

export default function AdminOrdersPage() {
  return (
    <section className="space-y-3">
      <AdminPageTitle eyebrow="จัดการคำสั่งซื้อ" title="คำสั่งซื้อ" help="ตรวจสลิปมัดจำ อัปเดตสถานะงาน และบันทึกเลขพัสดุให้ลูกค้าติดตามได้" />
      <OrderTable />
    </section>
  );
}
