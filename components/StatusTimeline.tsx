import type { OrderStatus } from "@/lib/types";

const statusLabels: Record<OrderStatus, string> = {
  pending_review: "รอตรวจสอบคำสั่งซื้อ",
  design_confirmed: "ร้านยืนยันแบบแล้ว",
  awaiting_payment: "รอชำระเงิน",
  preparing_materials: "เริ่มเตรียมวัสดุ",
  in_production: "กำลังผลิต",
  quality_check: "ตรวจสอบคุณภาพ",
  ready: "พร้อมรับสินค้า",
  completed: "สำเร็จ",
  cancelled: "ยกเลิก"
};

const flow: OrderStatus[] = ["pending_review", "design_confirmed", "awaiting_payment", "preparing_materials", "in_production", "quality_check", "ready", "completed"];

export function StatusTimeline({ status }: { status: OrderStatus }) {
  const current = flow.indexOf(status);
  return (
    <ol className="space-y-3">
      {flow.map((item, index) => (
        <li key={item} className="flex gap-3">
          <span className={`mt-1 size-4 rounded-full ${index <= current ? "bg-stem" : "bg-zinc-200"}`} />
          <span className={index <= current ? "font-semibold text-ink" : "text-zinc-500"}>{statusLabels[item]}</span>
        </li>
      ))}
    </ol>
  );
}
