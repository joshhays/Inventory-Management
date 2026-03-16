/**
 * Backend API URL
 *
 * RAILWAY_URL: Set to your Railway deployment URL (e.g. https://your-app.railway.app)
 * to use the deployed backend. Use this when testing on a real device or in production.
 *
 * DEVICE_IP: Only used when RAILWAY_URL is empty. For local testing on a physical phone,
 * set to your computer's IP (same Wi‑Fi as phone). Leave empty for simulator/emulator.
 */
const RAILWAY_URL = 'https://inventory-management-production-2079.up.railway.app';
const DEVICE_IP = ''; // e.g. '192.168.1.133' for local testing on a real phone

const base = RAILWAY_URL
  ? RAILWAY_URL.replace(/\/$/, '')
  : DEVICE_IP
    ? `http://${DEVICE_IP}:3000`
    : 'http://localhost:3000';

export const API_BASE = base;

export const api = {
  products: `${API_BASE}/api/products`,
  orders: `${API_BASE}/api/orders`,
  logs: `${API_BASE}/api/logs`,
};
