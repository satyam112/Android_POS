# ZaykaBill POS Android - Setup and Run Guide

## ✅ Quick Setup Steps

### 1. Install Dependencies

Open a terminal in the project directory and run:

```bash
cd C:\dev\Restaurant_POS\AndroidPOS\ZaykaBillPOS
npm install
```

### 2. Start Android Virtual Device (AVD)

**Option A: Using Android Studio**
1. Open Android Studio
2. Go to **Tools → Device Manager**
3. Click **▶️ Play** button on your AVD
4. Wait for the emulator to boot up

**Option B: Using Command Line**
```bash
emulator -avd YourAVDName
```

### 3. Start Metro Bundler

In the project root (`ZaykaBillPOS`), run:

```bash
npm start
```

Or:

```bash
npx react-native start
```

Keep this terminal open. You should see Metro bundler starting with a QR code.

### 4. Run the App on AVD

Open a **NEW terminal window** (keep Metro bundler running), navigate to the project directory, and run:

```bash
cd C:\dev\Restaurant_POS\AndroidPOS\ZaykaBillPOS
npm run android
```

Or:

```bash
npx react-native run-android
```

## 🎯 What to Expect

- Metro bundler will compile JavaScript code
- Gradle will build the Android APK
- App will automatically install on your AVD
- App will launch showing "ZaykaBill Welcome" screen with:
  - 🍽️ Logo icon in a blue circle
  - "ZaykaBill" title
  - "Welcome" subtitle
  - "Restaurant POS System" description

## 🐛 Troubleshooting

### Issue: "SDK location not found"

**Solution:**
1. Open `android/local.properties` file
2. Add your Android SDK path:
   ```
   sdk.dir=C:\\Users\\YourUsername\\AppData\\Local\\Android\\Sdk
   ```
   (Replace `YourUsername` with your actual Windows username)

### Issue: "Command failed: gradlew.bat"

**Solution:**
```bash
cd android
./gradlew clean
cd ..
npm run android
```

### Issue: "Metro bundler cache issues"

**Solution:**
```bash
npm start -- --reset-cache
```

Then in a new terminal:
```bash
npm run android
```

### Issue: "No devices/emulators found"

**Solution:**
1. Make sure AVD is running (check Android Studio Device Manager)
2. Verify with:
   ```bash
   adb devices
   ```
   You should see your emulator listed

### Issue: "Build failed"

**Solution:**
```bash
cd android
./gradlew clean
./gradlew build
cd ..
npm run android
```

## 📱 Testing

Once the app is running:
- You should see the ZaykaBill welcome screen
- The screen has a blue circular logo with 🍽️
- "ZaykaBill" text at the top
- "Welcome" text below it
- "Restaurant POS System" description

## 🔄 Hot Reload

After making code changes:
- **Android**: Press `R` key twice or `Ctrl+M` → Select "Reload"
- Shake device → Select "Reload"
- Or save the file and it will auto-reload

## 📚 Next Steps

After successfully running the app:
1. ✅ Welcome screen is displayed
2. Next: Set up SQLite database
3. Next: Implement authentication
4. Next: Build POS features

---

**Ready to build! 🚀**













