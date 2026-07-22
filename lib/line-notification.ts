import type { CustomerOrder } from "@/lib/types";
import { BRAND_NAME, SITE_URL } from "@/lib/brand";
import { readLineSettings } from "@/lib/line-settings";

const LINE_PUSH_ENDPOINT = "https://api.line.me/v2/bot/message/push";

type LineMessage = {
  type: "text";
  text: string;
} | {
  type: "flex";
  altText: string;
  contents: Record<string, unknown>;
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
  const groupId = settings.adminGroupId;

  if (!token || !groupId) {
    throw new Error("ยังไม่ได้ตั้งค่า LINE_CHANNEL_ACCESS_TOKEN หรือ LINE_ADMIN_GROUP_ID");
  }

  const response = await fetch(LINE_PUSH_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      to: groupId,
      messages
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`ส่งข้อความ LINE ไม่สำเร็จ (${response.status}) ${detail}`);
  }
}

export async function sendLineGroupMessage(message: string) {
  return pushLineMessages([buildTextFlexMessage(message)]);
}

export async function sendLineGroupFlexMessage(message: LineMessage) {
  return pushLineMessages([message]);
}
