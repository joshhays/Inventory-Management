import { getApiBase } from '@/contexts/DeploymentContext';

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

function api() {
  const base = getApiBase().replace(/\/$/, '');
  return {
    products: `${base}/api/products`,
    orders: `${base}/api/orders`,
    logs: `${base}/api/logs`,
  };
}

const fetchOpts = (init?: RequestInit): RequestInit => ({
  ...init,
  credentials: 'include' as RequestCredentials,
  headers: { 'Content-Type': 'application/json', ...init?.headers },
});

export type ProductFile = {
  id: number;
  filename: string;
  path: string;
  url?: string;
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
  const res = await fetch(`${api().products}/${id}`, fetchOpts());
  if (!res.ok) throw new Error('Failed to fetch product');
  return res.json();
}

export async function fetchProducts(groupId?: string): Promise<Product[]> {
  const url = groupId ? `${api().products}?groupId=${groupId}` : api().products;
  const res = await fetch(url, fetchOpts());
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
  const res = await fetch(api().products, fetchOpts({
    method: 'POST',
    body: JSON.stringify(data),
  }));
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(
      (err as { message?: string })?.message || 'Failed to create product',
      res.status
    );
  }
  return res.json();
}

export async function updateQuantity(
  id: number,
  data: { quantity?: number; adjust?: number; source?: string }
): Promise<Product> {
  const res = await fetch(`${api().products}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(
      (err as { message?: string })?.message || 'Failed to update',
      res.status
    );
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
  const res = await fetch(api().orders, fetchOpts());
  if (!res.ok) throw new ApiError(await res.text().catch(() => 'Failed to fetch orders'), res.status);
  return res.json();
}

export async function fetchLogs(page = 1, limit = 50): Promise<{
  logs: Array<unknown>;
  total: number;
  totalPages: number;
}> {
  const res = await fetch(`${api().logs}?page=${page}&limit=${limit}`, fetchOpts());
  if (!res.ok) throw new ApiError(await res.text().catch(() => 'Failed to fetch logs'), res.status);
  return res.json();
}
