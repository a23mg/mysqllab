export interface Product {
  id: number;
  title: string;
  description?: string;
  category: string;
  price: number;
  discountPercentage?: number;
  rating?: number;
  stock: number;
  brand?: string;
  sku?: string;
  thumbnail?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderItem {
  id?: number;
  orderId?: number;
  productId: number;
  productTitle: string;
  price: number;
  quantity: number;
  total: number;
}

export interface Order {
  id: number;
  customerName: string;
  totalAmount: number;
  totalItems: number;
  createdAt: string;
  items: OrderItem[];
}

export interface ProductFilters {
  search?: string;
  category?: string;
  page?: number;
  limit?: number;
  sortBy?: 'id' | 'price' | 'rating' | 'stock' | 'title';
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DatabaseAdapter {
  type: 'mysql' | 'sqlite';
  connectionInfo: string;
  init(): Promise<void>;
  getProducts(filters?: ProductFilters): Promise<PaginatedResult<Product>>;
  getProductById(id: number): Promise<Product | null>;
  createProduct(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product>;
  updateProduct(id: number, data: Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Product | null>;
  deleteProduct(id: number): Promise<boolean>;
  getCategories(): Promise<string[]>;
  createOrder(customerName: string, items: Array<{ productId: number; quantity: number }>): Promise<Order>;
  getOrders(): Promise<Order[]>;
  seedProducts(products: Product[]): Promise<number>;
  close(): Promise<void>;
}
