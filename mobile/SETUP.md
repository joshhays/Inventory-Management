# Inventory Mobile Setup

## 1. Start your backend

From the `inventory-system-backend` folder:

```bash
npm start
```

The API runs at `http://localhost:3000`.

## 2. Configure API URL for device testing

When testing on a **physical phone** with Expo Go, `localhost` won't work. Use your computer's IP address:

1. Find your IP: `ipconfig getifaddr en0` (Mac) or `ipconfig` (Windows)
2. Edit `constants/api.ts` and set:

```ts
export const API_BASE = 'http://YOUR_IP:3000';  // e.g. http://192.168.1.5:3000
```

## 3. Run the app

```bash
npx expo start
```

Scan the QR code with Expo Go (Camera on iOS, Expo Go app on Android).

## 4. Optional: Use tunnel for different networks

If your phone and computer are on different networks:

```bash
npx expo start --tunnel
```

You'll still need your backend accessible (e.g. deployed or via ngrok).
