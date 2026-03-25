package com.zaykabillpos

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Add custom notification package
          add(NotificationPackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
    createNotificationChannel()
  }

  private fun createNotificationChannel() {
    // Create notification channel for Android 8.0+ (API 26+)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channelId = "zaykabill_pos_channel"
      val channelName = "ZaykaBill POS Notifications"
      val channelDescription = "Notifications for orders, updates, and important information"
      val importance = NotificationManager.IMPORTANCE_DEFAULT
      
      val channel = NotificationChannel(channelId, channelName, importance).apply {
        description = channelDescription
        enableVibration(true)
        enableLights(true)
      }
      
      val notificationManager = getSystemService(NotificationManager::class.java)
      notificationManager?.createNotificationChannel(channel)
    }
  }
}
