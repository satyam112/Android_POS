# ZaykaBill POS - Android Application

A React Native Android application for ZaykaBill Restaurant POS System.

## ⚠️ Important: Java 17 Required

**React Native 0.82 requires Java 17** (not Java 11 or Java 25) for the New Architecture.

If you see CMake errors, please see **[JAVA_17_SETUP.md](JAVA_17_SETUP.md)** for installation instructions.

## 🚀 Quick Start

### Prerequisites

- ✅ **Java 17** (Required - download from https://adoptium.net/)
- ✅ Node.js >= 20
- ✅ Android SDK installed
- ✅ Android Virtual Device (AVD) set up and running
- ✅ Java Development Kit (JDK) 17

### Step 1: Install Dependencies

```bash
cd AndroidPOS/ZaykaBillPOS
npm install
```

### Step 2: Set Up Environment

Run the setup script to configure Java and Android SDK:

```bash
.\fix-android-build.ps1
```

This script will:
- ✅ Set JAVA_HOME to Java 17 (or Java 25 if 17 not found)
- ✅ Configure Android SDK path in `android/local.properties`
- ✅ Add ADB to PATH

### Step 3: Start Metro Bundler

In one terminal, run:

```bash
npm start
```

Keep this running.

### Step 4: Start AVD

Make sure your Android Virtual Device is running:
1. Open Android Studio
2. Go to **Tools → Device Manager**
3. Click **▶️ Play** on your AVD
4. Wait until it fully boots (home screen visible)

### Step 5: Run the App

In a **NEW terminal** (after running `fix-android-build.ps1`):

```bash
cd C:\dev\Restaurant_POS\AndroidPOS\ZaykaBillPOS
.\fix-android-build.ps1  # Set environment again
npm run android
```

## 📱 What You'll See

The app displays a welcome screen with:
- 🍽️ ZaykaBill logo in a blue circle
- "ZaykaBill" title
- "Welcome" subtitle
- "Restaurant POS System" description

## 🛠️ Technologies Used

- **React Native** 0.82.1 - Cross-platform mobile framework
- **TypeScript** - Type-safe JavaScript
- **Android SDK** - Native Android development

## 📁 Project Structure

```
ZaykaBillPOS/
├── android/          # Android native code
├── App.tsx          # Main app component (Welcome screen)
├── package.json     # Dependencies and scripts
├── fix-android-build.ps1  # Environment setup script
├── JAVA_17_SETUP.md # Java 17 installation guide
└── README.md        # This file
```

## 🔧 Troubleshooting

### Issue: "Gradle requires JVM 17 or later"

**Solution:** 
1. Install Java 17 from https://adoptium.net/
2. Run `.\fix-android-build.ps1` again
3. It should automatically detect and use Java 17

### Issue: "CMake restricted method warning"

**Solution:** 
This happens with Java 25. Install Java 17 and set it as JAVA_HOME. See **[JAVA_17_SETUP.md](JAVA_17_SETUP.md)**

### Issue: "SDK location not found"

**Solution:**
The `fix-android-build.ps1` script should create `android/local.properties` automatically. If not, create it manually:
```
sdk.dir=C:\\Users\\YourName\\AppData\\Local\\Android\\Sdk
```

### Issue: "No devices/emulators found"

**Solution:**
1. Make sure AVD is running (check Android Studio Device Manager)
2. Verify with: `adb devices`
3. Should show: `emulator-5554   device`

### Issue: "Metro bundler cache issues"

**Solution:**
```bash
npm start -- --reset-cache
```

## 📚 Resources

- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [Java 17 Download](https://adoptium.net/temurin/releases/?version=17)
- [React Native Setup Guide](https://reactnative.dev/docs/environment-setup)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

For information about third-party dependencies and their licenses, please see:
- [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md) - Complete list of all dependencies
- [README_LICENSES.md](README_LICENSES.md) - License overview and React Native information

---

**Built with ❤️ for ZaykaBill Restaurant POS System**
