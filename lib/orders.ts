import { ORDER_STORAGE_KEY, LAST_ORDER_KEY, updateConfigPrice } from "./configurator";
import type { ConfiguratorCatalog } from "./configurator-catalog";
import type { ConfiguratorState, CustomerOrder, OrderSourceItem } from "./types";

const ORDERS_UPDATED_EVENT = "flower-orders-updated";
const ORDER_NUMBER_PATTERN = /^FLOWER-(\d{8})-(\d+)$/i;
const orderNumberCollator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

export function createOrderNumber(date = new Date()) {
  const ymd = date.toISOString().slice(0, 10).replaceAll("-", "");
  const serial = String(Math.floor(Math.random() * 900) + 100);
  return `FLOWER-${ymd}-${serial}`;
}

function getOrderNumberParts(orderNumber: string) {
  const match = ORDER_NUMBER_PATTERN.exec(orderNumber.trim());
  return {
    date: match ? Number(match[1]) : 0,
    serial: match ? Number(match[2]) : 0
  };
}

export function compareOrdersByOrderNumberDesc(left: CustomerOrder, right: CustomerOrder) {
  const leftParts = getOrderNumberParts(left.orderNumber);
  const rightParts = getOrderNumberParts(right.orderNumber);

  if (leftParts.date !== rightParts.date) return rightParts.date - leftParts.date;
  if (leftParts.serial !== rightParts.serial) return rightParts.serial - leftParts.serial;

  return orderNumberCollator.compare(right.orderNumber, left.orderNumber);
}

export function sortOrdersByOrderNumber(orders: CustomerOrder[]) {
  return [...orders].sort(compareOrdersByOrderNumberDesc);
}

export function getStoredOrders(): CustomerOrder[] {
  if (typeof window === "undefined") return [];
  try {
    return sortOrdersByOrderNumber(JSON.parse(window.localStorage.getItem(ORDER_STORAGE_KEY) ?? "[]") as CustomerOrder[]);
  } catch {
    return [];
  }
}

export function saveOrder(order: CustomerOrder) {
  if (typeof window === "undefined") return order;

  const orders = getStoredOrders();
  const next = sortOrdersByOrderNumber([order, ...orders]);

  try {
    window.localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(next));
    window.localStorage.setItem(LAST_ORDER_KEY, order.orderNumber);
    window.dispatchEvent(new Event(ORDERS_UPDATED_EVENT));
  } catch {
    // Keep checkout moving even if the browser blocks local storage.
  }

  return order;
}

export function updateStoredOrder(orderNumber: string, patch: Partial<CustomerOrder>) {
  if (typeof window === "undefined") return null;

  const orders = getStoredOrders();
  const index = orders.findIndex((order) => order.orderNumber === orderNumber);
  if (index < 0) return null;

  const nextOrder = { ...orders[index], ...patch };
  const next = sortOrdersByOrderNumber([
    ...orders.slice(0, index),
    nextOrder,
    ...orders.slice(index + 1)
  ]);

  try {
    window.localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(ORDERS_UPDATED_EVENT));
  } catch {
    // Keep the UI usable even if local storage is blocked.
  }

  return nextOrder;
}

export function getUnreadOrders() {
  return getStoredOrders().filter((order) => !order.adminReadAt);
}

export function getUnreadOrdersCount() {
  return getUnreadOrders().length;
}

export function markAllOrdersRead() {
  const orders = getStoredOrders();
  const now = new Date().toISOString();
  let changed = false;
  const next = sortOrdersByOrderNumber(orders.map((order) => {
    if (order.adminReadAt) return order;
    changed = true;
    return { ...order, adminReadAt: now };
  }));

  if (changed) {
    window.localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(ORDERS_UPDATED_EVENT));
  }

  return next;
}

export function deleteOrdersForCustomer(userId: string, email?: string) {
  const normalizedEmail = email?.toLowerCase();
  const orders = getStoredOrders();
  const deletedOrders = orders.filter((order) => (
    order.authUserId === userId || (normalizedEmail && order.email?.toLowerCase() === normalizedEmail)
  ));
  const next = sortOrdersByOrderNumber(orders.filter((order) => !deletedOrders.includes(order)));

  window.localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(next));

  const lastOrderNumber = window.localStorage.getItem(LAST_ORDER_KEY);
  if (lastOrderNumber && deletedOrders.some((order) => order.orderNumber === lastOrderNumber)) {
    window.localStorage.removeItem(LAST_ORDER_KEY);
  }

  window.dispatchEvent(new Event(ORDERS_UPDATED_EVENT));
  return deletedOrders.length;
}

export function listenForOrderUpdates(callback: () => void) {
  function handleStorage(event: StorageEvent) {
    if (event.key === ORDER_STORAGE_KEY) callback();
  }

  window.addEventListener(ORDERS_UPDATED_EVENT, callback);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(ORDERS_UPDATED_EVENT, callback);
    window.removeEventListener("storage", handleStorage);
  };
}

export function findOrder(orderNumber: string, lastFour?: string) {
  return getStoredOrders().find((order) => {
    const numberMatches = order.orderNumber.toLowerCase() === orderNumber.trim().toLowerCase();
    const phoneMatches = lastFour ? order.phone.slice(-4) === lastFour : true;
    return numberMatches && phoneMatches;
  });
}

export function buildOrder(payload: {
  authUserId?: string;
  customerName: string;
  phone: string;
  lineId: string;
  email?: string;
  pickupMethod: string;
  pickupDate: string;
  pickupTime: string;
  pickupLocation: string;
  estimatedDeliveryDate?: string;
  note?: string;
  config: ConfiguratorState;
  catalog?: ConfiguratorCatalog;
  productionScore: number;
  sourceItem?: OrderSourceItem;
}): CustomerOrder {
  const config = payload.sourceItem
    ? {
        ...payload.config,
        quantity: 1,
        totalPrice: payload.sourceItem.price
      }
    : payload.catalog ? updateConfigPrice(payload.config, payload.catalog) : payload.config;
  const sourceNote = payload.sourceItem
    ? [
        `สั่งซื้อจาก${payload.sourceItem.sourceType === "gallery" ? "ผลงาน" : "สินค้า"}: ${payload.sourceItem.title}`,
        payload.sourceItem.details?.length ? `รายละเอียด: ${payload.sourceItem.details.join(" / ")}` : "",
        `คะแนนการผลิต: ${payload.sourceItem.productionScore}`
      ].filter(Boolean).join("\n")
    : "";
  const note = [payload.note, sourceNote].filter(Boolean).join("\n\n");

  return {
    id: crypto.randomUUID(),
    authUserId: payload.authUserId,
    orderNumber: createOrderNumber(),
    customerName: payload.customerName,
    phone: payload.phone,
    lineId: payload.lineId,
    email: payload.email,
    pickupMethod: payload.pickupMethod,
    pickupDate: payload.pickupDate,
    pickupTime: payload.pickupTime,
    pickupLocation: payload.pickupLocation,
    estimatedDeliveryDate: payload.estimatedDeliveryDate,
    note,
    subtotal: config.totalPrice,
    total: config.totalPrice,
    depositAmount: Math.ceil(config.totalPrice * 0.5),
    productionScore: payload.sourceItem?.productionScore ?? payload.productionScore,
    paymentStatus: "deposit_due",
    orderStatus: "pending_review",
    config,
    sourceItem: payload.sourceItem,
    createdAt: new Date().toISOString()
  };
}
