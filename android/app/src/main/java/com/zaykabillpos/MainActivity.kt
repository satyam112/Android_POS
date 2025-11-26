package com.zaykabillpos

import android.os.Bundle
import android.view.View
import android.view.ViewTreeObserver
import android.view.WindowManager
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  private var keyboardLayoutListener: ViewTreeObserver.OnGlobalLayoutListener? = null

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "zaykaBill"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    
    // Use standard React Native window handling
    // Let React Native handle insets by default - don't interfere with custom listener
    WindowCompat.setDecorFitsSystemWindows(window, true)
    
    // Set up listener to detect keyboard show/hide and fix black strip issue
    // This is especially important for MIUI devices (Poco, Xiaomi, etc.)
    val rootView = window.decorView
    val contentView = rootView.findViewById<View>(android.R.id.content)
    val viewTreeObserver = contentView?.viewTreeObserver
    
    keyboardLayoutListener = object : ViewTreeObserver.OnGlobalLayoutListener {
      private var wasKeyboardVisible = false
      
      override fun onGlobalLayout() {
        val insets = ViewCompat.getRootWindowInsets(contentView)
        val imeInsets = insets?.getInsets(WindowInsetsCompat.Type.ime())
        val keyboardHeight = imeInsets?.bottom ?: 0
        val isKeyboardVisible = keyboardHeight > 0
        
        // When keyboard transitions from visible to hidden, fix the black strip
        if (wasKeyboardVisible && !isKeyboardVisible) {
          // The black strip on MIUI devices appears because the window layout isn't fully restored
          // Fix it by forcing window insets update and layout refresh without manipulating padding
          contentView?.post {
            // Force window insets to be recalculated - this tells Android to restore proper layout
            rootView.requestApplyInsets()
            
            // Force layout refresh on all views
            rootView.requestLayout()
            contentView?.requestLayout()
            
            // Force redraw
            rootView.invalidate()
            contentView?.invalidate()
            
            // Multiple delayed passes for MIUI devices that need extra time to restore
            rootView.postDelayed({
              rootView.requestApplyInsets()
              rootView.requestLayout()
              contentView?.requestLayout()
              rootView.invalidate()
            }, 50)
            
            rootView.postDelayed({
              // Ensure window layout params are correct
              val layoutParams = window.attributes
              if (layoutParams.height != WindowManager.LayoutParams.MATCH_PARENT) {
                layoutParams.height = WindowManager.LayoutParams.MATCH_PARENT
                window.attributes = layoutParams
              }
              
              rootView.requestLayout()
              contentView?.requestLayout()
              rootView.invalidate()
              contentView?.invalidate()
            }, 150)
            
            rootView.postDelayed({
              // Final pass to ensure everything is restored
              rootView.requestApplyInsets()
              rootView.requestLayout()
              contentView?.requestLayout()
            }, 300)
          }
        }
        
        wasKeyboardVisible = isKeyboardVisible
      }
    }
    
    keyboardLayoutListener?.let { listener ->
      viewTreeObserver?.addOnGlobalLayoutListener(listener)
    }
  }

  override fun onDestroy() {
    super.onDestroy()
    // Clean up the listener to prevent memory leaks
    val rootView = window.decorView.findViewById<View>(android.R.id.content)
    keyboardLayoutListener?.let { listener ->
      rootView?.viewTreeObserver?.removeOnGlobalLayoutListener(listener)
    }
    keyboardLayoutListener = null
  }
}
