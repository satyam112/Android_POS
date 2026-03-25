# Zayka Captain – Captain ordering app

Captain app for table-wise orders. Login with **Captain Key** only (no username/password/OTP). Same branding as Zayka Bill Android app.

## Setup

1. **Copy assets from Zayka Bill app**
   - Copy `logo.png` from `../ZaykaBillPOS/logo.png` into this folder (CaptainPOS root).
   - Optionally copy `assets/` from ZaykaBillPOS if you add image assets later.

2. **Native projects (Android / iOS)**
   - Either copy the `android/` and `ios/` folders from `../ZaykaBillPOS`, then:
     - In `android`: update `applicationId` and app name to `CaptainPOS` / "Zayka Captain".
     - In `ios`: update bundle ID and display name to match.
   - Or create a new React Native app in a temp folder and move the generated `android/` and `ios/` here.

3. **Install and run**
   ```bash
   npm install
   npx react-native start
   # In another terminal:
   npx react-native run-android
   ```

## API base URL

Default: `https://zaykabill.com`. Override in `services/captain-api.ts` if needed (e.g. dev server).

## Flow

1. **Splash** → **Login** (enter Captain Key).
2. **Menu** – categories and items, add to cart, floating cart button.
3. **Cart** – select a **vacant** table, place order. Ordering is only allowed when the store is **Open** (Web POS header toggle).
4. After order is placed, cart is cleared and you return to the menu.

## Captain Key

Generated in Web POS: **Settings → Captain → Add New Captain**. Use the shown key in this app to sign in.
