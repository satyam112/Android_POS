# ZaykaBill POS - Environment Setup Script
# Run this script before building the Android app

Write-Host "🔧 Setting up ZaykaBill POS Android environment..." -ForegroundColor Cyan

# Check Java installation
Write-Host "`n📦 Checking Java installation..." -ForegroundColor Yellow
$javaVersion = java -version 2>&1 | Select-String "version"
Write-Host $javaVersion

# Find Java 17 or higher
$javaPaths = @(
    "C:\Program Files\Eclipse Adoptium\jdk-17*",
    "C:\Program Files\Java\jdk-17*",
    "C:\Program Files\Eclipse Adoptium\jdk-25*",
    "C:\Program Files\Java\jdk-25*",
    "C:\Program Files (x86)\Java\jdk-17*"
)

$javaHome = $null
foreach ($path in $javaPaths) {
    $jdk = Get-ChildItem -Path $path -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($jdk) {
        $javaHome = $jdk.FullName
        Write-Host "✅ Found Java at: $javaHome" -ForegroundColor Green
        break
    }
}

if (-not $javaHome) {
    Write-Host "⚠️  Java 17+ not found in common locations." -ForegroundColor Yellow
    Write-Host "Please set JAVA_HOME manually to Java 17 or higher installation." -ForegroundColor Yellow
    Write-Host "Example: `$env:JAVA_HOME = 'C:\Program Files\Eclipse Adoptium\jdk-17.0.12.8-hotspot'" -ForegroundColor Yellow
    exit 1
}

# Set JAVA_HOME for current session
$env:JAVA_HOME = $javaHome
$env:PATH = "$javaHome\bin;$env:PATH"

Write-Host "✅ JAVA_HOME set to: $env:JAVA_HOME" -ForegroundColor Green

# Check Android SDK
Write-Host "`n📱 Checking Android SDK..." -ForegroundColor Yellow
$androidPaths = @(
    "$env:LOCALAPPDATA\Android\Sdk",
    "$env:ANDROID_HOME",
    "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk",
    "$env:ProgramFiles\Android\Sdk"
)

$androidSdk = $null
foreach ($path in $androidPaths) {
    if (Test-Path $path) {
        $androidSdk = $path
        Write-Host "✅ Found Android SDK at: $androidSdk" -ForegroundColor Green
        break
    }
}

if (-not $androidSdk) {
    Write-Host "⚠️  Android SDK not found in common locations." -ForegroundColor Yellow
    Write-Host "Please create android/local.properties with your SDK path:" -ForegroundColor Yellow
    Write-Host "Example: sdk.dir=C:\\Users\\YourName\\AppData\\Local\\Android\\Sdk" -ForegroundColor Yellow
} else {
    # Create local.properties if it doesn't exist
    $localProps = "android\local.properties"
    if (-not (Test-Path $localProps)) {
        $sdkPath = $androidSdk -replace '\\', '\\'
        Add-Content -Path $localProps -Value "sdk.dir=$sdkPath"
        Write-Host "✅ Created $localProps with SDK path" -ForegroundColor Green
    }
}

# Check ADB
Write-Host "`n🔌 Checking ADB..." -ForegroundColor Yellow
if ($androidSdk) {
    $adbPath = Join-Path $androidSdk "platform-tools\adb.exe"
    if (Test-Path $adbPath) {
        Write-Host "✅ ADB found at: $adbPath" -ForegroundColor Green
        # Add platform-tools to PATH for current session
        $env:PATH = "$(Split-Path $adbPath);$env:PATH"
    } else {
        Write-Host "⚠️  ADB not found. Please install Android SDK Platform Tools." -ForegroundColor Yellow
    }
}

Write-Host "`n✅ Environment setup complete!" -ForegroundColor Green
Write-Host "`nTo use these settings in your current PowerShell session:" -ForegroundColor Cyan
Write-Host "  JAVA_HOME: $env:JAVA_HOME" -ForegroundColor White
if ($androidSdk) {
    Write-Host "  ANDROID_SDK: $androidSdk" -ForegroundColor White
}
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Start your AVD (Android Virtual Device)" -ForegroundColor White
Write-Host "2. Run: npm start (in one terminal)" -ForegroundColor White
Write-Host "3. Run: npm run android (in another terminal)" -ForegroundColor White














