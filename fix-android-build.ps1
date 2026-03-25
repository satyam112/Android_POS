# Quick Fix Script for Android Build Issues
# Run this before: npm run android

Write-Host "Fixing Android build environment..." -ForegroundColor Cyan

# Try to find Java 17 first (more compatible with CMake)
# Check multiple locations
$java17 = $null

# Check specific common locations
$java17Locations = @(
    "C:\Program Files\Java\jdk-17",
    "C:\Program Files\Java\jdk-17.*",
    "C:\Program Files\Eclipse Adoptium\jdk-17.*",
    "C:\Program Files (x86)\Java\jdk-17.*",
    "$env:ProgramFiles\Java\jdk-17.*",
    "$env:ProgramFiles\Eclipse Adoptium\jdk-17.*",
    "C:\Program Files\Microsoft\jdk-17.*"
)

foreach ($location in $java17Locations) {
    if ($location -match "\*") {
        # Pattern matching location
        $jdk = Get-ChildItem -Path $location -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
    } else {
        # Exact path
        if (Test-Path $location) {
            $jdk = Get-Item $location
        }
    }
    if ($jdk -and (Test-Path "$($jdk.FullName)\bin\java.exe")) {
        $java17 = $jdk.FullName
        break
    }
}

# If still not found, try to get from current java command
if (-not $java17) {
    try {
        $javaPath = (Get-Command java -ErrorAction Stop).Source
        if ($javaPath -match "jdk-17") {
            $java17 = (Split-Path (Split-Path $javaPath))
            if (Test-Path "$java17\bin\java.exe") {
                Write-Host "Found Java 17 from current java command" -ForegroundColor Green
            } else {
                $java17 = $null
            }
        }
    } catch {
        # Ignore if java command not found
    }
}

$java25 = Get-ChildItem "C:\Program Files\Eclipse Adoptium\" -Directory -Filter "jdk-25*" -ErrorAction SilentlyContinue | Select-Object -First 1

if ($java17) {
    $javaHome = $java17
    Write-Host "Using Java 17 (recommended for React Native)" -ForegroundColor Green
    Write-Host "Java 17 found at: $javaHome" -ForegroundColor Green
} elseif ($java25) {
    $javaHome = $java25.FullName
    Write-Host "Using Java 25 (may have CMake compatibility issues)" -ForegroundColor Yellow
    Write-Host "WARNING: Java 17 is recommended but not found. Install Java 17 for best compatibility." -ForegroundColor Yellow
} else {
    Write-Host "ERROR: Java 17+ not found!" -ForegroundColor Red
    Write-Host "Please install Java 17 from:" -ForegroundColor Yellow
    Write-Host "https://adoptium.net/" -ForegroundColor Yellow
    exit 1
}

$env:JAVA_HOME = $javaHome
$env:PATH = "$javaHome\bin;$env:PATH"

Write-Host "JAVA_HOME set to: $env:JAVA_HOME" -ForegroundColor Green

# Verify Java version
Write-Host ""
Write-Host "Java Version:" -ForegroundColor Yellow
$javaVersion = & "$javaHome\bin\java.exe" -version 2>&1 | Select-Object -First 1
Write-Host $javaVersion -ForegroundColor White

# Set Android SDK path (adjust if needed)
$androidSdk = "$env:LOCALAPPDATA\Android\Sdk"
if (-not (Test-Path $androidSdk)) {
    $androidSdk = "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk"
}

if (Test-Path $androidSdk) {
    Write-Host ""
    Write-Host "Android SDK found at: $androidSdk" -ForegroundColor Green
    
    # Create local.properties
    $localProps = "android\local.properties"
    $sdkPath = $androidSdk -replace '\\', '\\'
    Set-Content -Path $localProps -Value "sdk.dir=$sdkPath"
    Write-Host "Created/Updated android/local.properties" -ForegroundColor Green
    
    # Add ADB to PATH
    $platformTools = Join-Path $androidSdk "platform-tools"
    # Also check user-provided path
    $userAdbPath = "C:\Users\SamPC\AppData\Local\Android\Sdk\platform-tools"
    if (Test-Path $userAdbPath) {
        $env:PATH = "$userAdbPath;$env:PATH"
        Write-Host "Added platform-tools to PATH from: $userAdbPath" -ForegroundColor Green
    } elseif (Test-Path $platformTools) {
        $env:PATH = "$platformTools;$env:PATH"
        Write-Host "Added platform-tools to PATH from: $platformTools" -ForegroundColor Green
    }
} else {
    Write-Host ""
    Write-Host "WARNING: Android SDK not found at: $androidSdk" -ForegroundColor Yellow
    Write-Host "Please update android/local.properties with your SDK path:" -ForegroundColor Yellow
    Write-Host "Example: sdk.dir=C:\\Users\\YourName\\AppData\\Local\\Android\\Sdk" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Environment setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Make sure AVD is running (start from Android Studio)" -ForegroundColor White
Write-Host "2. Run: npm start (in one terminal)" -ForegroundColor White
Write-Host "3. Run: npm run android (in another terminal)" -ForegroundColor White
Write-Host ""
Write-Host "Tip: Keep this terminal open for these settings to remain active" -ForegroundColor Yellow
