export type ProductTypeId = string;
export type FlowerTypeId = string;
export type ColorId = string;
export type StemStrength = string;
export type StemStyle = string;
export type StemColor = string;
export type WrapId = string;
export type RibbonId = string;
export type DecorationId = string;

export type CatalogOption = {
  id: string;
  name: string;
  description: string;
  price: number;
};

export type CatalogImage = {
  url: string;
  path: string;
  width: number;
  height: number;
  format: "webp" | "avif";
  size: number;
};

export type ProductType = Omit<CatalogOption, "id"> & {
  id: ProductTypeId;
  baseQuantity: number;
  productionScore: number;
  productionDays: number;
  imageTone: string;
  image?: CatalogImage;
};

export type FlowerType = Omit<CatalogOption, "id"> & {
  id: FlowerTypeId;
  englishName: string;
  available: boolean;
  materialStock: number;
};

export type FlowerColor = {
  id: ColorId;
  name: string;
  hex: string;
  price: number;
  inStock: boolean;
  tone: "soft" | "vivid" | "neutral" | "warm";
};

export type StemOption = {
  strengths: Record<StemStrength, CatalogOption>;
  styles: Record<StemStyle, CatalogOption>;
  lengths: Record<string, CatalogOption>;
  colors: Record<StemColor, { id: StemColor; name: string; hex: string; price: number }>;
};

export type CardMessage = {
  to: string;
  message: string;
  from: string;
};

export type ConfiguratorState = {
  productType: ProductTypeId | "";
  flowerType: FlowerTypeId | "";
  quantity: number;
  colorMode: "single" | "individual";
  flowerColors: ColorId[];
  stem: {
    strength: StemStrength;
    style: StemStyle;
    length: number;
    color: StemColor;
  };
  wrapping: WrapId;
  ribbon: RibbonId;
  decorations: DecorationId[];
  cardMessage: CardMessage;
  pickupDate: string;
  totalPrice: number;
};

export type OrderSourceItem = {
  sourceType: "gallery" | "product";
  id: string;
  title: string;
  description?: string;
  price: number;
  productionScore: number;
  imageUrl?: string;
  details?: string[];
};

export type OrderStatus =
  | "pending_review"
  | "design_confirmed"
  | "awaiting_payment"
  | "preparing_materials"
  | "in_production"
  | "quality_check"
  | "ready"
  | "completed"
  | "cancelled";

export type CustomerOrder = {
  id: string;
  authUserId?: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  lineId: string;
  email?: string;
  pickupMethod: string;
  pickupDate: string;
  pickupTime: string;
  pickupLocation: string;
  estimatedDeliveryDate?: string;
  trackingNumber?: string;
  trackingCarrier?: string;
  trackingUrl?: string;
  note?: string;
  subtotal: number;
  total: number;
  depositAmount: number;
  productionScore: number;
  paymentStatus: "pending" | "deposit_due" | "awaiting_slip_review" | "paid" | "failed" | "refunded";
  orderStatus: OrderStatus;
  config: ConfiguratorState;
  sourceItem?: OrderSourceItem;
  paymentSlip?: {
    url: string;
    path: string;
    amount: number;
    parsedAmount?: number;
    status: "awaiting_review" | "paid" | "failed";
    message: string;
    uploadedAt: string;
  };
  createdAt: string;
  adminReadAt?: string;
};
