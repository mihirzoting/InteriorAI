const images = import.meta.glob("@/assets/products/*.jpg", { eager: true, import: "default" }) as Record<
  string,
  string
>;

export function productImage(key: string): string {
  const entry = Object.entries(images).find(([path]) => path.endsWith(`/${key}.jpg`));
  return entry?.[1] ?? "";
}

export const ROOM_TYPES = ["Living Room", "Bedroom", "Kitchen", "Dining Room", "Office"] as const;
export const STYLES = ["Modern", "Minimalist", "Scandinavian", "Industrial", "Luxury", "Bohemian"] as const;
export const COLOR_OPTIONS = [
  "white", "cream", "beige", "natural", "grey", "black", "brown", "green", "terracotta", "pink", "gold", "blue",
] as const;

export const formatPrice = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

export type Product = {
  id: string;
  name: string;
  category: string;
  style: string;
  room_types: string[];
  colors: string[];
  materials: string[];
  price: number;
  width_cm: number | null;
  depth_cm: number | null;
  height_cm: number | null;
  description: string;
  image_key: string;
  tags: string[];
};
