import fs from 'node:fs';
import path from 'node:path';
import type { DatabaseAdapter, Order, PaginatedResult, Product, ProductFilters } from '../types/index.ts';

export class SQLiteAdapter implements DatabaseAdapter {
  type: 'sqlite' = 'sqlite';
  connectionInfo: string;
  private dbPath: string;
  // biome-ignore lint/suspicious/noExplicitAny: generic db instance
  private db: any = null;

  constructor(filePath = 'data/mysqllab.db') {
    this.dbPath = path.resolve(process.cwd(), filePath);
    this.connectionInfo = `SQLite: ${this.dbPath}`;
  }

  async init(): Promise<void> {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (typeof (globalThis as any).Bun !== 'undefined') {
      const { Database } = await import('bun:sqlite');
      this.db = new Database(this.dbPath);
      this.db.exec('PRAGMA journal_mode = WAL;');
      this.db.exec('PRAGMA foreign_keys = ON;');
    } else {
      const { DatabaseSync } = await import('node:sqlite');
      this.db = new DatabaseSync(this.dbPath);
      this.db.exec('PRAGMA journal_mode = WAL;');
      this.db.exec('PRAGMA foreign_keys = ON;');
    }

    const schemaSql = `
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL,
        price REAL NOT NULL,
        discountPercentage REAL DEFAULT 0,
        rating REAL DEFAULT 0,
        stock INTEGER NOT NULL DEFAULT 0,
        brand TEXT,
        sku TEXT,
        thumbnail TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customerName TEXT NOT NULL,
        totalAmount REAL NOT NULL,
        totalItems INTEGER NOT NULL,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        orderId INTEGER NOT NULL,
        productId INTEGER NOT NULL,
        productTitle TEXT NOT NULL,
        price REAL NOT NULL,
        quantity INTEGER NOT NULL,
        total REAL NOT NULL,
        FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
      CREATE INDEX IF NOT EXISTS idx_products_title ON products(title);
    `;

    this.db.exec(schemaSql);
  }

  private run(sql: string, params: any[] = []): any {
    if (typeof (globalThis as any).Bun !== 'undefined') {
      const stmt = this.db.prepare(sql);
      return stmt.run(...params);
    } else {
      const stmt = this.db.prepare(sql);
      return stmt.run(...params);
    }
  }

  private queryAll<T = any>(sql: string, params: any[] = []): T[] {
    if (typeof (globalThis as any).Bun !== 'undefined') {
      const stmt = this.db.prepare(sql);
      return stmt.all(...params) as T[];
    } else {
      const stmt = this.db.prepare(sql);
      return stmt.all(...params) as T[];
    }
  }

  private queryOne<T = any>(sql: string, params: any[] = []): T | null {
    if (typeof (globalThis as any).Bun !== 'undefined') {
      const stmt = this.db.prepare(sql);
      return (stmt.get(...params) as T) || null;
    } else {
      const stmt = this.db.prepare(sql);
      return (stmt.get(...params) as T) || null;
    }
  }

