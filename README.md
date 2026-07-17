# CourseCollab Mobile

Native iOS, Android, and iPadOS app for [CourseCollab](https://coursecollab.vercel.app). The shell loads the production web app so the UI matches the **mobile responsive layout** exactly.

## Architecture

- **Capacitor 7** wraps a WebView pointed at `https://coursecollab.vercel.app`
- Brand colors from the web app (`#582c83` PVAMU purple)
- iPad uses `preferredContentMode: mobile` for the same layout as phone
- Offline fallback: branded splash in `www/`

## Prerequisites

- Node.js 20+
- **iOS:** Xcode 15+, CocoaPods (`sudo gem install cocoapods`)
- **Android:** Android Studio, JDK 17

## Setup

```bash
cd course-collab-mobile
npm install
npm run cap:sync
```

## Run

```bash
# iOS Simulator
npm run cap:open:ios

# Android Emulator
npm run cap:open:android
```

In Xcode/Android Studio, pick a simulator and press Run.

## Local web dev (optional)

To point at a local Next.js server instead of production, edit `capacitor.config.ts`:

```ts
server: {
  url: "http://localhost:3000",
  cleartext: true,
}
```

Use your machine's LAN IP (not `localhost`) when testing on a physical device.

## App Store notes

- Bundle ID: `com.coursecollab.app`
- Icons/splash generated via `npm run build`
- Stripe checkout and external links are allowlisted in Capacitor config

## Related repo

Web app: [v0-coursecollabv3](https://github.com/DanielDoe/v0-coursecollabv3) (local: `~/Downloads/v0-coursecollabv3`)
