import { AdminDashboardCharts } from "@/components/admin/AdminDashboardCharts";
import { AdminDashboardMetrics } from "@/components/admin/AdminDashboardMetrics";
import { AdminPageTitle } from "@/components/admin/AdminShell";

export default function AdminPage() {
  return (
    <>
      <section data-aos="fade-up">
        <AdminPageTitle eyebrow="แดชบอร์ดผู้ดูแล" title="ภาพรวมร้าน" />
        <AdminDashboardMetrics />
      </section>
      <AdminDashboardCharts />
    </>
  );
}