  async getProducts(filters: ProductFilters = {}): Promise<PaginatedResult<Product>> {
    const {
      search = '',
      category = '',
      page = 1,
      limit = 10,
      sortBy = 'id',
      sortOrder = 'ASC'
    } = filters;

    const whereClauses: string[] = [];
    const params: any[] = [];

    if (search.trim()) {
      whereClauses.push('(title LIKE ? OR description LIKE ? OR brand LIKE ?)');
      const wildcard = `%${search.trim()}%`;
      params.push(wildcard, wildcard, wildcard);
    }

    if (category.trim() && category !== 'ALL') {
      whereClauses.push('category = ?');
      params.push(category.trim());
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRow = this.queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM products ${whereSql}`, params);
    const total = countRow ? countRow.count : 0;

    const validSortCols = ['id', 'price', 'rating', 'stock', 'title'];
    const safeSortBy = validSortCols.includes(sortBy) ? sortBy : 'id';
    const safeSortOrder = sortOrder === 'DESC' ? 'DESC' : 'ASC';

    const offset = Math.max(0, (page - 1) * limit);
    const items = this.queryAll<Product>(
      `SELECT * FROM products ${whereSql} ORDER BY ${safeSortBy} ${safeSortOrder} LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit))
    };
  }

  async getProductById(id: number): Promise<Product | null> {
    return this.queryOne<Product>('SELECT * FROM products WHERE id = ?', [id]);
  }

  async createProduct(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    const res = this.run(
      `INSERT INTO products (title, description, category, price, discountPercentage, rating, stock, brand, sku, thumbnail, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [
        data.title,
        data.description || '',
        data.category,
        data.price,
        data.discountPercentage || 0,
        data.rating || 0,
        data.stock,
        data.brand || '',
        data.sku || '',
        data.thumbnail || ''
      ]
    );

    const newId = Number(res.lastInsertRowid);
    const created = await this.getProductById(newId);
    if (!created) throw new Error('Failed to retrieve created product');
    return created;
  }

  async updateProduct(id: number, data: Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Product | null> {
    const updates: string[] = [];
    const params: any[] = [];

    if (data.title !== undefined) { updates.push('title = ?'); params.push(data.title); }
    if (data.description !== undefined) { updates.push('description = ?'); params.push(data.description); }
    if (data.category !== undefined) { updates.push('category = ?'); params.push(data.category); }
    if (data.price !== undefined) { updates.push('price = ?'); params.push(data.price); }
    if (data.discountPercentage !== undefined) { updates.push('discountPercentage = ?'); params.push(data.discountPercentage); }
    if (data.rating !== undefined) { updates.push('rating = ?'); params.push(data.rating); }
    if (data.stock !== undefined) { updates.push('stock = ?'); params.push(data.stock); }
    if (data.brand !== undefined) { updates.push('brand = ?'); params.push(data.brand); }
    if (data.sku !== undefined) { updates.push('sku = ?'); params.push(data.sku); }
    if (data.thumbnail !== undefined) { updates.push('thumbnail = ?'); params.push(data.thumbnail); }

    if (updates.length === 0) return this.getProductById(id);

    updates.push("updatedAt = datetime('now')");
    params.push(id);

    this.run(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`, params);
    return this.getProductById(id);
  }

  async deleteProduct(id: number): Promise<boolean> {
    const res = this.run('DELETE FROM products WHERE id = ?', [id]);
    return (res.changes ?? 1) > 0;
  }

  async getCategories(): Promise<string[]> {
    const rows = this.queryAll<{ category: string }>('SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != "" ORDER BY category ASC');
    return rows.map(r => r.category);
  }

  async createOrder(customerName: string, items: Array<{ productId: number; quantity: number }>): Promise<Order> {
    if (items.length === 0) throw new Error('Cannot create an empty order');

    let totalAmount = 0;
    let totalItems = 0;
    const resolvedItems: Array<{ product: Product; quantity: number; subtotal: number }> = [];

    for (const item of items) {
      const product = await this.getProductById(item.productId);
      if (!product) throw new Error(`Product #${item.productId} not found`);
      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for "${product.title}" (available: ${product.stock}, requested: ${item.quantity})`);
      }
      const subtotal = product.price * item.quantity;
      totalAmount += subtotal;
      totalItems += item.quantity;
      resolvedItems.push({ product, quantity: item.quantity, subtotal });
    }

    const orderRes = this.run(
      `INSERT INTO orders (customerName, totalAmount, totalItems, createdAt) VALUES (?, ?, ?, datetime('now'))`,
      [customerName || 'Anonymous Customer', totalAmount, totalItems]
    );

    const orderId = Number(orderRes.lastInsertRowid);

    for (const item of resolvedItems) {
      this.run(
        `INSERT INTO order_items (orderId, productId, productTitle, price, quantity, total) VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, item.product.id, item.product.title, item.product.price, item.quantity, item.subtotal]
      );
      // Auto-decrement inventory
      this.run(
        `UPDATE products SET stock = stock - ?, updatedAt = datetime('now') WHERE id = ?`,
        [item.quantity, item.product.id]
      );
    }

    const orderRow = this.queryOne<any>('SELECT * FROM orders WHERE id = ?', [orderId]);
    const orderItemRows = this.queryAll<any>('SELECT * FROM order_items WHERE orderId = ?', [orderId]);

    return {
      id: orderRow.id,
      customerName: orderRow.customerName,
      totalAmount: orderRow.totalAmount,
      totalItems: orderRow.totalItems,
      createdAt: orderRow.createdAt,
      items: orderItemRows
    };
  }

  async getOrders(): Promise<Order[]> {
    const orders = this.queryAll<any>('SELECT * FROM orders ORDER BY id DESC');
    const result: Order[] = [];
    for (const ord of orders) {
      const items = this.queryAll<any>('SELECT * FROM order_items WHERE orderId = ?', [ord.id]);
      result.push({
        id: ord.id,
        customerName: ord.customerName,
        totalAmount: ord.totalAmount,
        totalItems: ord.totalItems,
        createdAt: ord.createdAt,
        items
      });
    }
    return result;
  }

  async seedProducts(products: Product[]): Promise<number> {
    let inserted = 0;
    for (const p of products) {
      this.run(
        `INSERT INTO products (id, title, description, category, price, discountPercentage, rating, stock, brand, sku, thumbnail, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
         ON CONFLICT(id) DO UPDATE SET
           title = excluded.title,
           description = excluded.description,
           category = excluded.category,
           price = excluded.price,
           discountPercentage = excluded.discountPercentage,
           rating = excluded.rating,
           stock = excluded.stock,
           brand = excluded.brand,
           sku = excluded.sku,
           thumbnail = excluded.thumbnail,
           updatedAt = datetime('now')`,
        [
          p.id,
          p.title,
          p.description || '',
          p.category,
          p.price,
          p.discountPercentage || 0,
          p.rating || 0,
          p.stock,
          p.brand || '',
          p.sku || '',
          p.thumbnail || ''
        ]
      );
      inserted++;
    }
    return inserted;
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
