import type { CustomerOrder } from "@/lib/types";
import { BRAND_NAME, SITE_URL } from "@/lib/brand";
import { readLineSettings } from "@/lib/line-settings";
import { createSlipLineImageUrl } from "@/lib/slip-line-image";

const LINE_PUSH_ENDPOINT = "https://api.line.me/v2/bot/message/push";

type LineMessage = {
  type: "text";
  text: string;
} | {
  type: "flex";
  altText: string;
  contents: Record<string, unknown>;
};

type SlipUploadedNotification = {
  orderNumber: string;
  customerName: string;
  phone: string;
  lineId?: string;
  amount: number;
  expectedAmount: number;
  paymentStatus: "awaiting_review" | "paid" | "failed";
  verificationMessage: string;
  slipUrl?: string;
  slipPath?: string;
};

function truncateText(value: string, maxLength = 260) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}

function money(value: number) {
  return `${value.toLocaleString("th-TH")} บาท`;
}

function fulfillmentDateLabel(order: CustomerOrder) {
  if (order.estimatedDeliveryDate || order.pickupMethod.includes("จัดส่ง")) {
    return `คาดว่าจะจัดส่งประมาณ ${order.estimatedDeliveryDate ?? order.pickupDate}`;
  }

  return `${order.pickupDate} ${order.pickupTime}`;
}

function buildInfoRow(label: string, value: string | number) {
  return {
    type: "box",
    layout: "horizontal",
    spacing: "md",
    contents: [
      {
        type: "text",
        text: label,
        size: "sm",
        color: "#777777",
        flex: 3
      },
      {
        type: "text",
        text: truncateText(String(value), 120),
        size: "sm",
        color: "#2B2B2B",
        weight: "bold",
        wrap: true,
        flex: 5
      }
    ]
  };
}

function paymentStatusLabel(status: SlipUploadedNotification["paymentStatus"]) {
  if (status === "paid") return "ตรวจผ่านแล้ว";
  if (status === "failed") return "ตรวจไม่ผ่าน";
  return "รอผู้ดูแลตรวจ";
}

function adminOrderUrl(orderNumber: string) {
  return `${SITE_URL.replace(/\/$/, "")}/admin/orders?order=${encodeURIComponent(orderNumber)}`;
}

