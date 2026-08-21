package com.ipmmobileapp

import android.content.Intent
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "IPMMobileApp"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  /**
   * THE FIX (2026-08-18): MainActivity is launchMode="singleTask" in the
   * manifest, and every deep link this app relies on — the LinkedIn OAuth
   * return (ipmhub://linkedin-callback), password reset
   * (ipmhub://reset-password), and email verification
   * (https://hub.instituteprojectmanagement.com/...) — arrives while
   * MainActivity is already running in the background (it was merely
   * backgrounded when the Chrome Custom Tab / browser opened over it, never
   * destroyed). With singleTask, Android does NOT recreate the Activity for
   * that case — it calls onNewIntent() on the existing instance instead of
   * onCreate(). Without overriding onNewIntent() and calling setIntent(),
   * the new Intent (carrying the deep link URL) never reaches React
   * Native's Linking module: Linking.getInitialURL() still returns the
   * activity's original launch intent, and no 'url' event ever fires. That
   * silently strands the JS-side listener in handleLinkedIn()
   * (SignUpScreen.tsx / SignInScreen.tsx) — the browser goes away, but the
   * app never registers that a redirect happened, which is exactly the
   * "signs up on LinkedIn, doesn't revert back" symptom. setIntent(intent)
   * is what makes the updated intent visible to Linking.getInitialURL()
   * and, more importantly, is required for RN's internal intent forwarding
   * to fire the 'url' event to any active addEventListener('url', ...)
   * listeners.
   */
  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
  }
}
