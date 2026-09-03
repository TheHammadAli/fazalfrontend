export function formatPrice(value: number | string | undefined | null): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value ?? "");
  return num.toLocaleString("en-US");
}
