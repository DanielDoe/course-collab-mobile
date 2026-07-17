import type { CapacitorConfig } from "@capacitor/cli"

/**
 * Loads the production CourseCollab web app so the native shell
 * matches the mobile responsive layout exactly (same CSS, APIs, auth).
 */
const config: CapacitorConfig = {
  appId: "com.coursecollab.app",
  appName: "CourseCollab",
  webDir: "www",
  server: {
    url: "https://coursecollab.vercel.app",
    cleartext: false,
    androidScheme: "https",
    allowNavigation: [
      "coursecollab.vercel.app",
      "*.vercel.app",
      "course-collab.com",
      "*.course-collab.com",
      "checkout.stripe.com",
      "*.stripe.com",
    ],
  },
  ios: {
    contentInset: "automatic",
    // iPadOS: use mobile viewport (same as phone mobile web)
    preferredContentMode: "mobile",
    scrollEnabled: true,
    backgroundColor: "#582c83",
  },
  android: {
    backgroundColor: "#582c83",
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#582c83",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#582c83",
    },
    Keyboard: {
      resize: "body",
      resizeOnFullScreen: true,
    },
  },
}

export default config
