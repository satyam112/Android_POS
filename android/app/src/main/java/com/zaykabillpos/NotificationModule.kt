package com.zaykabillpos

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap

class NotificationModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  
  override fun getName(): String {
    return "NotificationModule"
  }

  companion object {
    private const val CHANNEL_ID = "zaykabill_pos_channel"
    private const val CHANNEL_NAME = "ZaykaBill POS Notifications"
    private const val CHANNEL_DESCRIPTION = "Notifications for orders, updates, and important information"
    private var notificationId = 0
  }

  init {
    createNotificationChannel(reactContext)
  }

  private fun createNotificationChannel(context: Context) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val importance = NotificationManager.IMPORTANCE_HIGH
      val channel = NotificationChannel(CHANNEL_ID, CHANNEL_NAME, importance).apply {
        description = CHANNEL_DESCRIPTION
        enableVibration(true)
        enableLights(true)
        vibrationPattern = longArrayOf(0, 250, 250, 250)
      }
      
      val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      notificationManager.createNotificationChannel(channel)
    }
  }

  @ReactMethod
  fun showNotification(title: String, message: String, data: ReadableMap?, promise: Promise) {
    try {
      val context = reactApplicationContext
      val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      
      // Create intent to open app when notification is tapped
      val intent = Intent(context, MainActivity::class.java).apply {
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        if (data != null) {
          putExtra("notification_id", data.getString("notificationId"))
          putExtra("action", data.getString("action"))
        }
      }
      
      val pendingIntentFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      } else {
        PendingIntent.FLAG_UPDATE_CURRENT
      }
      
      val pendingIntent = PendingIntent.getActivity(
        context,
        0,
        intent,
        pendingIntentFlags
      )

      // Build notification
      val notificationBuilder = NotificationCompat.Builder(context, CHANNEL_ID)
        .setSmallIcon(android.R.drawable.ic_dialog_info)
        .setContentTitle(title)
        .setContentText(message)
        .setStyle(NotificationCompat.BigTextStyle().bigText(message))
        .setPriority(NotificationCompat.PRIORITY_HIGH)
        .setDefaults(Notification.DEFAULT_ALL)
        .setAutoCancel(true)
        .setContentIntent(pendingIntent)
        .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
        .setCategory(NotificationCompat.CATEGORY_MESSAGE)

      // Add action button if data provided
      if (data != null && data.hasKey("action")) {
        val actionIntent = Intent(context, MainActivity::class.java).apply {
          flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
          putExtra("action", data.getString("action"))
        }
        
        val actionPendingIntent = PendingIntent.getActivity(
          context,
          1,
          actionIntent,
          pendingIntentFlags
        )
        
        notificationBuilder.addAction(
          android.R.drawable.ic_menu_view,
          data.getString("actionLabel") ?: "View",
          actionPendingIntent
        )
      }

      // Show notification
      val notification = notificationBuilder.build()
      notificationId++
      notificationManager.notify(notificationId, notification)
      
      promise.resolve(notificationId)
    } catch (e: Exception) {
      promise.reject("NOTIFICATION_ERROR", e.message, e)
    }
  }

  @ReactMethod
  fun cancelNotification(id: Int, promise: Promise) {
    try {
      val context = reactApplicationContext
      val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      notificationManager.cancel(id)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("NOTIFICATION_ERROR", e.message, e)
    }
  }

  @ReactMethod
  fun cancelAllNotifications(promise: Promise) {
    try {
      val context = reactApplicationContext
      val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      notificationManager.cancelAll()
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("NOTIFICATION_ERROR", e.message, e)
    }
  }
}

