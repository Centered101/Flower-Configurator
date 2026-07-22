const PROMPTPAY_AID = "A000000677010111";

function tlv(id: string, value: string) {
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

function crc16Ccitt(value: string) {
  let crc = 0xffff;

  for (let index = 0; index < value.length; index += 1) {
    crc ^= value.charCodeAt(index) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 0x8000) !== 0 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function normalizePromptPayTarget(rawValue: string) {
  const digits = rawValue.replace(/\D/g, "");

  if (digits.length === 10 && digits.startsWith("0")) {
    return { tag: "01", value: `0066${digits.slice(1)}` };
  }

  if (digits.length === 11 && digits.startsWith("66")) {
    return { tag: "01", value: `00${digits}` };
  }

  if (digits.length === 13 && digits.startsWith("0066")) {
    return { tag: "01", value: digits };
  }

  if (digits.length === 13) {
    return { tag: "02", value: digits };
  }

  return { tag: "03", value: rawValue.trim() };
}

export function getComparablePromptPayTarget(rawValue: string) {
  const normalized = normalizePromptPayTarget(rawValue);
  return `${normalized.tag}:${normalized.value}`;
}

export function createPromptPayPayload(promptPayId: string, amount: number) {
  const target = normalizePromptPayTarget(promptPayId);
  const merchantAccount = tlv("00", PROMPTPAY_AID) + tlv(target.tag, target.value);
  const amountText = amount.toFixed(2);
  const payloadWithoutCrc = [
    tlv("00", "01"),
    tlv("01", "12"),
    tlv("29", merchantAccount),
    tlv("53", "764"),
    tlv("54", amountText),
    tlv("58", "TH"),
    "6304"
  ].join("");

  return `${payloadWithoutCrc}${crc16Ccitt(payloadWithoutCrc)}`;
}
