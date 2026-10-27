import mysql from 'mysql2/promise';
import type { DatabaseAdapter, Order, PaginatedResult, Product, ProductFilters } from '../types/index.ts';

export class MySQLAdapter implements DatabaseAdapter {
  type: 'mysql' = 'mysql';
  connectionInfo: string;
  private connectionUrl: string;
  private pool: mysql.Pool | null = null;

  constructor(connectionUrl: string) {
    this.connectionUrl = connectionUrl;
    // Mask password in connection info display
    try {
      const parsed = new URL(connectionUrl);
      this.connectionInfo = `MySQL: ${parsed.username || 'user'}@${parsed.hostname}:${parsed.port || 3306}${parsed.pathname}`;
    } catch {
      this.connectionInfo = `MySQL: ${connectionUrl.replace(/:([^@/]+)@/, ':****@')}`;
    }
  }

  async init(): Promise<void> {
    this.pool = mysql.createPool({
      uri: this.connectionUrl,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      dateStrings: true
    });

    // Test connection
    const connection = await this.pool.getConnection();
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS products (
          id INT AUTO_INCREMENT PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          category VARCHAR(100) NOT NULL,
          price DECIMAL(10, 2) NOT NULL,
          discountPercentage DECIMAL(5, 2) DEFAULT 0,
          rating DECIMAL(3, 2) DEFAULT 0,
          stock INT NOT NULL DEFAULT 0,
          brand VARCHAR(150),
          sku VARCHAR(100),
          thumbnail VARCHAR(500),
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_category (category),
          INDEX idx_title (title)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS orders (
          id INT AUTO_INCREMENT PRIMARY KEY,
          customerName VARCHAR(255) NOT NULL,
          totalAmount DECIMAL(10, 2) NOT NULL,
          totalItems INT NOT NULL,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS order_items (
          id INT AUTO_INCREMENT PRIMARY KEY,
          orderId INT NOT NULL,
          productId INT NOT NULL,
          productTitle VARCHAR(255) NOT NULL,
          price DECIMAL(10, 2) NOT NULL,
          quantity INT NOT NULL,
          total DECIMAL(10, 2) NOT NULL,
          FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
    } finally {
      connection.release();
    }
  }

  private getPool(): mysql.Pool {
    if (!this.pool) throw new Error('Database not initialized. Call init() first.');
    return this.pool;
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

    const pool = this.getPool();
    const [countRows]: any = await pool.query(`SELECT COUNT(*) as count FROM products ${whereSql}`, params);
    const total = Number(countRows[0]?.count || 0);

    const validSortCols = ['id', 'price', 'rating', 'stock', 'title'];
    const safeSortBy = validSortCols.includes(sortBy) ? sortBy : 'id';
    const safeSortOrder = sortOrder === 'DESC' ? 'DESC' : 'ASC';

    const offset = Math.max(0, (page - 1) * limit);
    const [items]: any = await pool.query(
      `SELECT * FROM products ${whereSql} ORDER BY ${safeSortBy} ${safeSortOrder} LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return {
      items: items.map(this.mapProduct),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit))
    };
  }

  async getProductById(id: number): Promise<Product | null> {
    const pool = this.getPool();
    const [rows]: any = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
    if (!rows || rows.length === 0) return null;
    return this.mapProduct(rows[0]);
  }

  async createProduct(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    const pool = this.getPool();
    const [res]: any = await pool.query(
      `INSERT INTO products (title, description, category, price, discountPercentage, rating, stock, brand, sku, thumbnail)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

    const created = await this.getProductById(res.insertId);
    if (!created) throw new Error('Failed to retrieve newly created product');
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

    params.push(id);
    const pool = this.getPool();
    await pool.query(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`, params);
    return this.getProductById(id);
  }

  async deleteProduct(id: number): Promise<boolean> {
    const pool = this.getPool();
    const [res]: any = await pool.query('DELETE FROM products WHERE id = ?', [id]);
    return res.affectedRows > 0;
  }

  async getCategories(): Promise<string[]> {
    const pool = this.getPool();
    const [rows]: any = await pool.query('SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != "" ORDER BY category ASC');
    return rows.map((r: any) => r.category);
  }

  async createOrder(customerName: string, items: Array<{ productId: number; quantity: number }>): Promise<Order> {
    if (items.length === 0) throw new Error('Cannot create an empty order');

    const pool = this.getPool();
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      let totalAmount = 0;
      let totalItems = 0;
      const resolvedItems: Array<{ product: Product; quantity: number; subtotal: number }> = [];

      for (const item of items) {
        const [prodRows]: any = await conn.query('SELECT * FROM products WHERE id = ? FOR UPDATE', [item.productId]);
        if (!prodRows || prodRows.length === 0) throw new Error(`Product #${item.productId} not found`);
        const product = this.mapProduct(prodRows[0]);

        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for "${product.title}" (available: ${product.stock}, requested: ${item.quantity})`);
        }

        const subtotal = product.price * item.quantity;
        totalAmount += subtotal;
        totalItems += item.quantity;
        resolvedItems.push({ product, quantity: item.quantity, subtotal });
      }

      const [orderRes]: any = await conn.query(
        'INSERT INTO orders (customerName, totalAmount, totalItems) VALUES (?, ?, ?)',
        [customerName || 'Anonymous Customer', totalAmount, totalItems]
      );
      const orderId = orderRes.insertId;

      for (const item of resolvedItems) {
        await conn.query(
          'INSERT INTO order_items (orderId, productId, productTitle, price, quantity, total) VALUES (?, ?, ?, ?, ?, ?)',
          [orderId, item.product.id, item.product.title, item.product.price, item.quantity, item.subtotal]
        );
        await conn.query('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.product.id]);
      }

      await conn.commit();

      const [orderRow]: any = await pool.query('SELECT * FROM orders WHERE id = ?', [orderId]);
      const [orderItemRows]: any = await pool.query('SELECT * FROM order_items WHERE orderId = ?', [orderId]);

      return {
        id: orderRow[0].id,
        customerName: orderRow[0].customerName,
        totalAmount: Number(orderRow[0].totalAmount),
        totalItems: Number(orderRow[0].totalItems),
        createdAt: orderRow[0].createdAt,
        items: orderItemRows.map((it: any) => ({
          ...it,
          price: Number(it.price),
          total: Number(it.total)
        }))
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  async getOrders(): Promise<Order[]> {
    const pool = this.getPool();
    const [orders]: any = await pool.query('SELECT * FROM orders ORDER BY id DESC');
    const result: Order[] = [];
    for (const ord of orders) {
      const [items]: any = await pool.query('SELECT * FROM order_items WHERE orderId = ?', [ord.id]);
      result.push({
        id: ord.id,
        customerName: ord.customerName,
        totalAmount: Number(ord.totalAmount),
        totalItems: Number(ord.totalItems),
        createdAt: ord.createdAt,
        items: items.map((it: any) => ({
          ...it,
          price: Number(it.price),
          total: Number(it.total)
        }))
      });
    }
    return result;
  }

  async seedProducts(products: Product[]): Promise<number> {
    const pool = this.getPool();
    let count = 0;
    for (const p of products) {
      await pool.query(
        `INSERT INTO products (id, title, description, category, price, discountPercentage, rating, stock, brand, sku, thumbnail)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           title = VALUES(title),
           description = VALUES(description),
           category = VALUES(category),
           price = VALUES(price),
           discountPercentage = VALUES(discountPercentage),
           rating = VALUES(rating),
           stock = VALUES(stock),
           brand = VALUES(brand),
           sku = VALUES(sku),
           thumbnail = VALUES(thumbnail)`,
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
      count++;
    }
    return count;
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  private mapProduct(row: any): Product {
    return {
      id: Number(row.id),
      title: String(row.title),
      description: String(row.description || ''),
      category: String(row.category || ''),
      price: Number(row.price),
      discountPercentage: Number(row.discountPercentage || 0),
      rating: Number(row.rating || 0),
      stock: Number(row.stock || 0),
      brand: row.brand ? String(row.brand) : undefined,
      sku: row.sku ? String(row.sku) : undefined,
      thumbnail: row.thumbnail ? String(row.thumbnail) : undefined,
      createdAt: row.createdAt ? String(row.createdAt) : undefined,
      updatedAt: row.updatedAt ? String(row.updatedAt) : undefined
    };
  }
}
