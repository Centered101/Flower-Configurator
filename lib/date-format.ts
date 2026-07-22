const THAI_GREGORIAN_LOCALE = "th-TH-u-ca-gregory-nu-latn";

export function formatThaiIsoDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(`${value}T00:00:00`) : value;
  const weekday = new Intl.DateTimeFormat(THAI_GREGORIAN_LOCALE, {
    weekday: "long"
  }).format(date);
  const day = new Intl.DateTimeFormat(THAI_GREGORIAN_LOCALE, {
    day: "numeric"
  }).format(date);
  const month = new Intl.DateTimeFormat(THAI_GREGORIAN_LOCALE, {
    month: "long"
  }).format(date);
  const monthNumber = new Intl.DateTimeFormat(THAI_GREGORIAN_LOCALE, {
    month: "2-digit"
  }).format(date);
  const year = new Intl.DateTimeFormat(THAI_GREGORIAN_LOCALE, {
    year: "numeric",
  }).format(date);

  return `${weekday}ที่ ${day} เดือน${month} (${monthNumber}) ${year}`;
}

export function formatThaiShortDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(`${value}T00:00:00`) : value;
  return new Intl.DateTimeFormat(THAI_GREGORIAN_LOCALE, {
    day: "numeric",
    month: "short"
  }).format(date);
}
