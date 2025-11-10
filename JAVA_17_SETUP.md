# ⚠️ Java 17 Required - CMake Compatibility Issue

## Problem

The build is failing because **Java 25** has restricted methods that CMake doesn't support. React Native 0.82 requires Java 17 for the New Architecture (CMake).

**Error:** `Execution failed for task ':app:configureCMakeDebug[x86_64]'. WARNING: A restricted method in java.lang.System has been called`

## ✅ Solution: Install Java 17

### Step 1: Download Java 17

1. Go to: **https://adoptium.net/temurin/releases/**
2. Select:
   - **Version:** 17 (LTS)
   - **Operating System:** Windows
   - **Architecture:** x64
   - **Package Type:** JDK
3. Click **Download** and install it

### Step 2: Update fix-android-build.ps1

After installing Java 17, the script will automatically detect it and use it instead of Java 25.

### Step 3: Run Again

```powershell
cd C:\dev\Restaurant_POS\AndroidPOS\ZaykaBillPOS
.\fix-android-build.ps1
npm run android
```

## 🔍 Verify Java 17 Installation

After installing Java 17, verify it's available:

```powershell
Get-ChildItem "C:\Program Files\Eclipse Adoptium\" -Directory -Filter "jdk-17*"
```

You should see something like:
```
jdk-17.0.12.8-hotspot
```

## 📝 Alternative: Manual Setup

If you prefer to manually set Java 17:

```powershell
# Find your Java 17 installation path
$java17Path = Get-ChildItem "C:\Program Files\Eclipse Adoptium\" -Directory -Filter "jdk-17*" | Select-Object -First 1 -ExpandProperty FullName

# Set environment variables
$env:JAVA_HOME = $java17Path
$env:PATH = "$java17Path\bin;$env:PATH"

# Verify
java -version  # Should show version 17

# Then run
npm run android
```

## ⚡ Quick Fix (If Java 17 is installed)

If Java 17 is already installed but not being detected:

1. Update `fix-android-build.ps1` to check your Java 17 path
2. Or manually set JAVA_HOME before running:

```powershell
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.12.8-hotspot"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
cd C:\dev\Restaurant_POS\AndroidPOS\ZaykaBillPOS
npm run android
```

---

**Once Java 17 is installed and set, the app should build successfully! 🚀**














