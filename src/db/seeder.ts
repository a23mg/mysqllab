import type { DatabaseAdapter, Product } from '../types/index.ts';

export interface SeedResult {
  totalFetched: number;
  totalSeeded: number;
  durationMs: number;
}

export async function seedFromDummyJson(
  adapter: DatabaseAdapter,
  limit = 100,
  onProgress?: (msg: string) => void
): Promise<SeedResult> {
  const start = Date.now();
  onProgress?.(`Fetching ${limit} products from DummyJSON...`);

  const url = `https://dummyjson.com/products?limit=${limit}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch from DummyJSON: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as { products: any[]; total: number };
  onProgress?.(`Received ${data.products.length} products. Inserting into database...`);

  const products: Product[] = data.products.map(p => ({
    id: p.id,
    title: String(p.title),
    description: String(p.description || ''),
    category: String(p.category || 'general'),
    price: Number(p.price || 0),
    discountPercentage: Number(p.discountPercentage || 0),
    rating: Number(p.rating || 0),
    stock: Number(p.stock || 0),
    brand: p.brand ? String(p.brand) : undefined,
    sku: p.sku ? String(p.sku) : undefined,
    thumbnail: p.thumbnail ? String(p.thumbnail) : undefined
  }));

  const count = await adapter.seedProducts(products);
  const durationMs = Date.now() - start;

  onProgress?.(`Successfully seeded ${count} products in ${durationMs}ms.`);

  return {
    totalFetched: data.products.length,
    totalSeeded: count,
    durationMs
  };
}
