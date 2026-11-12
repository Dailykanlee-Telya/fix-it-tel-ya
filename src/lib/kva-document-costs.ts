export interface KvaCostItem {
  id: string;
  title: string;
  quantity?: number;
  unit_price_gross?: number;
}

export function getKvaItemsTotal(items: KvaCostItem[]): number {
  return items.reduce((sum, item) => sum + Math.round((item.quantity ?? 1) * (item.unit_price_gross ?? 0) * 100), 0) / 100;
}