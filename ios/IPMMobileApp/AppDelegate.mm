#import "AppDelegate.h"

#import <Firebase.h>
#import <React/RCTBundleURLProvider.h>
#import <React/RCTLinkingManager.h>
#import <GoogleSignIn/GoogleSignIn.h>

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  self.moduleName = @"IPMMobileApp";
  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};

  // Initializes Firebase (Messaging, etc.) using GoogleService-Info.plist.
  // Must run before super's didFinishLaunchingWithOptions so RN's own
  // startup doesn't race with Firebase setup. Note: React Native Firebase
  // registers for remote notifications and bridges the APNs device token
  // to Firebase automatically via method swizzling (enabled by default) —
  // no manual didRegisterForRemoteNotificationsWithDeviceToken: override
  // needed here unless swizzling gets explicitly disabled later via
  // FirebaseAppDelegateProxyEnabled in Info.plist.
  [FIRApp configure];

  return [super application:application didFinishLaunchingWithOptions:launchOptions];
}

// ─── Custom URL scheme handling (ipmhub://) ────────────────────────────────
// Without this, iOS will still bring the app to the foreground when
// ipmhub://... is opened (since the scheme is registered in Info.plist),
// but React Native never finds out — Linking.addEventListener('url', ...)
// and Linking.getInitialURL() in SignInScreen/SignUpScreen would never
// fire, so the LinkedIn "Continue to App" tap would appear to do nothing.
// This forwards the incoming URL into RN's Linking module, same mechanism
// Android gets automatically via the manifest intent-filter + onNewIntent.
- (BOOL)application:(UIApplication *)application
   openURL:(NSURL *)url
   options:(NSDictionary<UIApplicationOpenURLOptionsKey, id> *)options
{
  // Google Sign-In returns to the app through the reversed-client-ID URL
  // scheme registered in Info.plist (com.googleusercontent.apps.…). That URL
  // MUST be handed to the Google SDK, otherwise the sign-in browser sheet
  // never completes and the user is left in the browser instead of being
  // brought back to the app. handleURL returns NO for any URL that isn't a
  // Google Sign-In redirect, so ipmhub:// links fall through to React
  // Native's Linking below exactly as before.
  if ([GIDSignIn.sharedInstance handleURL:url]) {
    return YES;
  }
  return [RCTLinkingManager application:application openURL:url options:options];
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  return [self bundleURL];
}

- (NSURL *)bundleURL
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

@end
