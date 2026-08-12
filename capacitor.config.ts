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
    backgroundColor: "#ffffff",
  },
  android: {
    backgroundColor: "#ffffff",
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#ffffff",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#ffffff",
    },
    Keyboard: {
      resize: "body",
      resizeOnFullScreen: true,
    },
  },
}

export default config
