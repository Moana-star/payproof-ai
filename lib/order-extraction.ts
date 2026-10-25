export const MAX_MESSAGE_LENGTH = 2000;
export const PRODUCTS = [
  { name: "Coffee gift set", aliases: ["coffee", "coffee gift"] },
  { name: "Ceramic mug pair", aliases: ["mug", "mugs", "ceramic"] },
  { name: "Handwoven market tote", aliases: ["tote", "bag", "market tote"] }
] as const;

export type Draft = {
  product: string | null;
  quantity: number | null;
  customerNote: string;
  missingInformation: string[];
  confidenceNotes: string;
};

export function safeDraft(value: unknown): Draft | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const data = value as Record<string, unknown>;
  const product = typeof data.product === "string" && PRODUCTS.some((p) => p.name === data.product)
    ? data.product : null;
  const quantity = Number.isInteger(data.quantity) && Number(data.quantity) > 0 && Number(data.quantity) <= 100
    ? Number(data.quantity) : null;
  const missingInformation = Array.isArray(data.missingInformation)
    ? data.missingInformation.filter((x): x is string => typeof x === "string").slice(0, 5).map((x) => x.slice(0, 160))
    : [];
  return {
    product,
    quantity,
    customerNote: typeof data.customerNote === "string" ? data.customerNote.slice(0, 500) : "",
    missingInformation,
    confidenceNotes: typeof data.confidenceNotes === "string" ? data.confidenceNotes.slice(0, 240) : "Review all extracted details."
  };
}