function normalizeHttpsImageUrl(value?: string) {
  if (!value) return "";

  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

export function buildAdminOrderMessage(order: CustomerOrder) {
  return [
    "มีคำสั่งพรีออเดอร์ใหม่",
    "",
    `เลขออเดอร์: ${order.orderNumber}`,
    `ลูกค้า: ${order.customerName}`,
    `เบอร์โทร: ${order.phone}`,
    `LINE ID: ${order.lineId}`,
    `วิธีรับ: ${order.pickupMethod}`,
    `${order.pickupMethod.includes("จัดส่ง") ? "วันจัดส่ง" : "วันรับ"}: ${fulfillmentDateLabel(order)}`,
    `${order.pickupMethod.includes("จัดส่ง") ? "ที่อยู่จัดส่ง" : "สถานที่รับ"}: ${order.pickupLocation}`,
    `ยอดรวม: ${order.total.toLocaleString("th-TH")} บาท`,
    `มัดจำ: ${order.depositAmount.toLocaleString("th-TH")} บาท`,
    `คะแนนผลิต: ${order.productionScore}`,
    order.note ? `หมายเหตุ: ${order.note}` : ""
  ].filter(Boolean).join("\n");
}

export function buildAdminOrderFlexMessage(order: CustomerOrder): LineMessage {
  const phoneSuffix = order.phone.replace(/\D/g, "").slice(-4);
  const trackUrl = `${SITE_URL.replace(/\/$/, "")}/track?order=${encodeURIComponent(order.orderNumber)}${phoneSuffix ? `&phone=${encodeURIComponent(phoneSuffix)}` : ""}`;
  const sourceTitle = order.sourceItem?.title ? `แบบสำเร็จ: ${order.sourceItem.title}` : "ออกแบบเอง";

  return {
    type: "flex",
    altText: `คำสั่งซื้อใหม่ ${order.orderNumber}`,
    contents: {
      type: "bubble",
      size: "giga",
      header: {
        type: "box",
        layout: "vertical",
        paddingAll: "20px",
        backgroundColor: "#F48BB0",
        contents: [
          {
            type: "text",
            text: BRAND_NAME,
            size: "sm",
            color: "#FFFFFF",
            weight: "bold"
          },
          {
            type: "text",
            text: "มีคำสั่งพรีออเดอร์ใหม่",
            margin: "md",
            size: "xl",
            color: "#FFFFFF",
            weight: "bold",
            wrap: true
          },
          {
            type: "text",
            text: order.orderNumber,
            margin: "sm",
            size: "md",
            color: "#FFF3F7",
            weight: "bold",
            wrap: true
          }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            spacing: "md",
            contents: [
              {
                type: "box",
                layout: "vertical",
                backgroundColor: "#FFF0F6",
                cornerRadius: "12px",
                paddingAll: "14px",
                contents: [
                  {
                    type: "text",
                    text: "ยอดรวม",
                    size: "xs",
                    color: "#777777"
                  },
                  {
                    type: "text",
                    text: money(order.total),
                    margin: "sm",
                    size: "lg",
                    color: "#E94F86",
                    weight: "bold",
                    wrap: true
                  }
                ]
              },
              {
                type: "box",
                layout: "vertical",
                backgroundColor: "#F3FAF3",
                cornerRadius: "12px",
                paddingAll: "14px",
                contents: [
                  {
                    type: "text",
                    text: "คะแนนผลิต",
                    size: "xs",
                    color: "#777777"
                  },
                  {
                    type: "text",
                    text: `${order.productionScore.toLocaleString("th-TH")} คะแนน`,
                    margin: "sm",
                    size: "lg",
                    color: "#2E7D32",
                    weight: "bold",
                    wrap: true
                  }
                ]
              }
            ]
          },
          {
            type: "separator",
            margin: "md",
            color: "#F9D7E5"
          },
          buildInfoRow("ลูกค้า", order.customerName),
          buildInfoRow("เบอร์โทร", order.phone),
          buildInfoRow("LINE ID", order.lineId),
          buildInfoRow("รูปแบบ", sourceTitle),
          buildInfoRow("วิธีรับ", order.pickupMethod),
          buildInfoRow(order.pickupMethod.includes("จัดส่ง") ? "วันจัดส่ง" : "วันรับ", fulfillmentDateLabel(order)),
          buildInfoRow(order.pickupMethod.includes("จัดส่ง") ? "ที่อยู่จัดส่ง" : "สถานที่รับ", order.pickupLocation),
          buildInfoRow("มัดจำ", money(order.depositAmount)),
          order.note ? buildInfoRow("หมายเหตุ", truncateText(order.note, 180)) : {
            type: "text",
            text: "ไม่มีหมายเหตุเพิ่มเติม",
            size: "xs",
            color: "#999999",
            wrap: true
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#F48BB0",
            action: {
              type: "uri",
              label: "เปิดหน้าติดตามคำสั่งซื้อ",
              uri: trackUrl
            }
          }
        ]
      },
      styles: {
        footer: {
          separator: true
        }
      }
    }
  };
}

