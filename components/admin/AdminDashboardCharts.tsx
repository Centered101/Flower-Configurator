"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Chart, registerables } from "chart.js";
import { EmptyState } from "@/components/EmptyState";
import { getStoredOrders } from "@/lib/orders";
import type { CustomerOrder, OrderStatus } from "@/lib/types";

Chart.register(...registerables);

const statusLabels: Record<OrderStatus, string> = {
  pending_review: "รอตรวจสอบ",
  design_confirmed: "ยืนยันแบบแล้ว",
  awaiting_payment: "รอชำระเงิน",
  preparing_materials: "เตรียมวัสดุ",
  in_production: "กำลังผลิต",
  quality_check: "ตรวจคุณภาพ",
  ready: "พร้อมรับ",
  completed: "สำเร็จ",
  cancelled: "ยกเลิก"
};

export function AdminDashboardCharts() {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);

  useEffect(() => {
    setOrders(getStoredOrders());
  }, []);

  const revenueData = useMemo(() => buildRevenueData(orders), [orders]);
  const productionData = useMemo(() => buildProductionData(orders), [orders]);
  const hasRevenue = revenueData.values.some((value) => value > 0);
  const hasProduction = productionData.values.some((value) => value > 0);

  return (
    <section className="grid gap-4 xl:grid-cols-[1.35fr_1fr]" data-aos="fade-up">
      <ChartCard title="รายได้รายสัปดาห์" description="ยอดขายโดยประมาณจากคำสั่งซื้อที่ยืนยันแล้ว">
        {hasRevenue ? <LineChart data={revenueData} /> : <ChartEmptyState />}
      </ChartCard>
      <ChartCard title="สถานะงานผลิต" description="จำนวนงานในแต่ละขั้นตอนของคิวผลิต">
        {hasProduction ? <DoughnutChart data={productionData} /> : <ChartEmptyState />}
      </ChartCard>
    </section>
  );
}

function ChartCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <article className="rounded-bloom border border-pink-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-ink">{title}</h2>
        <p className="mt-1 text-sm text-zinc-500">{description}</p>
      </div>
      <div className="relative h-72 sm:h-80">{children}</div>
    </article>
  );
}

function ChartEmptyState() {
  return (
    <div className="grid h-full place-items-center">
      <EmptyState title="ยังไม่มีข้อมูล" message="เมื่อมีคำสั่งซื้อจริง กราฟจะแสดงข้อมูลจากระบบโดยอัตโนมัติ" />
    </div>
  );
}

function LineChart({ data }: { data: { labels: string[]; values: number[] } }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const chart = new Chart(canvasRef.current, {
      type: "line",
      data: {
        labels: data.labels,
        datasets: [
          {
            label: "รายได้",
            data: data.values,
            borderColor: "#F48FB1",
            backgroundColor: "rgba(244, 143, 177, 0.18)",
            pointBackgroundColor: "#43A047",
            pointBorderColor: "#ffffff",
            pointBorderWidth: 2,
            pointRadius: 4,
            fill: true,
            tension: 0.35
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.parsed.y ?? 0;
                return `รายได้ ${value.toLocaleString("th-TH")} บาท`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: "#71717A",
              font: {
                family: "Kanit"
              }
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: "rgba(244, 143, 177, 0.18)"
            },
            ticks: {
              color: "#71717A",
              font: {
                family: "Kanit"
              },
              callback: (value) => `${Number(value).toLocaleString("th-TH")}`
            }
          }
        }
      }
    });

    return () => chart.destroy();
  }, [data.labels, data.values]);

  return <canvas ref={canvasRef} aria-label="กราฟรายได้รายสัปดาห์" role="img" />;
}

function DoughnutChart({ data }: { data: { labels: string[]; values: number[] } }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const chart = new Chart(canvasRef.current, {
      type: "doughnut",
      data: {
        labels: data.labels,
        datasets: [
          {
            data: data.values,
            backgroundColor: ["#FCE4EC", "#F48FB1", "#43A047", "#90CAF9", "#FDD835"],
            borderColor: "#ffffff",
            borderWidth: 3,
            hoverOffset: 8
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "64%",
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: "#2D2D2D",
              boxWidth: 12,
              boxHeight: 12,
              padding: 14,
              font: {
                family: "Kanit"
              }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => `${context.label}: ${context.parsed} งาน`
            }
          }
        }
      }
    });

    return () => chart.destroy();
  }, [data.labels, data.values]);

  return <canvas ref={canvasRef} aria-label="กราฟสถานะงานผลิต" role="img" />;
}

function buildRevenueData(orders: CustomerOrder[]) {
  const dates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return date.toISOString().slice(0, 10);
  });

  return {
    labels: dates.map((date) => new Date(date).toLocaleDateString("th-TH", { weekday: "short" })),
    values: dates.map((date) => orders.filter((order) => order.createdAt.slice(0, 10) === date).reduce((sum, order) => sum + order.total, 0))
  };
}

function buildProductionData(orders: CustomerOrder[]) {
  const statuses: OrderStatus[] = ["pending_review", "preparing_materials", "in_production", "quality_check", "ready"];

  return {
    labels: statuses.map((status) => statusLabels[status]),
    values: statuses.map((status) => orders.filter((order) => order.orderStatus === status).length)
  };
}
