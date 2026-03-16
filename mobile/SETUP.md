# Inventory Mobile Setup

## 1. Install dependencies

```bash
cd mobile
npm install
```

If you see npm cache permission errors, run: `sudo chown -R $(whoami) ~/.npm` then retry.

## 2. Start your backend (optional for local testing)

From the `inventory-system-backend` folder:

```bash
npm start
```

The API runs at `http://localhost:3000`.

## 3. Run the app

```bash
npx expo start
```

Scan the QR code with Expo Go (Camera on iOS, Expo Go app on Android).

## 4. Deployment selection

On first launch, you'll see a **Select deployment** screen. Choose **@properties** (or add more in `constants/deployments.ts` as customers onboard). The selection is saved and used for all API calls.

To switch deployments later, tap **Switch** on the Dashboard.

## 5. Adding new deployments

Edit `constants/deployments.ts` and add entries:

```ts
{
  id: 'acme',
  name: 'Acme Corp',
  apiBase: 'https://acme-inventory.railway.app',
  logoUrl: 'https://acme-inventory.railway.app/logo.png',
},
```

## 6. Login required

You must sign in before using the app. Use the same admin credentials as the web dashboard. After login you have full access to Products, Orders, Transaction Log, and quantity adjustments.

## 7. Optional: Use tunnel for different networks

If your phone and computer are on different networks:

```bash
npx expo start --tunnel
```

You'll still need your backend accessible (e.g. deployed on Railway).
