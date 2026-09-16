/** Listing categories. `value` matches the Prisma `Category` enum. */
export const CATEGORIES = [
  { value: "PHONES", label: "Phones", image: "/photos/px10.jpg" },
  { value: "LAPTOPS", label: "Laptops", image: "/photos/macbook.webp" },
  { value: "DESKTOPS", label: "Desktops", image: "/photos/gaming pc.webp" },
  { value: "MONITORS", label: "Monitors", image: "/photos/monitors.jpeg" },
  { value: "COMPONENTS", label: "Components", image: "/photos/ram photos.jpg" },
  { value: "CAMERAS", label: "Cameras", image: "/photos/sony camera.webp" },
] as const;

export type CategoryValue = (typeof CATEGORIES)[number]["value"];

export const CATEGORY_VALUES = CATEGORIES.map((c) => c.value) as [
  CategoryValue,
  ...CategoryValue[],
];

export function categoryLabel(value: string) {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function isCategory(value: string): value is CategoryValue {
  return (CATEGORY_VALUES as string[]).includes(value);
}
