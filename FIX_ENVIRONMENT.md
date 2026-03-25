# 🔧 Fix Android Build Environment - Quick Guide

## 🚨 Current Issues

From your terminal output:
1. ❌ **Java Version**: Gradle needs Java 17+, but Java 11 is being used
2. ❌ **Android SDK**: ADB not found in PATH
3. ❌ **AVD**: No emulator running

## ✅ Quick Fix (5 minutes)

### Option 1: Run Fix Script (Easiest)

```powershell
cd C:\dev\Restaurant_POS\AndroidPOS\ZaykaBillPOS
.\fix-android-build.ps1
```

This will:
- ✅ Set JAVA_HOME to Java 25 (or Java 17 if found)
- ✅ Create `android/local.properties` with SDK path
- ✅ Add ADB to PATH

**Then in the same PowerShell session:**
```powershell
npm run android
```

### Option 2: Manual Fix

**Step 1: Set Java 17+**
```powershell
cd C:\dev\Restaurant_POS\AndroidPOS\ZaykaBillPOS

# Use Java 25 (found on your system)
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-25.0.0.36-hotspot"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"

# Verify
java -version  # Should show Java 25 or 17
```

**Step 2: Set Android SDK Path**
```powershell
# Create local.properties
$sdkPath = "$env:LOCALAPPDATA\Android\Sdk"
# Or if different location:
# $sdkPath = "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk"

$sdkPathEscaped = $sdkPath -replace '\\', '\\'
Set-Content -Path "android\local.properties" -Value "sdk.dir=$sdkPathEscaped"
```

**Step 3: Add ADB to PATH**
```powershell
$androidSdk = "$env:LOCALAPPDATA\Android\Sdk"
$env:PATH = "$androidSdk\platform-tools;$env:PATH"

# Verify
adb version
```

**Step 4: Start AVD**
1. Open Android Studio
2. Go to **Tools → Device Manager**
3. Click **▶️ Play** on your AVD
4. Wait for it to boot up

**Step 5: Run the App**
```powershell
# Terminal 1: Start Metro
npm start

# Terminal 2: Build and run
npm run android
```

---

## 🎯 What Should Happen

After running `npm run android`:
1. ✅ Gradle will build the APK (using Java 17+)
2. ✅ App will install on your AVD
3. ✅ App will launch showing **"ZaykaBill Welcome"** screen

---

## 🐛 Still Not Working?

### Issue: "SDK location not found"

**Check local.properties exists:**
```powershell
cat android\local.properties
```

Should show:
```
sdk.dir=C:\\Users\\YourName\\AppData\\Local\\Android\\Sdk
```

If it doesn't exist or is wrong, run the fix script again.

### Issue: "Gradle still using Java 11"

**Solution:**
1. Make sure you set JAVA_HOME in the same PowerShell session
2. Verify: `echo $env:JAVA_HOME`
3. Should show: `C:\Program Files\Eclipse Adoptium\jdk-25.0.0.36-hotspot`
4. Then run: `npm run android` in the same session

### Issue: "No devices found"

**Check if AVD is running:**
```powershell
adb devices
```

Should show:
```
List of devices attached
emulator-5554   device
```

If empty:
1. Start AVD from Android Studio
2. Wait for it to fully boot (home screen visible)
3. Try `adb devices` again

---

## 💡 Pro Tip: Make Settings Permanent

To avoid running the fix script every time:

1. **Set JAVA_HOME permanently:**
   - Open **System Properties** → **Environment Variables**
   - Add/Edit `JAVA_HOME` = `C:\Program Files\Eclipse Adoptium\jdk-25.0.0.36-hotspot`
   - Add `%JAVA_HOME%\bin` to PATH

2. **Set ANDROID_HOME permanently:**
   - Add/Edit `ANDROID_HOME` = `C:\Users\YourName\AppData\Local\Android\Sdk`
   - Add `%ANDROID_HOME%\platform-tools` and `%ANDROID_HOME%\emulator` to PATH

3. **Restart PowerShell** for changes to take effect

---

## ✅ Success Checklist

- [x] Java 17+ installed and JAVA_HOME set
- [x] Android SDK path set in `android/local.properties`
- [x] ADB available in PATH
- [x] AVD running and visible in `adb devices`
- [x] Metro bundler running (`npm start`)
- [x] App builds and runs on AVD

---

**Ready to build! 🚀**














