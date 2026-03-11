/**
 * Backend API URL
 *
 * On a PHYSICAL DEVICE (Expo Go): localhost won't work!
 * Set DEVICE_IP to your computer's IP address (same Wi‑Fi as phone):
 *   Mac: run "ipconfig getifaddr en0" in Terminal
 *   Windows: run "ipconfig" and use the IPv4 Address
 *
 * Leave DEVICE_IP empty when using iOS Simulator or Android Emulator.
 */
const DEVICE_IP = '192.168.1.133'; // your computer's IP for testing on a real phone

export const API_BASE =
  __DEV__
    ? DEVICE_IP
      ? `http://${DEVICE_IP}:3000`
      : 'http://localhost:3000'
    : 'https://your-production-url.com';

export const api = {
  products: `${API_BASE}/api/products`,
  orders: `${API_BASE}/api/orders`,
  logs: `${API_BASE}/api/logs`,
};
