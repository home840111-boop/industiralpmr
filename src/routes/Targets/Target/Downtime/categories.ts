type downtimeCategoriesType =
  | "uncategorized"
  | "planned stoppage"
  | "machine problem"
  | "machine maintenance"
  | "material"
  | "mold change"
  | "part change"
  | "other";

const downtimeCategories: downtimeCategoriesType[] = [
  "uncategorized",
  "planned stoppage",
  "machine problem",
  "machine maintenance",
  "material",
  "mold change",
  "part change",
  "other",
];

export default downtimeCategories;
export type { downtimeCategoriesType };
