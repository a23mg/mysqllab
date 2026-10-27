import { describe, expect, it, beforeAll, afterAll } from 'bun:test';
import { SQLiteAdapter } from './sqlite.ts';
import fs from 'node:fs';

const TEST_DB = 'data/test_mysqllab.db';

describe('Database Adapter (SQLite)', () => {
  let adapter: SQLiteAdapter;

  beforeAll(async () => {
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
    adapter = new SQLiteAdapter(TEST_DB);
    await adapter.init();
  });

  afterAll(async () => {
    await adapter.close();
    try {
      if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
    } catch {
      // Ignore windows handle delay
    }
  });

  it('creates and retrieves a product', async () => {
    const created = await adapter.createProduct({
      title: 'Test Coffee Mug',
      description: 'Ceramic mug 350ml',
      category: 'kitchen',
      price: 12.99,
      discountPercentage: 5,
      rating: 4.8,
      stock: 50,
      brand: 'BaristaCo',
      sku: 'BAR-MUG-01'
    });

    expect(created.id).toBeDefined();
    expect(created.title).toBe('Test Coffee Mug');
    expect(created.price).toBe(12.99);

    const fetched = await adapter.getProductById(created.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.title).toBe('Test Coffee Mug');
  });

  it('updates product price and stock', async () => {
    const products = await adapter.getProducts();
    const item = products.items[0]!;

    const updated = await adapter.updateProduct(item.id, {
      price: 15.99,
      stock: 45
    });

    expect(updated?.price).toBe(15.99);
    expect(updated?.stock).toBe(45);
  });

  it('searches and filters products', async () => {
    const res = await adapter.getProducts({ search: 'Coffee' });
    expect(res.total).toBe(1);
    expect(res.items[0]?.title).toBe('Test Coffee Mug');

    const empty = await adapter.getProducts({ category: 'nonexistent' });
    expect(empty.total).toBe(0);
  });

  it('creates an order and decrements inventory', async () => {
    const products = await adapter.getProducts();
    const item = products.items[0]!;
    const initialStock = item.stock;

    const order = await adapter.createOrder('Jane Doe', [
      { productId: item.id, quantity: 2 }
    ]);

    expect(order.id).toBeDefined();
    expect(order.customerName).toBe('Jane Doe');
    expect(order.totalItems).toBe(2);
    expect(order.totalAmount).toBe(item.price * 2);

    const updatedProduct = await adapter.getProductById(item.id);
    expect(updatedProduct?.stock).toBe(initialStock - 2);

    const orders = await adapter.getOrders();
    expect(orders.length).toBe(1);
  });

  it('deletes a product', async () => {
    const products = await adapter.getProducts();
    const item = products.items[0]!;

    const deleted = await adapter.deleteProduct(item.id);
    expect(deleted).toBe(true);

    const fetched = await adapter.getProductById(item.id);
    expect(fetched).toBeNull();
  });
});
