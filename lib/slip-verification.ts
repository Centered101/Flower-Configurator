import jsQR from "jsqr";
import sharp from "sharp";
import { getComparablePromptPayTarget } from "@/lib/promptpay";

export type SlipVerificationStatus = "paid" | "awaiting_review" | "failed";

export type SlipVerificationResult = {
  status: SlipVerificationStatus;
  message: string;
  qrPayload?: string;
  parsedAmount?: number;
  receiverTarget?: string;
  receiverMatched: boolean | null;
};

function parseTlvPayload(payload: string) {
  const tags: Record<string, string> = {};
  let cursor = 0;

  while (cursor + 4 <= payload.length) {
    const id = payload.slice(cursor, cursor + 2);
    const length = Number(payload.slice(cursor + 2, cursor + 4));
    if (!Number.isFinite(length) || length < 0) break;

    const start = cursor + 4;
    const end = start + length;
    if (end > payload.length) break;

    tags[id] = payload.slice(start, end);
    cursor = end;
  }

  return tags;
}

export function parseSlipQrPayload(payload: string) {
  const tags = parseTlvPayload(payload);
  const merchantInfo = tags["29"] ? parseTlvPayload(tags["29"]) : {};
  const receiver = ["01", "02", "03"]
    .map((tag) => merchantInfo[tag] ? `${tag}:${merchantInfo[tag]}` : "")
    .find(Boolean);

  return {
    amount: tags["54"] ? Number(tags["54"]) : undefined,
    currency: tags["53"],
    receiver
  };
}

export async function decodeSlipQrPayload(buffer: Buffer) {
  const { data, info } = await sharp(buffer)
    .rotate()
    .resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const imageData = new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength);
  const result = jsQR(imageData, info.width, info.height, { inversionAttempts: "attemptBoth" });

  return result?.data?.trim() || "";
}

export function verifySlipPayload(input: {
  payload: string;
  expectedAmount: number;
  promptPayId?: string;
}): SlipVerificationResult {
  if (!input.payload) {
    return {
      status: "awaiting_review",
      message: "อ่าน QR ในสลิปไม่ได้ กรุณาให้ผู้ดูแลร้านตรวจสอบสลิป",
      receiverMatched: null
    };
  }

  const parsed = parseSlipQrPayload(input.payload);
  const expectedAmount = Number(input.expectedAmount.toFixed(2));
  const parsedAmount = typeof parsed.amount === "number" && Number.isFinite(parsed.amount)
    ? Number(parsed.amount.toFixed(2))
    : undefined;

  if (parsed.currency && parsed.currency !== "764") {
    return {
      status: "failed",
      message: "สกุลเงินในสลิปไม่ใช่เงินบาท",
      qrPayload: input.payload,
      parsedAmount,
      receiverTarget: parsed.receiver,
      receiverMatched: null
    };
  }

  if (parsedAmount === undefined) {
    return {
      status: "awaiting_review",
      message: "อ่าน QR ได้ แต่ไม่พบยอดเงินในสลิป กรุณาให้ผู้ดูแลร้านตรวจสอบ",
      qrPayload: input.payload,
      receiverTarget: parsed.receiver,
      receiverMatched: null
    };
  }

  if (Math.abs(parsedAmount - expectedAmount) > 0.01) {
    return {
      status: "failed",
      message: `ยอดเงินในสลิป ${parsedAmount.toLocaleString("th-TH")} บาท ไม่ตรงกับยอดมัดจำ ${expectedAmount.toLocaleString("th-TH")} บาท`,
      qrPayload: input.payload,
      parsedAmount,
      receiverTarget: parsed.receiver,
      receiverMatched: null
    };
  }

  if (!input.promptPayId) {
    return {
      status: "awaiting_review",
      message: "ยอดเงินตรงแล้ว แต่ยังไม่ได้ตั้งค่า PromptPay ID สำหรับตรวจบัญชีผู้รับ",
      qrPayload: input.payload,
      parsedAmount,
      receiverTarget: parsed.receiver,
      receiverMatched: null
    };
  }

  if (!parsed.receiver) {
    return {
      status: "awaiting_review",
      message: "ยอดเงินตรงแล้ว แต่ QR ในสลิปไม่มีข้อมูลบัญชีผู้รับที่ระบบอ่านได้ กรุณาให้ผู้ดูแลร้านตรวจสอบ",
      qrPayload: input.payload,
      parsedAmount,
      receiverTarget: parsed.receiver,
      receiverMatched: null
    };
  }

  const expectedReceiver = getComparablePromptPayTarget(input.promptPayId);
  const receiverMatched = parsed.receiver === expectedReceiver;
  if (!receiverMatched) {
    return {
      status: "failed",
      message: "บัญชีผู้รับในสลิปไม่ตรงกับบัญชีรับเงินของร้าน",
      qrPayload: input.payload,
      parsedAmount,
      receiverTarget: parsed.receiver,
      receiverMatched
    };
  }

  return {
    status: "paid",
    message: "ตรวจสอบสลิปสำเร็จ ยอดมัดจำและบัญชีผู้รับถูกต้อง",
    qrPayload: input.payload,
    parsedAmount,
    receiverTarget: parsed.receiver,
    receiverMatched
  };
}
