import { EmptyState } from "@/components/EmptyState";

export function MaterialStockGrid() {
  return (
    <EmptyState title="ยังไม่มีข้อมูลวัสดุ" message="เพิ่มวัสดุในหน้าผู้ดูแลร้านก่อน ข้อมูลสต็อกจะแสดงที่นี่" />
  );
}