export function buildSlipUploadedFlexMessage(input: SlipUploadedNotification): LineMessage {
  const slipImageUrl = createSlipLineImageUrl(input.slipPath) || normalizeHttpsImageUrl(input.slipUrl);
  const orderTag = `#${input.orderNumber}`;
  const statusLabel = paymentStatusLabel(input.paymentStatus);
  const adminUrl = adminOrderUrl(input.orderNumber);

  return {
    type: "flex",
    altText: `มีสลิปใหม่ ${input.orderNumber}`,
    contents: {
      type: "bubble",
      size: "giga",
      header: {
        type: "box",
        layout: "vertical",
        paddingAll: "20px",
        backgroundColor: "#F48BB0",
        contents: [
          {
            type: "text",
            text: BRAND_NAME,
            size: "sm",
            color: "#FFFFFF",
            weight: "bold"
          },
          {
            type: "text",
            text: "มีสลิปมัดจำใหม่",
            margin: "md",
            size: "xl",
            color: "#FFFFFF",
            weight: "bold",
            wrap: true
          },
          {
            type: "text",
            text: orderTag,
            margin: "sm",
            size: "md",
            color: "#FFF3F7",
            weight: "bold",
            wrap: true
          }
        ]
      },
      ...(slipImageUrl ? {
        hero: {
          type: "image",
          url: slipImageUrl,
          size: "full",
          aspectMode: "fit",
          aspectRatio: "3:4",
          backgroundColor: "#FFF7FA"
        }
      } : {}),
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            spacing: "md",
            contents: [
              {
                type: "box",
                layout: "vertical",
                backgroundColor: "#FFF0F6",
                cornerRadius: "12px",
                paddingAll: "14px",
                contents: [
                  {
                    type: "text",
                    text: "ยอดที่ต้องชำระ",
                    size: "xs",
                    color: "#777777"
                  },
                  {
                    type: "text",
                    text: money(input.expectedAmount),
                    margin: "sm",
                    size: "lg",
                    color: "#E94F86",
                    weight: "bold",
                    wrap: true
                  }
                ]
              },
              {
                type: "box",
                layout: "vertical",
                backgroundColor: input.paymentStatus === "paid" ? "#F3FAF3" : input.paymentStatus === "failed" ? "#FFF1F1" : "#FFF8E8",
                cornerRadius: "12px",
                paddingAll: "14px",
                contents: [
                  {
                    type: "text",
                    text: "ผลตรวจสลิป",
                    size: "xs",
                    color: "#777777"
                  },
                  {
                    type: "text",
                    text: statusLabel,
                    margin: "sm",
                    size: "lg",
                    color: input.paymentStatus === "paid" ? "#2E7D32" : input.paymentStatus === "failed" ? "#D32F2F" : "#B7791F",
                    weight: "bold",
                    wrap: true
                  }
                ]
              }
            ]
          },
          {
            type: "separator",
            margin: "md",
            color: "#F9D7E5"
          },
          buildInfoRow("เลขออเดอร์", orderTag),
          buildInfoRow("ลูกค้า", input.customerName || "-"),
          buildInfoRow("เบอร์โทร", input.phone || "-"),
          input.lineId ? buildInfoRow("LINE ID", input.lineId) : {
            type: "text",
            text: "ไม่มี LINE ID",
            size: "xs",
            color: "#999999",
            wrap: true
          },
          buildInfoRow("ยอดในสลิป", money(input.amount)),
          buildInfoRow("ข้อความตรวจ", truncateText(input.verificationMessage || "-", 180)),
          slipImageUrl ? {
            type: "text",
            text: "แนบรูปสลิปไว้ด้านบนของการแจ้งเตือนแล้ว",
            size: "xs",
            color: "#999999",
            wrap: true
          } : {
            type: "text",
            text: "ยังแสดงรูปสลิปใน LINE ไม่ได้ กรุณาตั้งค่า NEXT_PUBLIC_SITE_URL เป็น HTTPS แล้วลองส่งอีกครั้ง",
            size: "xs",
            color: "#D32F2F",
            wrap: true
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#F48BB0",
            action: {
              type: "uri",
              label: "เปิดออเดอร์นี้ในแอดมิน",
              uri: adminUrl
            }
          }
        ]
      },
      styles: {
        footer: {
          separator: true
        }
      }
    }
  };
}

function buildTextFlexMessage(message: string): LineMessage {
  const lines = message.split("\n").filter(Boolean);

  return {
    type: "flex",
    altText: truncateText(lines[0] ?? "แจ้งเตือนจากร้าน", 300),
    contents: {
      type: "bubble",
      size: "giga",
      header: {
        type: "box",
        layout: "vertical",
        paddingAll: "20px",
        backgroundColor: "#F48BB0",
        contents: [
          {
            type: "text",
            text: BRAND_NAME,
            size: "sm",
            color: "#FFFFFF",
            weight: "bold"
          },
          {
            type: "text",
            text: truncateText(lines[0] ?? "แจ้งเตือนจากร้าน", 120),
            margin: "md",
            size: "xl",
            color: "#FFFFFF",
            weight: "bold",
            wrap: true
          }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: (lines.slice(1).length ? lines.slice(1) : [message]).map((line) => ({
          type: "text",
          text: truncateText(line, 260),
          size: "sm",
          color: "#2B2B2B",
          wrap: true
        }))
      }
    }
  };
}

async function pushLineMessages(messages: LineMessage[]) {
  const settings = await readLineSettings();
  const token = settings.channelAccessToken;
  const recipientId = settings.adminGroupId;

  if (!token || !recipientId) {
    throw new Error("ยังไม่ได้ตั้งค่า LINE_CHANNEL_ACCESS_TOKEN หรือรหัสผู้รับ LINE");
  }

  const response = await fetch(LINE_PUSH_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      to: recipientId,
      messages
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    if (response.status === 401) {
      throw new Error("ส่งข้อความ LINE ไม่สำเร็จ: Channel access token ไม่ถูกต้อง หมดอายุ หรือไม่ใช่ token ของ Messaging API กรุณาใส่ token ใหม่ในหน้า admin/settings");
    }

    if (response.status === 400) {
      throw new Error(`ส่งข้อความ LINE ไม่สำเร็จ: รหัสผู้รับอาจไม่ถูกต้อง หรือผู้รับยังไม่ได้เพิ่ม/คุยกับ LINE Bot (${detail})`);
    }

    throw new Error(`ส่งข้อความ LINE ไม่สำเร็จ (${response.status}) ${detail}`);
  }
}

export async function sendLineGroupMessage(message: string) {
  return pushLineMessages([buildTextFlexMessage(message)]);
}

export async function sendLineGroupFlexMessage(message: LineMessage) {
  return pushLineMessages([message]);
}
