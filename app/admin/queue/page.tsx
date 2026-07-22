import { AdminPageTitle } from "@/components/admin/AdminShell";
import { ProductionKanban } from "@/components/admin/ProductionKanban";

export default function AdminQueuePage() {
  return (
    <section className="space-y-3">
      <AdminPageTitle eyebrow="แผนงานผลิต" title="คิวการผลิต" />
      <ProductionKanban />
    </section>
  );
}
