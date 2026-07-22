import type {
  DecorationId,
  FlowerColor,
  FlowerType,
  ProductType,
  RibbonId,
  StemOption,
  WrapId
} from "./types";

export const productTypes: ProductType[] = [
];

export const flowerTypes: FlowerType[] = [
];

export const colors: FlowerColor[] = [
];

export const stems: StemOption = {
  strengths: {} as StemOption["strengths"],
  styles: {} as StemOption["styles"],
  lengths: {} as StemOption["lengths"],
  colors: {} as StemOption["colors"]
};

export const wrappingOptions = {} as Record<WrapId, { id: WrapId; name: string; description: string; price: number; color: string }>;

export const ribbonOptions = {} as Record<RibbonId, { id: RibbonId; name: string; price: number; color: string }>;

export const decorationOptions = {} as Record<DecorationId, { id: DecorationId; name: string; description: string; price: number }>;

export const galleryItems: Array<{
  id: string;
  title: string;
  flower: string;
  color: string;
  size: string;
  price: number;
  productType: ProductType["id"];
  flowerType: FlowerType["id"];
}> = [];

export const materials: Array<{
  name: string;
  color: string | null;
  stock: number;
  unit: string;
  alertAt: number;
  cost: number;
  supplier: string;
  status: string;
}> = [];
