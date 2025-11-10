# 🚀 ZaykaBill POS - Quick Start Guide

## ⚠️ Current Issues & Solutions

Based on your terminal output, here are the issues and how to fix them:

### Issue 1: Java Version Mismatch
**Error:** `Gradle requires JVM 17 or later to run. Your build is currently configured to use JVM 11.`

**Solution:**
1. You have Java 17 installed (verified with `java -version`)
2. Set JAVA_HOME to point to Java 17

**Option A: Run the setup script (Recommended)**
```powershell
cd C:\dev\Restaurant_POS\AndroidPOS\ZaykaBillPOS
.\setup-env.ps1
```

**Option B: Manual setup**
```powershell
# Find your Java 17 installation (check these paths):
# - C:\Program Files\Eclipse Adoptium\jdk-17*
# - C:\Program Files\Java\jdk-17*

# Then set JAVA_HOME:
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.12.8-hotspot"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"

# Verify:
java -version  # Should show version 17
```

### Issue 2: Android SDK Path Not Found
**Error:** `'"adb"' is not recognized`

**Solution:**
1. Find your Android SDK location (usually):
   - `C:\Users\YourName\AppData\Local\Android\Sdk`
   
2. Create `android/local.properties` file:
```powershell
cd C:\dev\Restaurant_POS\AndroidPOS\ZaykaBillPOS
# Replace with your actual SDK path
$sdkPath = "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk"
$sdkPathEscaped = $sdkPath -replace '\\', '\\'
Add-Content -Path "android\local.properties" -Value "sdk.dir=$sdkPathEscaped"
```

### Issue 3: AVD Not Running
**Error:** `No emulators found`

**Solution:**
1. **Start AVD from Android Studio:**
   - Open Android Studio
   - Go to **Tools → Device Manager**
   - Click **▶️ Play** on your AVD
   - Wait for it to boot up

2. **Or start from command line (after setting up Android SDK):**
```powershell
# List available AVDs
$env:ANDROID_HOME = "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk"
& "$env:ANDROID_HOME\emulator\emulator.exe" -list-avds

# Start an AVD (replace with your AVD name)
& "$env:ANDROID_HOME\emulator\emulator.exe" -avd YourAVDName
```

---

## ✅ Step-by-Step Fix & Run

### Step 1: Set Up Environment

**Quick way (recommended):**
```powershell
cd C:\dev\Restaurant_POS\AndroidPOS\ZaykaBillPOS
.\setup-env.ps1
```

**Or manually:**
```powershell
# Set Java 17 (adjust path to your Java 17 installation)
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.12.8-hotspot"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"

# Set Android SDK (adjust path to your SDK location)
$env:ANDROID_HOME = "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk"
$env:PATH = "$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:PATH"

# Create local.properties
$sdkPathEscaped = $env:ANDROID_HOME -replace '\\', '\\'
Set-Content -Path "android\local.properties" -Value "sdk.dir=$sdkPathEscaped"
```

### Step 2: Verify Setup

```powershell
# Check Java version (should be 17+)
java -version

# Check ADB
adb version

# Check AVDs
emulator -list-avds
```

### Step 3: Start AVD

**From Android Studio (easiest):**
1. Open Android Studio
2. Tools → Device Manager
3. Click ▶️ Play on your AVD

**Or from command line:**
```powershell
emulator -avd YourAVDName
```

### Step 4: Start Metro Bundler

**In one terminal:**
```powershell
cd C:\dev\Restaurant_POS\AndroidPOS\ZaykaBillPOS
npm start
```

Keep this running.

### Step 5: Build and Run

**In a NEW terminal (after setting environment variables):**
```powershell
cd C:\dev\Restaurant_POS\AndroidPOS\ZaykaBillPOS

# Make sure environment is set (if not using setup script)
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.12.8-hotspot"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"

# Run the app
npm run android
```

---

## 🎯 What You Should See

After successful build:
- ✅ Gradle builds the APK
- ✅ App installs on your AVD
- ✅ App launches showing:
  - 🍽️ Logo in blue circle
  - **ZaykaBill** title
  - **Welcome** subtitle
  - **Restaurant POS System** description

---

## 🔧 Permanent Fix (Optional)

To make these settings permanent (system-wide):

1. **Set JAVA_HOME permanently:**
   - Open System Properties → Environment Variables
   - Add/Edit `JAVA_HOME` = `C:\Program Files\Eclipse Adoptium\jdk-17.0.12.8-hotspot`
   - Add `%JAVA_HOME%\bin` to PATH

2. **Set ANDROID_HOME permanently:**
   - Add/Edit `ANDROID_HOME` = `C:\Users\YourName\AppData\Local\Android\Sdk`
   - Add `%ANDROID_HOME%\platform-tools` and `%ANDROID_HOME%\emulator` to PATH

---

## 📞 Need Help?

If you're still having issues:
1. Check `android/local.properties` exists with correct SDK path
2. Verify Java 17+ with `java -version`
3. Verify AVD is running with `adb devices`
4. Try clean build: `cd android && ./gradlew clean && cd .. && npm run android`














