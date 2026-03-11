import { api } from '@/constants/api';

export type ProductFile = {
  id: number;
  filename: string;
  path: string;
};

export type Product = {
  id: number;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  productType?: string;
  group?: { name: string };
  kitItems?: Array<{ quantity: number; product?: { name: string } }>;
  files?: ProductFile[];
};

export async function fetchProduct(id: number): Promise<Product> {
  const res = await fetch(`${api.products}/${id}`);
  if (!res.ok) throw new Error('Failed to fetch product');
  return res.json();
}

export async function fetchProducts(groupId?: string): Promise<Product[]> {
  const url = groupId ? `${api.products}?groupId=${groupId}` : api.products;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
}

export async function createProduct(data: {
  name: string;
  sku: string;
  quantity?: number;
  price: number;
  description?: string;
  productType?: string;
}): Promise<Product> {
  const res = await fetch(api.products, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to create product');
  }
  return res.json();
}

export async function updateQuantity(
  id: number,
  data: { quantity?: number; adjust?: number; source?: string }
): Promise<Product> {
  const res = await fetch(`${api.products}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to update');
  }
  return res.json();
}

export type Order = {
  id: number;
  customerName: string;
  customerEmail: string;
  total: number;
  status: string;
  createdAt: string;
  items?: Array<{ quantity: number }>;
};

export async function fetchOrders(): Promise<{ orders: Order[] }> {
  const res = await fetch(api.orders);
  if (!res.ok) throw new Error('Failed to fetch orders');
  return res.json();
}

export async function fetchLogs(page = 1, limit = 50): Promise<{
  logs: Array<unknown>;
  total: number;
  totalPages: number;
}> {
  const res = await fetch(`${api.logs}?page=${page}&limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch logs');
  return res.json();
}
